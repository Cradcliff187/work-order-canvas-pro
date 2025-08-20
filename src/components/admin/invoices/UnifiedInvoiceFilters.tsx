import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useSubcontractorOrganizations } from '@/hooks/useSubcontractorOrganizations';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';

export interface InvoiceFiltersValue {
  search?: string;
  overdue?: boolean;
  invoice_status?: string[];
  partner_organization_id?: string;
  location_filter?: string[];
  subcontractor_organization_id?: string;
  operational_status?: string[];
  report_status?: string[];
  partner_billing_status?: string[];
}

interface UnifiedInvoiceFiltersProps {
  filters: InvoiceFiltersValue;
  onFiltersChange: (filters: InvoiceFiltersValue) => void;
  onClear: () => void;
}

// Status options matching the pipeline workflow
const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];


const OPERATIONAL_STATUS_OPTIONS = [
  { value: 'new', label: 'New Orders' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'reports_pending', label: 'Reports Pending Review' },
  { value: 'complete', label: 'Completed' }
];

const REPORT_STATUS_OPTIONS = [
  { value: 'not_submitted', label: 'Not Submitted' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Needs Revision' }
];

const PARTNER_BILLING_STATUS_OPTIONS = [
  { value: 'report_pending', label: 'Report Pending' },
  { value: 'invoice_needed', label: 'Subcontractor Invoice Needed' },
  { value: 'invoice_pending', label: 'Invoice Pending Approval' },
  { value: 'ready_to_bill', label: 'Ready to Bill Partner' },
  { value: 'billed', label: 'Partner Billed' }
];

export function UnifiedInvoiceFilters({
  filters,
  onFiltersChange,
  onClear
}: UnifiedInvoiceFiltersProps) {
  const { data: organizations = [] } = useOrganizations();
  const { data: subcontractorOrganizations = [] } = useSubcontractorOrganizations();
  const { data: partnerLocations = [] } = usePartnerLocations(filters.partner_organization_id);
  
  const [locationTextInput, setLocationTextInput] = useState('');

  // Create organization options
  const partnerOrganizationOptions = useMemo(() => {
    return organizations
      .filter(org => org.organization_type === 'partner')
      .map(org => ({ value: org.id, label: org.name }));
  }, [organizations]);

  const subcontractorOptions = useMemo(() => {
    return subcontractorOrganizations.map(org => ({ 
      value: org.id, 
      label: org.name 
    }));
  }, [subcontractorOrganizations]);

  // Create location options
  const locationOptions = useMemo(() => {
    return partnerLocations.map(location => ({
      value: location.location_name,
      label: `${location.location_name} (${location.location_number || ''})`
    }));
  }, [partnerLocations]);


  // Filter change handlers
  const handleSingleSelectChange = (key: keyof InvoiceFiltersValue, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value ? [value] : undefined
    });
  };

  const handleSingleValueChange = (key: keyof InvoiceFiltersValue, value: string | boolean | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };


  const handleLocationTextSubmit = () => {
    if (locationTextInput.trim()) {
      const currentLocations = filters.location_filter || [];
      if (!currentLocations.includes(locationTextInput.trim())) {
        onFiltersChange({
          ...filters,
          location_filter: [...currentLocations, locationTextInput.trim()]
        });
      }
      setLocationTextInput('');
    }
  };

  // Essential filters
  const essentialFilters = (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Status</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.overdue ? 'overdue' : 'all'}
          onChange={(e) => handleSingleValueChange('overdue', e.target.value === 'overdue')}
        >
          <option value="all">All Invoices</option>
          <option value="overdue">Overdue Only</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Invoice Status</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.invoice_status?.[0] || ''}
          onChange={(e) => handleSingleSelectChange('invoice_status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {INVOICE_STATUSES.map(status => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>


      <div className="space-y-2">
        <label className="text-sm font-medium">Partner Organization</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.partner_organization_id || ''}
          onChange={(e) => {
            handleSingleValueChange('partner_organization_id', e.target.value || undefined);
            // Clear location filter when partner changes
            if (filters.location_filter?.length) {
              onFiltersChange({
                ...filters,
                partner_organization_id: e.target.value || undefined,
                location_filter: undefined
              });
            }
          }}
        >
          <option value="">All Partners</option>
          {partnerOrganizationOptions.map(org => (
            <option key={org.value} value={org.value}>
              {org.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // Advanced filters
  const advancedFilters = (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Location</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.location_filter?.[0] || ''}
          onChange={(e) => handleSingleSelectChange('location_filter', e.target.value)}
          disabled={!filters.partner_organization_id}
        >
          <option value="">Select location</option>
          {locationOptions.map(location => (
            <option key={location.value} value={location.value}>
              {location.label}
            </option>
          ))}
        </select>
        
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Add custom location"
            value={locationTextInput}
            onChange={(e) => setLocationTextInput(e.target.value)}
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && handleLocationTextSubmit()}
          />
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleLocationTextSubmit}
            disabled={!locationTextInput.trim()}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Subcontractor Organization</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.subcontractor_organization_id || ''}
          onChange={(e) => handleSingleValueChange('subcontractor_organization_id', e.target.value || undefined)}
        >
          <option value="">All Subcontractors</option>
          {subcontractorOptions.map(org => (
            <option key={org.value} value={org.value}>
              {org.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Operational Status</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.operational_status?.[0] || ''}
          onChange={(e) => handleSingleSelectChange('operational_status', e.target.value)}
        >
          <option value="">All Work Statuses</option>
          {OPERATIONAL_STATUS_OPTIONS.map(status => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Report Status</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.report_status?.[0] || ''}
          onChange={(e) => handleSingleSelectChange('report_status', e.target.value)}
        >
          <option value="">All Report Statuses</option>
          {REPORT_STATUS_OPTIONS.map(status => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Partner Billing Status</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.partner_billing_status?.[0] || ''}
          onChange={(e) => handleSingleSelectChange('partner_billing_status', e.target.value)}
        >
          <option value="">All Billing Statuses</option>
          {PARTNER_BILLING_STATUS_OPTIONS.map(status => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

    </div>
  );

  return (
    <div className="space-y-4">
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