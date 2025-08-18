import React from 'react';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';

export interface OrganizationFiltersProps {
  searchTerm: string;
  organizationTypeFilter: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onOrganizationTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
  className?: string;
}

export function OrganizationFilters({ 
  searchTerm,
  organizationTypeFilter,
  statusFilter,
  onSearchChange,
  onOrganizationTypeChange,
  onStatusChange,
  onClearFilters,
  className
}: OrganizationFiltersProps) {
  const organizationTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'partner', label: 'Partner' },
    { value: 'subcontractor', label: 'Subcontractor' },
    { value: 'admin', label: 'Admin' }
  ];
  
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  // Calculate filter count
  const filterCount = [
    searchTerm,
    organizationTypeFilter !== 'all' ? organizationTypeFilter : null,
    statusFilter !== 'all' ? statusFilter : null
  ].filter(Boolean).length;

  const searchSlot = (
    <SmartSearchInput
      placeholder="Search organizations by name, email, or contact..."
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      onSearchSubmit={onSearchChange}
      storageKey="admin-organizations-search"
      aria-label="Search organizations"
      className="w-full"
    />
  );

  return (
    <AdminFilterBar
      title="Filters"
      filterCount={filterCount}
      onClear={onClearFilters}
      className={className}
      searchSlot={searchSlot}
      sheetSide="bottom"
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Organization Type</label>
          <MultiSelectFilter
            placeholder="Select type"
            options={organizationTypeOptions}
            selectedValues={organizationTypeFilter === 'all' ? [] : [organizationTypeFilter]}
            onSelectionChange={(values) => onOrganizationTypeChange(values[0] || 'all')}
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

export default OrganizationFilters;
