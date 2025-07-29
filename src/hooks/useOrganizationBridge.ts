/**
 * Organization Data Bridge Hook
 * Fetches and manages organization membership data for migration
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      // For now, we'll return empty arrays since organization_members table 
      // isn't fully implemented in the schema yet. This is part of the bridge
      // functionality that will be populated as we progress through migration.
      console.log('Organization bridge: Fetching data for profile', profileId);
      
      setOrganizationMemberships([]);
      setPrimaryOrganization(null);

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