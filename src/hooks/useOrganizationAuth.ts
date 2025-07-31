/**
 * Organization-based Authentication Hook
 * Provides authentication context using organization memberships as primary data source
 */

import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
// Organization-based authentication system
import { syncUserMetadataToJWT } from '@/lib/auth/jwtSync';
import type { OrganizationMember, UserWithOrganizations, AuthState } from '@/types/auth.types';

export const useOrganizationAuth = (): AuthState => {
  const [user, setUser] = useState<UserWithOrganizations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [primaryOrganization, setPrimaryOrganization] = useState<OrganizationMember | null>(null);

  const fetchUserWithOrganizations = async (authUser: User): Promise<UserWithOrganizations | null> => {
    try {
      console.log('🔍 useOrganizationAuth: Fetching profile with timeout for user:', authUser.id);
      
      // Fetch user profile with timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      const profileTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      const profileResult = await Promise.race([profilePromise, profileTimeout]);
      const { data: profile, error: profileError } = profileResult as any;

      if (profileError || !profile) {
        console.error('🔍 useOrganizationAuth: Error fetching profile:', profileError);
        return null;
      }

      console.log('🔍 useOrganizationAuth: Profile loaded, fetching memberships...');

      // Fetch organization memberships with timeout
      const membershipPromise = supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          organization_id,
          role,
          created_at,
          organization:organizations (
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
        .eq('user_id', profile.id);

      const membershipTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Membership fetch timeout')), 5000)
      );

      const membershipResult = await Promise.race([membershipPromise, membershipTimeout]);
      const { data: memberships, error: membershipError } = membershipResult as any;

      if (membershipError) {
        console.error('🔍 useOrganizationAuth: Error fetching organization memberships:', membershipError);
        return null;
      }

      console.log('🔍 useOrganizationAuth: Successfully loaded', memberships?.length || 0, 'organization memberships');

      // Create UserWithOrganizations object
      const userWithOrgs: UserWithOrganizations = {
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        is_active: profile.is_active,
        is_employee: profile.is_employee,
        hourly_cost_rate: profile.hourly_cost_rate,
        hourly_billable_rate: profile.hourly_billable_rate,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        organization_memberships: memberships || []
      };

      return userWithOrgs;
    } catch (error) {
      console.error('🔍 useOrganizationAuth: Error in fetchUserWithOrganizations:', error);
      
      if (error instanceof Error && error.message.includes('timeout')) {
        console.error('🕐 useOrganizationAuth: Timeout - User data fetch took too long');
      }
      
      return null;
    }
  };

  const determinePrimaryOrganization = (memberships: OrganizationMember[]): OrganizationMember | null => {
    if (!memberships || memberships.length === 0) return null;

    // Prefer internal organization with admin role
    const internalAdmin = memberships.find(m => 
      m.organization?.organization_type === 'internal' && m.role === 'admin'
    );
    if (internalAdmin) return internalAdmin;

    // Then internal organization with any role
    const internalMember = memberships.find(m => 
      m.organization?.organization_type === 'internal'
    );
    if (internalMember) return internalMember;

    // Otherwise, return first membership
    return memberships[0];
  };

  useEffect(() => {
    let mounted = true;

    // Organization authentication is the primary system

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          const userWithOrgs = await fetchUserWithOrganizations(session.user);
          
          if (userWithOrgs) {
            setUser(userWithOrgs);
            const primary = determinePrimaryOrganization(userWithOrgs.organization_memberships);
            setPrimaryOrganization(primary);

            // Sync JWT metadata after successful load
            if (event === 'SIGNED_IN') {
              setTimeout(() => syncUserMetadataToJWT(session.user.id), 100);
            }
          } else {
            setUser(null);
            setPrimaryOrganization(null);
          }
        } else {
          setUser(null);
          setPrimaryOrganization(null);
        }

        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      if (session?.user) {
        const userWithOrgs = await fetchUserWithOrganizations(session.user);
        
        if (userWithOrgs) {
          setUser(userWithOrgs);
          const primary = determinePrimaryOrganization(userWithOrgs.organization_memberships);
          setPrimaryOrganization(primary);
        }
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Compute derived authentication state
  const hasInternalAccess = primaryOrganization?.organization?.organization_type === 'internal';
  const hasAdminAccess = hasInternalAccess && primaryOrganization?.role === 'admin';

  return {
    user,
    isLoading,
    primaryOrganization,
    hasInternalAccess,
    hasAdminAccess
  };
};
