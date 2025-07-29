import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getUserSingleOrganization } from '@/lib/utils/organizationValidation';
import { hasJWTMetadata, syncUserMetadataToJWT, onProfileUpdate, onOrganizationChange } from '@/lib/auth/jwtSync';
import type { 
  Profile, 
  OrganizationMember, 
  UserPermissions, 
  AuthContextValue
} from '@/types/auth.types';
import {
  mapOrganizationToLegacyUserType,
  hasInternalRole as checkInternalRole,
  isOrganizationType as checkOrgType
} from '@/types/auth.types';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
  const [organizationMember, setOrganizationMember] = useState<OrganizationMember | null>(null);
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

  const fetchOrganizationMembership = async (userId: string): Promise<OrganizationMember | null> => {
    try {
      // First try using the profile ID
      const profileData = await fetchProfile(userId);
      if (!profileData) return null;

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          organization:organizations (
            id,
            name,
            organization_type,
            initials,
            contact_email,
            contact_phone,
            address,
            is_active
          )
        `)
        .eq('user_id', profileData.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching organization membership:', error);
        return null;
      }

      return data as OrganizationMember;
    } catch (error) {
      console.error('Error fetching organization membership:', error);
      return null;
    }
  };

  const checkAndFixSubcontractorOrganization = async (profileId: string) => {
    try {
      // Check if user has organization membership
      const { data: orgCheck } = await supabase
        .from('organization_members')
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
            .from('organization_members')
            .insert({
              user_id: profileId,
              organization_id: assignment.assigned_organization_id,
              role: 'member' // Default role for auto-created memberships
            });
          console.log('Auto-fixed subcontractor organization membership');
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

  // Create permissions object based on organization membership
  const createPermissions = (member: OrganizationMember | null): UserPermissions => {
    const orgType = member?.organization?.organization_type || null;
    const role = member?.role || null;
    
    return {
      isInternal: orgType === 'internal',
      isPartner: orgType === 'partner',
      isSubcontractor: orgType === 'subcontractor',
      hasInternalRole: (roles) => checkInternalRole(orgType, role, roles),
      isOrganizationType: (type) => checkOrgType(orgType, type),
      organizationType: orgType,
      organizationRole: role,
      organizationId: member?.organization_id || null,
      organizationName: member?.organization?.name || null,
    };
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
            
            let memberData: OrganizationMember | null = null;
            
            // Fetch organization membership if user has a profile
            if (profileData) {
              setOrganizationLoading(true);
              
              memberData = await fetchOrganizationMembership(session.user.id);
              
              // Auto-fix subcontractor organizations if needed
              if (!memberData && profileData.is_employee === false) {
                await checkAndFixSubcontractorOrganization(profileData.id);
                // Re-fetch after potential fix
                memberData = await fetchOrganizationMembership(session.user.id);
              }
              
              if (mounted) {
                setOrganizationMember(memberData);
              }
              
              setOrganizationLoading(false);
            }
            
            // Prevent redirects during password reset flow
            const preventRedirect = shouldPreventRedirect();
            const orgType = memberData?.organization?.organization_type;
            const shouldRedirect = event === 'SIGNED_IN' && 
                                  orgType && 
                                  !preventRedirect &&
                                  (window.location.pathname === '/' || window.location.pathname === '/auth');
            
            console.log('Auth state change:', {
              event,
              pathname: window.location.pathname,
              organizationType: orgType,
              preventRedirect,
              shouldRedirect
            });
            
            if (shouldRedirect && memberData) {
              const permissions = createPermissions(memberData);
              let redirectPath = '/';
              
              if (permissions.isInternal) {
                redirectPath = permissions.hasInternalRole(['employee']) ? '/admin/employee-dashboard' : '/admin/dashboard';
              } else if (permissions.isPartner) {
                redirectPath = '/partner/dashboard';
              } else if (permissions.isSubcontractor) {
                redirectPath = '/subcontractor/dashboard';
              }
              
              if (redirectPath !== '/') {
                setTimeout(() => navigate(redirectPath, { replace: true }), 0);
              }
            }
            
            setLoading(false);
          });
        } else {
          setProfile(null);
          setOrganizationMember(null);
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
          
          // Fetch organization membership if user has a profile
          if (profileData) {
            setOrganizationLoading(true);
            
            const memberData = await fetchOrganizationMembership(session.user.id);
            
            // Auto-fix subcontractor organizations if needed
            if (!memberData && profileData.is_employee === false) {
              await checkAndFixSubcontractorOrganization(profileData.id);
              // Re-fetch after potential fix
              const fixedMemberData = await fetchOrganizationMembership(session.user.id);
              if (mounted) {
                setOrganizationMember(fixedMemberData);
              }
            } else if (mounted) {
              setOrganizationMember(memberData);
            }
            
            setOrganizationLoading(false);
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

  const signUp = async (data: any) => {
    try {
      // Map legacy user_type to organization if provided
      let organizationId = data.organizationId;
      let organizationType = data.organizationType;
      
      // Handle legacy user_type parameter for backward compatibility
      if (data.userType && !organizationType) {
        if (data.userType === 'admin' || data.userType === 'employee') {
          organizationType = 'internal';
        } else if (data.userType === 'partner') {
          organizationType = 'partner';
        } else if (data.userType === 'subcontractor') {
          organizationType = 'subcontractor';
        }
      }

      const { data: result, error } = await supabase.functions.invoke('sign-up-user', {
        body: {
          email: data.email,
          password: data.password,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          company_name: data.companyName,
          // Include both for backward compatibility
          user_type: data.userType,
          organization_id: organizationId,
          organization_type: organizationType,
          role: data.role
        }
      });

      if (error) {
        console.error('Sign-up edge function error:', error);
        throw new Error(error.message || 'Sign-up failed');
      }

      if (!result?.success) {
        console.error('Sign-up failed:', result?.error);
        throw new Error(result?.error || 'Sign-up failed');
      }

      console.log('User created successfully:', result.user);
    } catch (error: any) {
      console.error('Sign-up function error:', error);
      throw new Error(error.message || 'Sign-up failed');
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
    
    if (error) throw error;
  };

  const signOut = async () => {
    // Clear impersonation on logout
    setImpersonatedProfile(null);
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) throw error;

    // Sync JWT metadata after profile update
    await onProfileUpdate(user.id);
    
    if (profile) {
      setProfile({ ...profile, ...updates });
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
    
    // Also refresh organization membership
    const memberData = await fetchOrganizationMembership(user.id);
    setOrganizationMember(memberData);
  };

  const impersonateUser = async (userId: string) => {
    // Only allow admins to impersonate
    const permissions = createPermissions(organizationMember);
    if (!permissions.hasInternalRole(['admin', 'owner'])) {
      throw new Error('Unauthorized');
    }
    
    const profileData = await fetchProfile(userId);
    if (profileData) {
      setImpersonatedProfile(profileData);
    }
  };

  const stopImpersonating = () => {
    setImpersonatedProfile(null);
  };

  const forgotPassword = async (email: string) => {
    try {
      console.log('Sending password reset email to:', email);
      
      const { data, error } = await supabase.functions.invoke('password-reset-email', {
        body: { email }
      });

      if (error) {
        console.error('Password reset Edge Function error:', error);
        throw new Error(error.message || 'Failed to send password reset email');
      }

      console.log('Password reset email sent successfully:', data);
      
    } catch (error: any) {
      console.error('Unexpected forgot password error:', error);
      throw new Error(error.message || 'An unexpected error occurred while sending the password reset email');
    }
  };

  const resetPassword = async (password: string) => {
    try {
      // Validate recovery session before attempting password reset
      if (!isRecoverySession()) {
        throw new Error('Invalid recovery session. Please request a new password reset link.');
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;

      // Clear recovery flow state on successful reset
      setIsInRecoveryFlow(false);
      
    } catch (err: any) {
      throw new Error(err.message || 'An unexpected error occurred');
    }
  };

  const setRecoveryFlow = (inFlow: boolean) => {
    setIsInRecoveryFlow(inFlow);
  };

  // Create the permissions object
  const permissions = createPermissions(organizationMember);

  // Legacy properties for backward compatibility
  const viewingProfile = impersonatedProfile || profile;
  
  // Add legacy user_type to ALL profiles for backward compatibility
  const profileWithLegacy = profile ? {
    ...profile,
    // @ts-ignore - Adding for backward compatibility
    user_type: mapOrganizationToLegacyUserType(
      organizationMember?.organization?.organization_type || null,
      organizationMember?.role || null
    )
  } : null;
  
  const viewingProfileWithLegacy = viewingProfile ? {
    ...viewingProfile,
    // @ts-ignore - Adding for backward compatibility
    user_type: mapOrganizationToLegacyUserType(
      organizationMember?.organization?.organization_type || null,
      organizationMember?.role || null
    )
  } : null;

  const value: AuthContextValue = {
    user,
    // @ts-ignore - Maintaining backward compatibility
    session,
    profile: profileWithLegacy,
    organizationMember,
    permissions,
    loading: loading || initializing,
    // @ts-ignore - Maintaining backward compatibility
    organizationLoading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
    impersonateUser,
    stopImpersonating,
    isImpersonating: !!impersonatedProfile,
    realProfile: profileWithLegacy,
    realUserId: user?.id || null,
    viewingProfile: viewingProfileWithLegacy,
    // Legacy properties for backward compatibility
    // @ts-ignore
    impersonatedProfile,
    // @ts-ignore
    setImpersonation: impersonateUser,
    // @ts-ignore
    clearImpersonation: stopImpersonating,
    // @ts-ignore
    refreshOrganization: refreshProfile,
    // @ts-ignore
    userOrganization: organizationMember ? {
      id: organizationMember.organization_id,
      user_id: organizationMember.user_id,
      organization_id: organizationMember.organization_id,
      role: organizationMember.role,
      ...organizationMember.organization
    } : null,
    // @ts-ignore
    forgotPassword,
    // @ts-ignore
    resetPassword,
    // @ts-ignore
    isRecoverySession,
    // @ts-ignore
    shouldPreventRedirect,
    // @ts-ignore
    isInRecoveryFlow,
    // @ts-ignore
    setRecoveryFlow,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};