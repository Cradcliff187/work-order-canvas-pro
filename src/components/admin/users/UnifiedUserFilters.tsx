import React, { useMemo, useState } from 'react';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { useOrganizations } from '@/hooks/useOrganizations';

export interface UserFiltersValue {
  search?: string;
  role?: string[];
  status?: string[];
  organization_id?: string;
}

interface UnifiedUserFiltersProps {
  filters: UserFiltersValue;
  onFiltersChange: (filters: UserFiltersValue) => void;
  onClear: () => void;
}

const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'property_manager', label: 'Property Manager' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'vendor', label: 'Vendor' }
];

const USER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' }
];

export function UnifiedUserFilters({
  filters,
  onFiltersChange,
  onClear
}: UnifiedUserFiltersProps) {
  const { data: organizations = [] } = useOrganizations();

  // Calculate filter count
  const filterCount = useMemo(() => {
    let count = 0;
    if (filters.role && filters.role.length > 0) count++;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.organization_id) count++;
    return count;
  }, [filters]);

  // Filter change handlers
  const handleArrayFilterChange = (key: keyof UserFiltersValue, values: string[]) => {
    onFiltersChange({
      ...filters,
      [key]: values.length > 0 ? values : undefined
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value;
    onFiltersChange({
      ...filters,
      search: search || undefined
    });
  };

  const handleOrganizationChange = (organizationId: string | undefined) => {
    onFiltersChange({
      ...filters,
      organization_id: organizationId
    });
  };

  // Search slot
  const searchSlot = (
    <SmartSearchInput
      value={filters.search || ''}
      onChange={handleSearchChange}
      placeholder="Search users..."
      storageKey="admin-users-search"
      className="flex-1"
    />
  );

  // Essential filters
  const essentialFilters = (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Role</label>
        <MultiSelectFilter
          options={USER_ROLES}
          selectedValues={filters.role || []}
          onSelectionChange={(values) => handleArrayFilterChange('role', values)}
          placeholder="All roles"
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <MultiSelectFilter
          options={USER_STATUSES}
          selectedValues={filters.status || []}
          onSelectionChange={(values) => handleArrayFilterChange('status', values)}
          placeholder="All statuses"
        />
      </div>
    </div>
  );

  // Advanced filters
  const advancedFilters = (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Organization</label>
        <OrganizationSelector
          value={filters.organization_id}
          onChange={handleOrganizationChange}
          placeholder="All organizations"
          className="w-full"
        />
      </div>
    </div>
  );

  return (
    <AdminFilterBar
      title="User Filters"
      filterCount={filterCount}
      onClear={onClear}
      searchSlot={searchSlot}
      sections={{
        essential: essentialFilters,
        advanced: advancedFilters
      }}
    />
  );
}