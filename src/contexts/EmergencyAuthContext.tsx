import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { OrganizationMember } from '@/types/auth.types';

// Phase 4: Emergency Auth Context - Fallback when session context fails
// This provides a working authentication system using emergency database functions

interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  is_active?: boolean;
  is_employee?: boolean;
  hourly_cost_rate?: number;
  hourly_billable_rate?: number;
  created_at?: string;
  updated_at?: string;
}

interface EmergencyAuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userOrganizations: OrganizationMember[];
  loading: boolean;
  sessionContextWorking: boolean;
  usingEmergencyAuth: boolean;
  debugInfo: any;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const EmergencyAuthContext = createContext<EmergencyAuthContextType | undefined>(undefined);

export const useEmergencyAuthContext = () => {
  const context = useContext(EmergencyAuthContext);
  if (context === undefined) {
    throw new Error('useEmergencyAuthContext must be used within an EmergencyAuthProvider');
  }
  return context;
};

export const EmergencyAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionContextWorking, setSessionContextWorking] = useState(true);
  const [usingEmergencyAuth, setUsingEmergencyAuth] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const navigate = useNavigate();

  const checkSessionContext = async (): Promise<boolean> => {
    try {
      const { data: debugData, error } = await supabase.rpc('debug_session_context');
      
      if (error) {
        console.error('🔧 Emergency Auth: Debug check failed:', error);
        return false;
      }
      
      setDebugInfo(debugData);
      const debugResponse = debugData as any;
      const contextWorking = debugResponse?.session_propagation?.context_available || false;
      
      console.log('🔍 Emergency Auth: Session context check:', {
        contextWorking,
        authUid: debugResponse?.auth_functions?.auth_uid,
        jwtExists: debugResponse?.jwt_analysis?.jwt_exists
      });
      
      return contextWorking;
    } catch (error) {
      console.error('🔧 Emergency Auth: Session context check error:', error);
      return false;
    }
  };

  const loadEmergencyProfile = async (): Promise<void> => {
    try {
      console.log('🆘 Emergency Auth: Loading profile via emergency functions...');
      
      const { data: profileData, error: profileError } = await supabase.rpc('get_admin_profile_emergency');
      
      if (profileError) {
        console.error('❌ Emergency Auth: Profile load failed:', profileError);
        return;
      }
      
      const { data: orgData, error: orgError } = await supabase.rpc('get_admin_organizations_emergency');
      
      if (orgError) {
        console.error('❌ Emergency Auth: Organization load failed:', orgError);
        return;
      }
      
      const profileResponse = profileData as any;
      const orgResponse = orgData as any;
      
      if (profileResponse?.success && profileResponse?.profile) {
        setProfile(profileResponse.profile);
        setUserOrganizations(orgResponse?.memberships || []);
        setUsingEmergencyAuth(true);
        
        console.log('✅ Emergency Auth: Successfully loaded via emergency functions', {
          profile: profileResponse.profile,
          organizationCount: orgResponse?.membership_count || 0
        });
      }
    } catch (error) {
      console.error('💥 Emergency Auth: Emergency profile load error:', error);
    }
  };

  const normalProfileLoad = async (userId: string): Promise<void> => {
    try {
      console.log('👤 Normal Auth: Loading profile normally...');
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Normal Auth: Profile load failed:', profileError);
        return;
      }

      if (profileData) {
        setProfile(profileData);
        
        // Try to load organizations normally
        const { data: orgsData, error: orgsError } = await supabase
          .from('organization_members')
          .select(`
            id,
            user_id,
            organization_id,
            role,
            created_at,
            organizations (
              id,
              name,
              organization_type,
              initials,
              contact_email,
              contact_phone,
              address,
              uses_partner_location_numbers,
              is_active
            )
          `)
          .eq('user_id', profileData.id);

        if (orgsError) {
          console.error('❌ Normal Auth: Organizations load failed:', orgsError);
        } else {
          const memberships: OrganizationMember[] = orgsData?.map((item: any) => ({
            id: item.id,
            user_id: item.user_id,
            organization_id: item.organization_id,
            role: item.role,
            created_at: item.created_at,
            organization: item.organizations ? {
              id: item.organizations.id,
              name: item.organizations.name,
              organization_type: item.organizations.organization_type,
              initials: item.organizations.initials || '',
              contact_email: item.organizations.contact_email,
              contact_phone: item.organizations.contact_phone || '',
              address: item.organizations.address || '',
              uses_partner_location_numbers: item.organizations.uses_partner_location_numbers || false,
              is_active: item.organizations.is_active
            } : undefined
          })).filter(m => m.organization) || [];
          
          setUserOrganizations(memberships);
          console.log('✅ Normal Auth: Successfully loaded normally', {
            profile: profileData,
            organizationCount: memberships.length
          });
        }
      }
    } catch (error) {
      console.error('💥 Normal Auth: Normal profile load error:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('🚀 Emergency Auth: Initializing...');
      
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;

          console.log('🔐 Emergency Auth: Auth state change:', {
            event,
            hasSession: !!session,
            hasUser: !!session?.user
          });

          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Check if session context is working
            const contextWorking = await checkSessionContext();
            setSessionContextWorking(contextWorking);
            
            if (contextWorking) {
              // Use normal authentication flow
              await normalProfileLoad(session.user.id);
              setUsingEmergencyAuth(false);
            } else {
              // Use emergency authentication flow
              console.log('⚠️ Emergency Auth: Session context failed, using emergency flow');
              await loadEmergencyProfile();
            }
          } else {
            setProfile(null);
            setUserOrganizations([]);
            setUsingEmergencyAuth(false);
          }
          
          setLoading(false);
        }
      );

      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        
        const contextWorking = await checkSessionContext();
        setSessionContextWorking(contextWorking);
        
        if (contextWorking) {
          await normalProfileLoad(session.user.id);
          setUsingEmergencyAuth(false);
        } else {
          console.log('⚠️ Emergency Auth: Initial session context failed, using emergency flow');
          await loadEmergencyProfile();
        }
      }
      
      setLoading(false);

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    };

    initializeAuth();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUserOrganizations([]);
    setUsingEmergencyAuth(false);
    navigate('/auth');
  };

  const refreshProfile = async () => {
    if (session?.user) {
      const contextWorking = await checkSessionContext();
      setSessionContextWorking(contextWorking);
      
      if (contextWorking) {
        await normalProfileLoad(session.user.id);
        setUsingEmergencyAuth(false);
      } else {
        await loadEmergencyProfile();
      }
    }
  };

  return (
    <EmergencyAuthContext.Provider
      value={{
        user,
        session,
        profile,
        userOrganizations,
        loading,
        sessionContextWorking,
        usingEmergencyAuth,
        debugInfo,
        signOut,
        refreshProfile
      }}
    >
      {children}
    </EmergencyAuthContext.Provider>
  );
};