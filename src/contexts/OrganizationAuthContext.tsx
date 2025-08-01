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
  const fetchingRef = useRef<string | null>(null);

  // Get primary organization (first internal org for admin/employee, or first org for others)
  const userOrganization = userOrganizations.length > 0 
    ? userOrganizations.find(org => org.organization?.organization_type === 'internal') || userOrganizations[0]
    : null;

  const fetchProfile = async (userId: string) => {
    console.log('🔍 === PROFILE FETCH DEBUG ===');
    console.log('📍 Step 1: Starting fetchProfile for userId:', userId);
    const startTime = Date.now();
    
    // Prevent duplicate fetches
    if (fetchingRef.current === userId) {
      console.log('⏭️ Fetch already in progress for user:', userId);
      return;
    }
    fetchingRef.current = userId;
    
    try {
      // Add timeout wrapper for the profile query
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle missing records
      
      // Set a 10 second timeout for the query (increased for cold starts)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout')), 10000)
      );
      
      const result = await Promise.race([
        profilePromise,
        timeoutPromise
      ]).catch(error => ({ data: null, error }));
      
      const { data: profileData, error: profileError } = result as { data: any; error: any };
      
      console.log('✅ Profile query completed:', { profileData, profileError });
      
      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        
        // If profile doesn't exist, try to create one
        if (profileError.message?.includes('Row not found') || profileError.code === 'PGRST116') {
          console.log('📍 Creating new profile for user...');
          
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
            console.error('❌ Profile creation failed:', createError);
            setProfile(null);
            setUserOrganizations([]);
            return;
          }
          
          setProfile(newProfile);
        } else {
          // Other errors - just log and continue
          setProfile(null);
          setUserOrganizations([]);
          return;
        }
      } else if (!profileData) {
        console.log('⚠️ No profile found - creating one...');
        
        // Create profile if missing
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
          console.error('❌ Profile creation failed:', createError);
          setProfile(null);
          setUserOrganizations([]);
          return;
        }
        
        setProfile(newProfile);
      } else {
        setProfile(profileData);
      }
      
      // Continue with organization fetch...
      const currentProfile = profileData || profile;
      let orgData: any[] = [];
      
      if (currentProfile) {
        console.log('📍 Step 2: Fetching organization memberships for profile:', currentProfile.id);
        
        const { data: fetchedOrgData, error: orgError } = await supabase
          .from('organization_members')
          .select(`
            id,
            user_id,
            organization_id,
            role,
            created_at,
            organization:organizations (*)
          `)
          .eq('user_id', currentProfile.id);
        
        console.log('📍 Step 3: Organization query result:', {
          success: !orgError,
          error: orgError,
          dataCount: fetchedOrgData?.length || 0,
          data: fetchedOrgData
        });
        
        if (orgError) {
          console.error('❌ Failed to fetch organization memberships:', orgError);
          setUserOrganizations([]);
        } else {
          orgData = fetchedOrgData || [];
          setUserOrganizations(orgData);
          console.log('✅ Organization memberships loaded:', orgData.length, 'organizations');
        }
      } else {
        console.log('⚠️ No profile available for organization fetch');
        setUserOrganizations([]);
      }
      
      console.log('📊 Profile fetch complete:', {
        profileLoaded: !!currentProfile,
        organizationsLoaded: orgData.length,
        timeTaken: `${Date.now() - startTime}ms`
      });
      
    } catch (error) {
      console.error('❌ Fatal error in fetchProfile:', error);
      setProfile(null);
      setUserOrganizations([]);
    } finally {
      fetchingRef.current = null;
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
          await fetchProfile(session.user.id);
        } else {
          if (mounted) setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) setLoading(false);
      }
    };

    // Add timeout protection
    const timeoutId = setTimeout(() => {
      if (loading && mounted) {
        console.error('Auth loading timeout - forcing completion');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

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