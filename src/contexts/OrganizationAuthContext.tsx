import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { OrganizationMember } from '@/types/auth.types';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  is_employee: boolean;
  hourly_cost_rate?: number;
  hourly_billable_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationAuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userOrganizations: OrganizationMember[];
  userOrganization: OrganizationMember | null;
  loading: boolean;
  authError: string | null;
  retryAuth: () => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any; data?: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ error: any }>;
  resetPassword: (password: string) => Promise<{ error: any }>;
}

const OrganizationAuthContext = createContext<OrganizationAuthContextType | undefined>(undefined);

export const useOrganizationAuth = () => {
  const context = useContext(OrganizationAuthContext);
  if (context === undefined) {
    throw new Error('useOrganizationAuth must be used within an OrganizationAuthProvider');
  }
  return context;
};

export const OrganizationAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Ref to prevent duplicate profile fetching
  const fetchingProfileRef = useRef<string | null>(null);

  // Memoize userOrganizations to prevent unnecessary re-renders
  const memoizedUserOrganizations = useMemo(() => userOrganizations, [userOrganizations]);

  // Get primary organization (first internal org for admin/employee, or first org for others) - memoized
  const userOrganization = useMemo(() => {
    return memoizedUserOrganizations.length > 0 
      ? memoizedUserOrganizations.find(org => org.organization?.organization_type === 'internal') || memoizedUserOrganizations[0]
      : null;
  }, [memoizedUserOrganizations]);

  const fetchProfile = useCallback(async (userId: string) => {
    if (fetchingProfileRef.current === userId) {
      return;
    }
    
    fetchingProfileRef.current = userId;
    
    try {
      // Ensure session exists before making queries
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        console.warn('No active session found during profile fetch');
        setAuthError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw profileError;
      }

      if (!profileData) {
        const { data: newProfileArray, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            email: user?.email || '',
            first_name: user?.user_metadata?.first_name || '',
            last_name: user?.user_metadata?.last_name || '',
            is_active: true,
            is_employee: false
          })
          .select();

        if (createError) throw createError;
        if (!newProfileArray?.[0]) throw new Error('Failed to create profile');
        const newProfile = newProfileArray[0];
        setProfile(newProfile);
        setUserOrganizations([]);
        setAuthError(null);
        return;
      }

      setProfile(profileData);

      // Resilient organization members query with proper error handling
      try {
        const { data: membersData, error: membersError } = await supabase
          .from('organization_members')
          .select('id, user_id, organization_id, role, created_at')
          .eq('user_id', profileData.id);

        if (membersError) {
          // Handle 406 errors specifically - often caused by RLS policy timing
          if (membersError.message?.includes('406') || membersError.code === 'PGRST301') {
            console.warn('406 error fetching organization members, retrying with delay...', membersError);
            // Wait a bit for auth context to fully establish
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Retry the query once
            const { data: retryMembersData, error: retryMembersError } = await supabase
              .from('organization_members')
              .select('id, user_id, organization_id, role, created_at')
              .eq('user_id', profileData.id);
            
            if (retryMembersError) {
              console.error('Retry failed for organization members:', retryMembersError);
              // Don't throw, just set empty organizations and continue
              setUserOrganizations([]);
              setAuthError('Unable to load organization data. Some features may be limited.');
              return;
            }
            
            // Use retry data
            await processOrganizationMembers(retryMembersData || [], profileData.id);
            return;
          }
          
          throw membersError;
        }

        await processOrganizationMembers(membersData || [], profileData.id);
        
      } catch (orgError) {
        console.error('Organization members query error:', orgError);
        // Don't fail the entire auth process - just set empty organizations
        setUserOrganizations([]);
        setAuthError('Unable to load organization data. Some features may be limited.');
      }
      
    } catch (error) {
      console.error('Profile fetch error:', error);
      setAuthError('Authentication error. Please try again.');
      setProfile(null);
      setUserOrganizations([]);
    } finally {
      fetchingProfileRef.current = null;
      setLoading(false);
    }
  }, [user]);

  // Helper function to process organization members data
  const processOrganizationMembers = async (membersData: any[], profileId: string) => {
    if (!membersData || membersData.length === 0) {
      console.warn('No organization memberships found for profile:', profileId);
      setUserOrganizations([]);
      // Don't set this as an error - user might not have organizations yet
      return;
    }

    const orgIds = membersData.map(m => m.organization_id);
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds);

    if (orgsError) {
      console.error('Organizations fetch error:', orgsError);
      throw orgsError;
    }

    const combinedOrgs = membersData.map(member => ({
      ...member,
      organization: orgsData?.find(org => org.id === member.organization_id) || null
    })).filter(org => org.organization !== null);

    setUserOrganizations(combinedOrgs);
    setAuthError(null);
  };

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener - this will handle both initial session and changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.id);
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Don't await here to prevent blocking the auth state callback
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setUserOrganizations([]);
          setAuthError(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserOrganizations([]);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) {
      return { error: new Error('No authenticated user') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (!error) {
        setProfile({ ...profile, ...updates });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const retryAuth = async () => {
    if (user) {
      setLoading(true);
      setAuthError(null);
      await fetchProfile(user.id);
    }
  };

  const value: OrganizationAuthContextType = useMemo(() => ({
    user,
    session,
    profile,
    userOrganizations: memoizedUserOrganizations,
    userOrganization,
    loading,
    authError,
    retryAuth,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    forgotPassword,
    resetPassword,
  }), [
    user,
    session,
    profile,
    memoizedUserOrganizations,
    userOrganization,
    loading,
    authError,
    retryAuth,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    forgotPassword,
    resetPassword,
  ]);

  return (
    <OrganizationAuthContext.Provider value={value}>
      {children}
    </OrganizationAuthContext.Provider>
  );
};