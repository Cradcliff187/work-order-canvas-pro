import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
  company_name?: string;
  phone?: string;
  avatar_url?: string;
  is_active?: boolean;
  is_employee?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  impersonatedProfile: Profile | null;
  setImpersonation: (profile: Profile | null) => void;
  clearImpersonation: () => void;
  isImpersonating: boolean;
  forgotPassword: (email: string) => Promise<{ error: any }>;
  resetPassword: (password: string) => Promise<{ error: any }>;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();

  // Load impersonation from sessionStorage on mount
  useEffect(() => {
    const storedImpersonation = sessionStorage.getItem('impersonatedProfile');
    if (storedImpersonation) {
      try {
        setImpersonatedProfile(JSON.parse(storedImpersonation));
      } catch (error) {
        console.error('Error parsing stored impersonation:', error);
        sessionStorage.removeItem('impersonatedProfile');
      }
    }
  }, []);

  const fetchProfile = async (userId: string, retryCount = 0): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (!data && retryCount < 3) {
        // Profile might not be created yet, retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 100; // 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchProfile(userId, retryCount + 1);
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile data asynchronously
          fetchProfile(session.user.id).then((profileData) => {
            if (!mounted) return;
            
            setProfile(profileData);
            
            // Redirect on sign-in events from auth page or root page (but not reset password page)
            if (event === 'SIGNED_IN' && profileData?.user_type && 
                window.location.pathname !== '/reset-password' &&
                (window.location.pathname === '/' || window.location.pathname === '/auth')) {
              const redirectPaths = {
                'admin': '/admin/dashboard',
                'employee': '/admin/employee-dashboard',
                'partner': '/partner/dashboard',
                'subcontractor': '/subcontractor/dashboard'
              };
              const redirectPath = redirectPaths[profileData.user_type];
              if (redirectPath) {
                setTimeout(() => navigate(redirectPath, { replace: true }), 0);
              }
            }
            
            setLoading(false);
          });
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then((profileData) => {
          if (!mounted) return;
          setProfile(profileData);
          setLoading(false);
          setInitializing(false);
        });
      } else {
        setLoading(false);
        setInitializing(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
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
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    // Clear impersonation on logout
    clearImpersonation();
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  const setImpersonation = (profile: Profile | null) => {
    setImpersonatedProfile(profile);
    if (profile) {
      sessionStorage.setItem('impersonatedProfile', JSON.stringify(profile));
    } else {
      sessionStorage.removeItem('impersonatedProfile');
    }
  };

  const clearImpersonation = () => {
    setImpersonatedProfile(null);
    sessionStorage.removeItem('impersonatedProfile');
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user logged in' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }

    return { error };
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  };

  const forgotPassword = async (email: string) => {
    // Use the full qualified URL to ensure Supabase can properly append query parameters
    const redirectUrl = `${window.location.protocol}//${window.location.host}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    
    return { error };
  };

  const resetPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    
    return { error };
  };

  const value = {
    user,
    session,
    profile: impersonatedProfile || profile, // Return impersonated profile if active
    loading: loading || initializing,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    impersonatedProfile,
    setImpersonation,
    clearImpersonation,
    isImpersonating: !!impersonatedProfile,
    forgotPassword,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};