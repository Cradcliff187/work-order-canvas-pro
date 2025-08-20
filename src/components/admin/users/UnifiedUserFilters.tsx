import React from 'react';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export interface UserFiltersValue {
  search?: string;
  roleFilter?: string[];
  status?: string[];
  organizationId?: string;
  organizationType?: string[];
}

interface UnifiedUserFiltersProps {
  filters: UserFiltersValue;
  onFiltersChange: (filters: UserFiltersValue) => void;
  onClear: () => void;
  filterCount: number;
}

const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'employee', label: 'Employee' },
  { value: 'member', label: 'Member' }
];

const USER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' }
];

const ORGANIZATION_TYPES = [
  { value: 'internal', label: 'Internal' },
  { value: 'partner', label: 'Partner' },
  { value: 'subcontractor', label: 'Subcontractor' }
];

export function UnifiedUserFilters({
  filters,
  onFiltersChange,
  onClear,
  filterCount
}: UnifiedUserFiltersProps) {
  const { data: organizations = [] } = useOrganizations();

  // Prepare organization options
  const organizationOptions = organizations?.map(org => ({
    value: org.id,
    label: org.name
  })) || [];

  // Handle filter changes
  const handleArrayFilterChange = (key: keyof UserFiltersValue, value: string[]) => {
    onFiltersChange({
      ...filters,
      [key]: value.length > 0 ? value : undefined
    });
  };

  const handleSingleFilterChange = (key: keyof UserFiltersValue, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const handleOrganizationChange = (organizationId: string | undefined) => {
    onFiltersChange({
      ...filters,
      organizationId: organizationId || undefined
    });
  };

  // Essential filters
  const essentialFilters = (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.status?.[0] || ''}
          onChange={(e) => handleArrayFilterChange('status', e.target.value ? [e.target.value] : [])}
        >
          <option value="">Select status</option>
          {USER_STATUSES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Role</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.roleFilter?.[0] || ''}
          onChange={(e) => handleArrayFilterChange('roleFilter', e.target.value ? [e.target.value] : [])}
        >
          <option value="">Select role</option>
          {USER_ROLES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </>
  );

  // Advanced filters
  const advancedFilters = (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Organization</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.organizationId || ''}
          onChange={(e) => handleOrganizationChange(e.target.value || undefined)}
        >
          <option value="">All organizations</option>
          {organizationOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Organization Type</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.organizationType?.[0] || ''}
          onChange={(e) => handleArrayFilterChange('organizationType', e.target.value ? [e.target.value] : [])}
        >
          <option value="">Select organization type</option>
          {ORGANIZATION_TYPES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Clear All Filters Button */}
      {filterCount > 0 && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onClear}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Clear All Filters ({filterCount})
        </Button>
      )}

      {/* Essential Filters */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Essential</h3>
        {essentialFilters}
      </div>
      
      {/* Advanced Filters */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Advanced</h3>
        {advancedFilters}
      </div>
    </div>
  );
}