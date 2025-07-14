import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';

export interface OrganizationGuardResult {
  shouldBlock: boolean;
  isLoading: boolean;
  errorType: 'none' | 'multiple' | null;
  organizationCount: number;
  organizations: Array<{
    id: string;
    name: string;
    organization_type: string;
  }>;
}

export const useOrganizationGuard = (): OrganizationGuardResult => {
  const { profile } = useAuth();
  const { data: userOrganizations, isLoading } = useUserOrganizations();
  
  return useMemo(() => {
    // Admins can bypass guard
    if (!profile || profile.user_type === 'admin') {
      return {
        shouldBlock: false,
        isLoading: false,
        errorType: null,
        organizationCount: 0,
        organizations: [],
      };
    }
    
    const orgCount = userOrganizations?.length || 0;
    const hasValidOrgCount = orgCount === 1;
    
    let errorType: 'none' | 'multiple' | null = null;
    if (!isLoading && !hasValidOrgCount) {
      errorType = orgCount === 0 ? 'none' : 'multiple';
    }
    
    return {
      shouldBlock: !isLoading && !hasValidOrgCount,
      isLoading,
      errorType,
      organizationCount: orgCount,
      organizations: userOrganizations || [],
    };
  }, [profile, userOrganizations, isLoading]);
};