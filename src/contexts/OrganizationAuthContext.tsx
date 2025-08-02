import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

  // Get primary organization (first internal org for admin/employee, or first org for others)
  const userOrganization = userOrganizations.length > 0 
    ? userOrganizations.find(org => org.organization?.organization_type === 'internal') || userOrganizations[0]
    : null;

  const fetchProfile = async (userId: string) => {
    try {
      // Fetch profile first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (profileError) {
        setAuthError(`Authentication failed: ${profileError.message}`);
        setProfile(null);
        setUserOrganizations([]);
        setLoading(false);
        return;
      }

      if (!profileData) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            email: user?.email || '',
            first_name: user?.user_metadata?.first_name || '',
            last_name: user?.user_metadata?.last_name || '',
            is_active: true,
            is_employee: false
          })
          .select()
          .single();
        
        if (createError) {
          setAuthError(`Profile creation failed: ${createError.message}`);
          setProfile(null);
          setUserOrganizations([]);
          setLoading(false);
          return;
        }
        
        setProfile(newProfile);
        setUserOrganizations([]);
        setAuthError(null);
        setLoading(false);
        return;
      }

      // Now fetch organization memberships separately
      const { data: orgData, error: orgError } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          organization_id,
          role,
          created_at,
          organization:organizations (*)
        `)
        .eq('user_id', profileData.id);
      
      if (orgError) {
        setAuthError(`Organization fetch failed: ${orgError.message}`);
        setProfile(null);
        setUserOrganizations([]);
        setLoading(false);
        return;
      }

      // Update all state at once
      setProfile(profileData);
      setUserOrganizations(orgData || []);
      setAuthError(orgData?.length === 0 
        ? 'No organization access found. Please contact your administrator.' 
        : null);
      setLoading(false);
      
    } catch (error) {
      setAuthError('Authentication system error. Please try again.');
      setProfile(null);
      setUserOrganizations([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.id);
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setUserOrganizations([]);
          setLoading(false);
        }
      }
    );

    // Get initial session with error handling
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) setLoading(false);
          return;
        }
        
        if (session?.user && mounted) {
          setSession(session);
          setUser(session.user);
          setAuthError(null);
          await fetchProfile(session.user.id);
        } else {
          if (mounted) setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthError('Failed to initialize authentication');
        if (mounted) setLoading(false);
      }
    };

    // Add timeout protection - extended to 20s for better reliability
    const timeoutId = setTimeout(() => {
      if (loading && mounted) {
        console.warn('Auth loading timeout after 20s - completing with current state');
        setLoading(false);
        // Don't set error state - just complete loading
      }
    }, 20000); // 20 second timeout for full auth flow

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
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

  const value: OrganizationAuthContextType = {
    user,
    session,
    profile,
    userOrganizations,
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
  };

  return (
    <OrganizationAuthContext.Provider value={value}>
      {children}
    </OrganizationAuthContext.Provider>
  );
};