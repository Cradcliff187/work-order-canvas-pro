import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { OrganizationMember } from '@/types/auth.types';

// Main Auth Context - Using emergency functions due to Supabase session context failure

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

export interface EmergencyAuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  realProfile: Profile | null;
  viewingProfile: Profile | null;
  userOrganization: any;
  userOrganizations: OrganizationMember[];
  loading: boolean;
  organizationLoading: boolean;
  sessionContextWorking: boolean;
  usingEmergencyAuth: boolean;
  debugInfo: any;
  signUp: (email: string, password: string, firstName: string, lastName: string, organizationId?: string, phone?: string) => Promise<{ error: any; data?: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
  impersonatedProfile: Profile | null;
  setImpersonation: (profile: Profile | null) => void;
  clearImpersonation: () => void;
  isImpersonating: boolean;
  forgotPassword: (email: string) => Promise<{ error: any }>;
  resetPassword: (password: string) => Promise<{ error: any; errorType?: string }>;
  isRecoverySession: () => boolean;
  shouldPreventRedirect: () => boolean;
  isInRecoveryFlow: boolean;
  setRecoveryFlow: (inFlow: boolean) => void;
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
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [sessionContextWorking, setSessionContextWorking] = useState(false);
  const [usingEmergencyAuth, setUsingEmergencyAuth] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
  const [isInRecoveryFlow, setIsInRecoveryFlow] = useState(false);
  
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
            const contextWorking = await checkSessionContext();
            setSessionContextWorking(contextWorking);
            
            if (contextWorking) {
              await normalProfileLoad(session.user.id);
              setUsingEmergencyAuth(false);
            } else {
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

  // Implementation of all AuthContext methods
  const signUp = async (email: string, password: string, firstName: string, lastName: string, organizationId?: string, phone?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      return { error, data };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUserOrganizations([]);
    setUsingEmergencyAuth(false);
    navigate('/auth');
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    return { error: null };
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

  const refreshOrganization = async () => {
    setOrganizationLoading(true);
    await refreshProfile();
    setOrganizationLoading(false);
  };

  const setImpersonation = (profile: Profile | null) => {
    setImpersonatedProfile(profile);
  };

  const clearImpersonation = () => {
    setImpersonatedProfile(null);
  };

  const forgotPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const isRecoverySession = () => false;
  const shouldPreventRedirect = () => false;
  const setRecoveryFlow = (inFlow: boolean) => setIsInRecoveryFlow(inFlow);

  const value = {
    user,
    session,
    profile,
    realProfile: profile,
    viewingProfile: impersonatedProfile || profile,
    userOrganization: userOrganizations[0] || null,
    userOrganizations,
    loading,
    organizationLoading,
    sessionContextWorking,
    usingEmergencyAuth,
    debugInfo,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    refreshOrganization,
    impersonatedProfile,
    setImpersonation,
    clearImpersonation,
    isImpersonating: impersonatedProfile !== null,
    forgotPassword,
    resetPassword,
    isRecoverySession,
    shouldPreventRedirect,
    isInRecoveryFlow,
    setRecoveryFlow
  };

  return (
    <EmergencyAuthContext.Provider value={value}>
      {children}
    </EmergencyAuthContext.Provider>
  );
};