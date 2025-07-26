import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getUserSingleOrganization } from '@/lib/utils/organizationValidation';
import { hasJWTMetadata, syncUserMetadataToJWT, onProfileUpdate, onOrganizationChange } from '@/lib/auth/jwtSync';
import type { UserOrganization } from '@/hooks/useUserOrganization';

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
  realProfile: Profile | null;
  viewingProfile: Profile | null;
  userOrganization: UserOrganization | null;
  loading: boolean;
  organizationLoading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string, userType?: 'admin' | 'partner' | 'subcontractor' | 'employee', phone?: string, companyName?: string) => Promise<{ error: any; data?: any }>;
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
  const [userOrganization, setUserOrganization] = useState<UserOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
  const [isInRecoveryFlow, setIsInRecoveryFlow] = useState(false);
  const navigate = useNavigate();

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

  const fetchUserOrganization = async (userId: string): Promise<UserOrganization | null> => {
    try {
      const organization = await getUserSingleOrganization(userId);
      return organization;
    } catch (error) {
      console.error('Error fetching user organization:', error);
      return null;
    }
  };

  const checkAndFixSubcontractorOrganization = async (profileId: string) => {
    try {
      // Check if subcontractor has organization
      const { data: orgCheck } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', profileId)
        .maybeSingle();
      
      if (!orgCheck) {
        // Try to fix from work order assignments
        const { data: assignment } = await supabase
          .from('work_order_assignments')
          .select('assigned_organization_id')
          .eq('assigned_to', profileId)
          .not('assigned_organization_id', 'is', null)
          .limit(1)
          .maybeSingle();
        
        if (assignment?.assigned_organization_id) {
          await supabase
            .from('user_organizations')
            .insert({
              user_id: profileId,
              organization_id: assignment.assigned_organization_id
            });
          console.log('Auto-fixed subcontractor organization');
        }
      }
    } catch (error) {
      console.error('Organization check error:', error);
    }
  };

  const isRecoverySession = (): boolean => {
    if (!session?.user) return false;
    
    // Check if session is not expired
    const isSessionValid = session.expires_at && 
      new Date(session.expires_at * 1000) > new Date();
    
    if (!isSessionValid) return false;
    
    // Check for recovery session indicators
    const isAuthenticatedUser = session.user.aud === 'authenticated';
    const isEmailProvider = session.user.app_metadata?.provider === 'email';
    const isConfirmedUser = session.user.email_confirmed_at !== null;
    
    return isAuthenticatedUser && isEmailProvider && isConfirmedUser;
  };

  const shouldPreventRedirect = (): boolean => {
    const isOnResetPassword = window.location.pathname === '/reset-password';
    const isInRecovery = isInRecoveryFlow;
    const hasRecoverySession = isRecoverySession();
    
    return isOnResetPassword || isInRecovery || hasRecoverySession;
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          
          // Fetch profile data asynchronously
          fetchProfile(session.user.id).then(async (profileData) => {
            if (!mounted) return;
            
            setProfile(profileData);
            
            // Fetch organization data if user has a profile
            if (profileData) {
              setOrganizationLoading(true);
              
              // Auto-fix subcontractor organizations if needed
              if (profileData.user_type === 'subcontractor') {
                await checkAndFixSubcontractorOrganization(profileData.id);
              }
              
              const organizationData = await fetchUserOrganization(session.user.id);
              if (mounted) {
                setUserOrganization(organizationData);
                setOrganizationLoading(false);
              }
            }
            
            // Prevent redirects during password reset flow using the new method
            const preventRedirect = shouldPreventRedirect();
            const shouldRedirect = event === 'SIGNED_IN' && 
                                  profileData?.user_type && 
                                  !preventRedirect &&
                                  (window.location.pathname === '/' || window.location.pathname === '/auth');
            
            console.log('Auth state change:', {
              event,
              pathname: window.location.pathname,
              userType: profileData?.user_type,
              preventRedirect,
              shouldRedirect
            });
            
            if (shouldRedirect) {
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
          setUserOrganization(null);
          setOrganizationLoading(false);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        
        fetchProfile(session.user.id).then(async (profileData) => {
          if (!mounted) return;
          setProfile(profileData);
          
          // Fetch organization data if user has a profile
          if (profileData) {
            setOrganizationLoading(true);
            
            // Auto-fix subcontractor organizations if needed
            if (profileData.user_type === 'subcontractor') {
              await checkAndFixSubcontractorOrganization(profileData.id);
            }
            
            const organizationData = await fetchUserOrganization(session.user.id);
            if (mounted) {
              setUserOrganization(organizationData);
              setOrganizationLoading(false);
            }
          }
          
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
  }, []);

  // Auto-clear impersonation after 30 minutes
  useEffect(() => {
    if (impersonatedProfile) {
      const timer = setTimeout(() => {
        setImpersonatedProfile(null);
      }, 1800000); // 30 minutes in milliseconds
      return () => clearTimeout(timer);
    }
  }, [impersonatedProfile]);

  const signUp = async (email: string, password: string, firstName: string, lastName: string, userType: 'admin' | 'partner' | 'subcontractor' | 'employee' = 'subcontractor', phone?: string, companyName?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('sign-up-user', {
        body: {
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
          phone,
          company_name: companyName
        }
      });

      if (error) {
        console.error('Sign-up edge function error:', error);
        return { error: new Error(error.message || 'Sign-up failed') };
      }

      if (!data?.success) {
        console.error('Sign-up failed:', data?.error);
        return { error: new Error(data?.error || 'Sign-up failed') };
      }

      console.log('User created successfully:', data.user);
      return { error: null, data: data.user };
    } catch (error: any) {
      console.error('Sign-up function error:', error);
      return { error: new Error(error.message || 'Sign-up failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Sync JWT metadata on successful login
    if (!error && data.user) {
      // Use setTimeout to avoid blocking the login flow
      setTimeout(async () => {
        await syncUserMetadataToJWT(data.user!.id);
      }, 100);
    }
    
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
  };

  const clearImpersonation = () => {
    setImpersonatedProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user logged in' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error) {
      // Sync JWT metadata after profile update
      await onProfileUpdate(user.id);
      
      if (profile) {
        setProfile({ ...profile, ...updates });
      }
    }

    return { error };
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  };

  const refreshOrganization = async () => {
    if (!user) return;
    
    setOrganizationLoading(true);
    const organizationData = await fetchUserOrganization(user.id);
    setUserOrganization(organizationData);
    setOrganizationLoading(false);
  };

  const forgotPassword = async (email: string) => {
    try {
      console.log('Sending password reset email to:', email);
      
      const { data, error } = await supabase.functions.invoke('password-reset-email', {
        body: { email }
      });

      if (error) {
        console.error('Password reset Edge Function error:', error);
        return { 
          error: { 
            message: error.message || 'Failed to send password reset email',
            type: 'edge_function_error'
          } 
        };
      }

      console.log('Password reset email sent successfully:', data);
      return { error: null };
      
    } catch (error) {
      console.error('Unexpected forgot password error:', error);
      return { 
        error: { 
          message: 'An unexpected error occurred while sending the password reset email',
          type: 'unexpected_error'
        } 
      };
    }
  };

  const resetPassword = async (password: string) => {
    try {
      // Validate recovery session before attempting password reset
      if (!isRecoverySession()) {
        return { 
          error: 'Invalid recovery session. Please request a new password reset link.',
          errorType: 'INVALID_SESSION'
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        // Categorize errors for better user feedback
        let errorType = 'UNKNOWN';
        if (error.message.includes('expired')) {
          errorType = 'EXPIRED_TOKEN';
        } else if (error.message.includes('invalid')) {
          errorType = 'INVALID_TOKEN';
        } else if (error.message.includes('network')) {
          errorType = 'NETWORK_ERROR';
        }
        
        return { error: error.message, errorType };
      }

      // Clear recovery flow state on successful reset
      setIsInRecoveryFlow(false);
      
      return { error: null };
    } catch (err: any) {
      return { 
        error: err.message || 'An unexpected error occurred',
        errorType: 'UNKNOWN'
      };
    }
  };

  const setRecoveryFlow = (inFlow: boolean) => {
    setIsInRecoveryFlow(inFlow);
  };

  const value = {
    user,
    session,
    profile: profile,
    realProfile: profile,
    viewingProfile: impersonatedProfile || profile,
    userOrganization,
    loading: loading || initializing,
    organizationLoading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    refreshOrganization,
    impersonatedProfile,
    setImpersonation,
    clearImpersonation,
    isImpersonating: !!impersonatedProfile,
    forgotPassword,
    resetPassword,
    isRecoverySession,
    shouldPreventRedirect,
    isInRecoveryFlow,
    setRecoveryFlow,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};