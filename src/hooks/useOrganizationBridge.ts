/**
 * Organization Data Bridge Hook
 * Fetches and manages organization membership data
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
// Organization-based data access
import type { OrganizationMember } from '@/types/auth.types';

interface OrganizationBridgeData {
  organizationMemberships: OrganizationMember[];
  primaryOrganization: OrganizationMember | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useOrganizationBridge = (profileId?: string): OrganizationBridgeData => {
  const [organizationMemberships, setOrganizationMemberships] = useState<OrganizationMember[]>([]);
  const [primaryOrganization, setPrimaryOrganization] = useState<OrganizationMember | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizationData = async () => {
    if (!profileId) {
      setOrganizationMemberships([]);
      setPrimaryOrganization(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Organization bridge: Fetching data for profile', profileId);
      
      // Use organization_members table for user organization data
      const useOrganizationMembers = true;
      
      let data, error;
      
      if (useOrganizationMembers) {
        // Fetch from organization_members table (new system)
        const result = await supabase
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
          .eq('user_id', profileId);
        
        data = result.data;
        error = result.error;
      } else {
        // Fetch from user_organizations table (legacy system)
        const result = await supabase
          .from('user_organizations')
          .select(`
            organization_id,
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
          .eq('user_id', profileId);
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching organization memberships:', error);
        setOrganizationMemberships([]);
        setPrimaryOrganization(null);
        return;
      }

      // Transform data into OrganizationMember format
      const memberships: OrganizationMember[] = data?.map((item: any) => {
        if (useOrganizationMembers) {
          // organization_members table format (has all fields)
          return {
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
          };
        } else {
          // user_organizations table format (needs transformation)
          return {
            id: `${profileId}-${item.organization_id}`,
            user_id: profileId,
            organization_id: item.organization_id,
            role: 'member' as any, // Default role for legacy
            created_at: new Date().toISOString(),
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
          };
        }
      }).filter(m => m.organization) || [];

      setOrganizationMemberships(memberships);
      
      // Set primary organization (prefer internal, then first in list)
      const internalOrg = memberships.find(m => m.organization?.organization_type === 'internal');
      setPrimaryOrganization(internalOrg || memberships[0] || null);

    } catch (err) {
      console.error('Error fetching organization data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch organization data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizationData();
  }, [profileId]);

  return {
    organizationMemberships,
    primaryOrganization,
    isLoading,
    error,
    refetch: fetchOrganizationData,
  };
};