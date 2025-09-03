import React from 'react';

interface SimpleSubcontractorBillFiltersProps {
  filters: {
    search?: string;
    invoice_status?: string[];
    operational_status?: string[];
    partner_billing_status?: string[];
  };
  onFiltersChange: (filters: any) => void;
  onClear: () => void;
}

export function SimpleSubcontractorBillFilters({ 
  filters, 
  onFiltersChange, 
  onClear
}: SimpleSubcontractorBillFiltersProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4 pb-6">
        {/* Search Input */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Search
          </label>
          <input
            type="text"
            placeholder="Search bill number, vendor..."
            className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({
              ...filters,
              search: e.target.value
            })}
          />
        </div>

        {/* Bill Status */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Bill Status
          </label>
          <select 
            className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            value={filters.invoice_status?.[0] || ''}
            onChange={(e) => onFiltersChange({
              ...filters,
              invoice_status: e.target.value ? [e.target.value] : []
            })}
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Operational Status */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Operational Status
          </label>
          <select 
            className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            value={filters.operational_status?.[0] || ''}
            onChange={(e) => onFiltersChange({
              ...filters,
              operational_status: e.target.value ? [e.target.value] : []
            })}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="review_pending">Review Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Partner Billing Status */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Partner Billing Status
          </label>
          <select 
            className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            value={filters.partner_billing_status?.[0] || ''}
            onChange={(e) => onFiltersChange({
              ...filters,
              partner_billing_status: e.target.value ? [e.target.value] : []
            })}
          >
            <option value="">All Statuses</option>
            <option value="not_ready">Not Ready</option>
            <option value="ready_to_bill">Ready to Bill</option>
            <option value="billed">Billed</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Clear Button */}
        <button
          onClick={onClear}
          className="w-full p-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
}