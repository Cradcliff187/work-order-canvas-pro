import React, { createContext, useContext, useEffect, useState } from 'react';
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

  // Get primary organization (first internal org for admin/employee, or first org for others)
  const userOrganization = userOrganizations.length > 0 
    ? userOrganizations.find(org => org.organization?.organization_type === 'internal') || userOrganizations[0]
    : null;

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      setProfile(profileData);

      // Fetch organization memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_members')
        .select(`
          id,
          role,
          created_at,
          user_id,
          organization_id,
          organization:organizations(
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

      if (membershipError) {
        console.error('Error fetching organization memberships:', membershipError);
        return;
      }

      setUserOrganizations(membershipData || []);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setUserOrganizations([]);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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

  const value: OrganizationAuthContextType = {
    user,
    session,
    profile,
    userOrganizations,
    userOrganization,
    loading,
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