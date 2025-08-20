import React from 'react';

interface SimplePipelineFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClear: () => void;
  organizations?: Array<{ id: string; name: string }>;
  subcontractors?: Array<{ id: string; name: string }>;
  locations?: string[];
}

export function SimplePipelineFilters({ 
  filters, 
  onFiltersChange, 
  onClear, 
  organizations = [],
  subcontractors = [],
  locations = []
}: SimplePipelineFiltersProps) {
  return (
    <div className="space-y-4 p-4">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Search
        </label>
        <input
          type="text"
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({
            ...filters,
            search: e.target.value
          })}
          placeholder="Search work orders, locations..."
        />
      </div>

      {/* Operational Status */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Operational Status
        </label>
        <select 
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          value={filters.status?.[0] || ''}
          onChange={(e) => onFiltersChange({
            ...filters,
            status: e.target.value ? [e.target.value] : []
          })}
        >
          <option value="">All Statuses</option>
          <option value="received">New Orders</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Partner Organization */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Partner Organization
        </label>
        <select 
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          value={filters.partner_organization_ids?.[0] || ''}
          onChange={(e) => onFiltersChange({
            ...filters,
            partner_organization_ids: e.target.value ? [e.target.value] : []
          })}
        >
          <option value="">All Organizations</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
      </div>

      {/* Completed By */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Completed By
        </label>
        <select 
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          value={filters.completed_by?.[0] || ''}
          onChange={(e) => onFiltersChange({
            ...filters,
            completed_by: e.target.value ? [e.target.value] : []
          })}
        >
          <option value="">All</option>
          <option value="internal">Internal</option>
          {subcontractors.map(sub => (
            <option key={sub.id} value={sub.id}>{sub.name}</option>
          ))}
        </select>
      </div>

      {/* Location Filter */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Location
        </label>
        <select 
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          value={filters.location_filter?.[0] || ''}
          onChange={(e) => onFiltersChange({
            ...filters,
            location_filter: e.target.value ? [e.target.value] : []
          })}
        >
          <option value="">All Locations</option>
          {locations.map(location => (
            <option key={location} value={location}>{location}</option>
          ))}
        </select>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Date From
        </label>
        <input
          type="date"
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          value={filters.date_from || ''}
          onChange={(e) => onFiltersChange({
            ...filters,
            date_from: e.target.value
          })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Date To
        </label>
        <input
          type="date"
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          value={filters.date_to || ''}
          onChange={(e) => onFiltersChange({
            ...filters,
            date_to: e.target.value
          })}
        />
      </div>

      {/* Show Overdue Only */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="overdue-only"
          checked={filters.showOverdueOnly || false}
          onChange={(e) => onFiltersChange({
            ...filters,
            showOverdueOnly: e.target.checked
          })}
          className="rounded border-border bg-background"
        />
        <label htmlFor="overdue-only" className="text-sm font-medium text-foreground">
          Show Overdue Only
        </label>
      </div>

      {/* Clear Button */}
      <button
        onClick={onClear}
        className="w-full p-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
      >
        Clear All Filters
      </button>
    </div>
  );
}