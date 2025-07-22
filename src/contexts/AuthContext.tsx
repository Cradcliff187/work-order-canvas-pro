
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Define the profile type based on the database schema
interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
  company_name?: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hourly_billable_rate?: number;
  hourly_cost_rate?: number;
  is_employee: boolean;
}

interface UserOrganization {
  id: string;
  name: string;
  organization_type: 'internal' | 'partner' | 'subcontractor';
  contact_email: string;
  contact_phone?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userOrganization: UserOrganization | null;
  loading: boolean;
  isImpersonating: boolean;
  impersonatedProfile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  forgotPassword: (email: string) => Promise<{ error: any }>;
  resetPassword: (password: string) => Promise<{ error: any }>;
  isRecoverySession: () => boolean;
  setRecoveryFlow: (flow: string) => void;
  setImpersonation: (targetUserId: string) => Promise<void>;
  clearImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userOrganization, setUserOrganization] = useState<UserOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedProfile, setImpersonatedProfile] = useState<UserProfile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
  const [recoveryFlow, setRecoveryFlow] = useState<string>('');
  const { toast } = useToast();

  // Fetch user profile from database
  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      // Fetch user organization
      const { data: userOrgData, error: userOrgError } = await supabase
        .from('user_organizations')
        .select(`
          organizations!inner(
            id,
            name,
            organization_type,
            contact_email,
            contact_phone,
            is_active
          )
        `)
        .eq('user_id', profileData.id)
        .single();

      if (!userOrgError && userOrgData) {
        setUserOrganization(userOrgData.organizations as UserOrganization);
      }

      return profileData as UserProfile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        } else {
          setProfile(null);
          setUserOrganization(null);
          setIsImpersonating(false);
          setImpersonatedProfile(null);
          setOriginalProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userProfile = await fetchProfile(session.user.id);
        setProfile(userProfile);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign in function
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

  // Sign up function
  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Sign out function
  const signOut = async () => {
    // Clear impersonation state
    setIsImpersonating(false);
    setImpersonatedProfile(null);
    setOriginalProfile(null);
    
    await supabase.auth.signOut();
  };

  // Update profile function
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No user logged in') };
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Update local state
      if (profile) {
        const updatedProfile = { ...profile, ...updates };
        setProfile(updatedProfile);
        
        // Update impersonated profile if impersonating
        if (isImpersonating && impersonatedProfile) {
          setImpersonatedProfile(updatedProfile);
        }
      }
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // Forgot password function (using custom edge function)
  const forgotPassword = async (email: string) => {
    try {
      console.log('🔑 Initiating password reset for:', email);
      
      const { data, error } = await supabase.functions.invoke('password-reset-email', {
        body: { email }
      });
      
      if (error) {
        console.error('❌ Password reset error:', error);
        return { error };
      }
      
      console.log('✅ Password reset initiated successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Password reset failed:', error);
      return { error };
    }
  };

  // Reset password function
  const resetPassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Check if in recovery session
  const isRecoverySession = () => {
    return recoveryFlow === 'recovery' || window.location.hash.includes('type=recovery');
  };

  // Set impersonation
  const setImpersonation = async (targetUserId: string) => {
    if (!profile || profile.user_type !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Only administrators can impersonate users',
        variant: 'destructive',
      });
      return;
    }

    try {
      const targetProfile = await fetchProfile(targetUserId);
      if (!targetProfile) {
        toast({
          title: 'Error',
          description: 'Target user profile not found',
          variant: 'destructive',
        });
        return;
      }

      // Store original profile if not already impersonating
      if (!isImpersonating) {
        setOriginalProfile(profile);
      }

      setIsImpersonating(true);
      setImpersonatedProfile(targetProfile);
      
      toast({
        title: 'Impersonation Started',
        description: `Now viewing as ${targetProfile.first_name} ${targetProfile.last_name}`,
      });
    } catch (error) {
      toast({
        title: 'Impersonation Failed',
        description: 'Failed to start impersonation',
        variant: 'destructive',
      });
    }
  };

  // Clear impersonation
  const clearImpersonation = () => {
    if (originalProfile) {
      setProfile(originalProfile);
      setOriginalProfile(null);
    }
    setIsImpersonating(false);
    setImpersonatedProfile(null);
    
    toast({
      title: 'Impersonation Ended',
      description: 'Returned to your original account',
    });
  };

  const value = {
    user,
    session,
    profile: isImpersonating ? impersonatedProfile : profile,
    userOrganization,
    loading,
    isImpersonating,
    impersonatedProfile,
    signIn,
    signUp,
    signOut,
    updateProfile,
    forgotPassword,
    resetPassword,
    isRecoverySession,
    setRecoveryFlow,
    setImpersonation,
    clearImpersonation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
