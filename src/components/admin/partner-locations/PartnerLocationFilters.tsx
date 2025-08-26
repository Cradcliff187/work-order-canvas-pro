import React from 'react';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { useOrganizations } from '@/hooks/useOrganizations';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';

export interface PartnerLocationFiltersProps {
  searchTerm: string;
  selectedOrganization: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onOrganizationChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
  className?: string;
}

export function PartnerLocationFilters({ 
  searchTerm,
  selectedOrganization,
  statusFilter,
  onSearchChange,
  onOrganizationChange,
  onStatusChange,
  onClearFilters,
  className
}: PartnerLocationFiltersProps) {
  const { data: organizations = [] } = useOrganizations();
  
  const partnerOrgs = organizations.filter(org => org.organization_type === 'partner');
  
  const organizationOptions = [
    { value: 'all', label: 'All Organizations' },
    ...partnerOrgs.map(org => ({ value: org.id, label: org.name }))
  ];
  
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  // Calculate filter count
  const filterCount = [
    selectedOrganization !== 'all' ? selectedOrganization : null,
    statusFilter !== 'all' ? statusFilter : null
  ].filter(Boolean).length;

  return (
    <AdminFilterBar
      title="Filters"
      filterCount={filterCount}
      onClear={onClearFilters}
      className={className}
      sheetSide="bottom"
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Organization</label>
          <MultiSelectFilter
            placeholder="Select organization"
            options={organizationOptions}
            selectedValues={selectedOrganization === 'all' ? [] : [selectedOrganization]}
            onSelectionChange={(values) => onOrganizationChange(values[0] || 'all')}
            maxDisplayCount={1}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <MultiSelectFilter
            placeholder="Select status"
            options={statusOptions}
            selectedValues={statusFilter === 'all' ? [] : [statusFilter]}
            onSelectionChange={(values) => onStatusChange(values[0] || 'all')}
            maxDisplayCount={1}
          />
        </div>
      </div>
    </AdminFilterBar>
  );
}

export default PartnerLocationFilters;