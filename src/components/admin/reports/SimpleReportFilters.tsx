import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationsForWorkOrders, useTrades } from '@/hooks/useWorkOrders';

interface SimpleReportFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClear: () => void;
}

export function SimpleReportFilters({ filters, onFiltersChange, onClear }: SimpleReportFiltersProps) {
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>(
    filters.partner_organization_ids || []
  );

  // Fetch organizations and trades
  const { data: organizations = [] } = useOrganizationsForWorkOrders();
  const { data: trades = [] } = useTrades();

  // Separate partner and subcontractor organizations
  const partnerOrgs = organizations.filter(org => org.organization_type === 'partner');
  const subcontractorOrgs = organizations.filter(org => org.organization_type === 'subcontractor');

  // Fetch locations based on selected partner organizations
  const { data: locations = [] } = useQuery({
    queryKey: ['partner-locations', selectedPartnerIds],
    queryFn: async () => {
      if (selectedPartnerIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('partner_locations')
        .select('id, location_name, organization_id')
        .in('organization_id', selectedPartnerIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: selectedPartnerIds.length > 0,
  });

  const handleFilterChange = (key: string, value: any) => {
    // Handle partner organization selection for location dependency
    if (key === 'partner_organization_ids') {
      const newPartnerIds = value ? [value] : [];
      setSelectedPartnerIds(newPartnerIds);
      // Clear location when partner changes
      onFiltersChange({
        ...filters,
        [key]: newPartnerIds,
        location: undefined
      });
      return;
    }

    // Convert single values to arrays for certain filters
    if (key === 'status' || key === 'subcontractor_organization_ids' || key === 'trade_ids') {
      onFiltersChange({
        ...filters,
        [key]: value ? [value] : []
      });
      return;
    }

    // Handle date range
    if (key === 'date_from' || key === 'date_to') {
      const currentDateRange = filters.date_range || {};
      onFiltersChange({
        ...filters,
        date_range: {
          ...currentDateRange,
          [key === 'date_from' ? 'from' : 'to']: value || undefined
        }
      });
      return;
    }

    // Handle other filters directly
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const getFilterValue = (key: string) => {
    if (key === 'status' || key === 'subcontractor_organization_ids' || key === 'trade_ids') {
      return filters[key]?.[0] || '';
    }
    if (key === 'partner_organization_ids') {
      return filters[key]?.[0] || '';
    }
    if (key === 'date_from') {
      return filters.date_range?.from || '';
    }
    if (key === 'date_to') {
      return filters.date_range?.to || '';
    }
    return filters[key] || '';
  };

  return (
    <div className="space-y-4 p-4">
      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Status
        </label>
        <select 
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          value={getFilterValue('status')}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Date From
          </label>
          <input
            type="date"
            className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            value={getFilterValue('date_from')}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Date To
          </label>
          <input
            type="date"
            className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            value={getFilterValue('date_to')}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
          />
        </div>
      </div>

      {/* Partner Organization */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Partner Organization
        </label>
        <select 
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          value={getFilterValue('partner_organization_ids')}
          onChange={(e) => handleFilterChange('partner_organization_ids', e.target.value)}
        >
          <option value="">All Partners</option>
          {partnerOrgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {/* Location (dependent on partner) */}
      {selectedPartnerIds.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Location
          </label>
          <select 
            className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            value={getFilterValue('location')}
            onChange={(e) => handleFilterChange('location', e.target.value)}
          >
            <option value="">All Locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.location_name}>
                {location.location_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Subcontractor Organization */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Subcontractor
        </label>
        <select 
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          value={getFilterValue('subcontractor_organization_ids')}
          onChange={(e) => handleFilterChange('subcontractor_organization_ids', e.target.value)}
        >
          <option value="">All Subcontractors</option>
          {subcontractorOrgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {/* Trade */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Trade
        </label>
        <select 
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          value={getFilterValue('trade_ids')}
          onChange={(e) => handleFilterChange('trade_ids', e.target.value)}
        >
          <option value="">All Trades</option>
          {trades.map((trade) => (
            <option key={trade.id} value={trade.id}>
              {trade.name}
            </option>
          ))}
        </select>
      </div>

      {/* Submitted By */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Submitted By
        </label>
        <input
          type="text"
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          value={getFilterValue('submitted_by')}
          onChange={(e) => handleFilterChange('submitted_by', e.target.value)}
          placeholder="Name or email..."
        />
      </div>

      {/* Work Order */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Work Order
        </label>
        <input
          type="text"
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          value={getFilterValue('work_order')}
          onChange={(e) => handleFilterChange('work_order', e.target.value)}
          placeholder="Work order number or details..."
        />
      </div>

      {/* Clear Button */}
      <button
        onClick={onClear}
        className="w-full p-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
      >
        Clear All Filters
      </button>
    </div>
  );
}