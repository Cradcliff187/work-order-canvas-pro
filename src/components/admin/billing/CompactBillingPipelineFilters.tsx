import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Filter, TrendingUp, AlertTriangle, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useSubcontractorOrganizations } from '@/hooks/useSubcontractorOrganizations';
import { useTrades } from '@/hooks/useWorkOrders';
import { useWorkOrderLifecycle } from '@/hooks/useWorkOrderLifecyclePipeline';

// PRESERVE EXACT INTERFACE - DO NOT MODIFY
interface PipelineFiltersValue {
  status?: string[];
  trade_id?: string[];
  partner_organization_ids?: string[];
  completed_by?: string[];
  search?: string;
  date_from?: string;
  date_to?: string;
  location_filter?: string[];
  showOverdueOnly?: boolean;
  financial_status?: string[];
  partner_billing_status?: string[];
  priority?: string[];
  report_status?: string[];
}

// PRESERVE ALL STATUS OPTIONS EXACTLY
const workOrderStatusOptions = [
  { value: 'received', label: 'New Orders' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

const financialStatusOptions = [
  { value: 'not_billed', label: 'No Invoice' },
  { value: 'invoice_received', label: 'Invoice Received' },
  { value: 'paid', label: 'Paid' }
];

const partnerBillingStatusOptions = [
  { value: 'report_pending', label: 'Report Pending' },
  { value: 'invoice_needed', label: 'Subcontractor Invoice Needed' },
  { value: 'invoice_pending', label: 'Invoice Pending Approval' },
  { value: 'ready_to_bill', label: 'Ready to Bill Partner' },
  { value: 'billed', label: 'Partner Billed' }
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const reportStatusOptions = [
  { value: 'not_submitted', label: 'Not Submitted' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

export function CompactBillingPipelineFilters({
  value,
  onChange,
  onClear
}: {
  value: PipelineFiltersValue;
  onChange: (value: PipelineFiltersValue) => void;
  onClear: () => void;
}) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  
  // Get data from database
  const { data: trades } = useTrades();
  const { data: organizations } = useOrganizations();
  const { data: subcontractors } = useSubcontractorOrganizations();
  const { data: pipelineData } = useWorkOrderLifecycle();
  
  // Extract unique locations from pipeline data
  const locations = useMemo(() => {
    if (!pipelineData) return [];
    const locationSet = new Set<string>();
    pipelineData.forEach(item => {
      if (item.store_location) {
        locationSet.add(item.store_location);
      }
    });
    return Array.from(locationSet).sort();
  }, [pipelineData]);
  
  // Filter to partner organizations only
  const partnerOrgs = useMemo(() => 
    organizations?.filter(org => org.organization_type === 'partner') || [],
    [organizations]
  );
  
  // Sync local with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Calculate active filter count
  const activeCount = useMemo(() => {
    let count = 0;
    if (localValue.status?.length) count += localValue.status.length;
    if (localValue.trade_id?.length) count += localValue.trade_id.length;
    if (localValue.partner_organization_ids?.length) count += localValue.partner_organization_ids.length;
    if (localValue.completed_by?.length) count += localValue.completed_by.length;
    if (localValue.location_filter?.length) count += localValue.location_filter.length;
    if (localValue.financial_status?.length) count += localValue.financial_status.length;
    if (localValue.partner_billing_status?.length) count += localValue.partner_billing_status.length;
    if (localValue.priority?.length) count += localValue.priority.length;
    if (localValue.report_status?.length) count += localValue.report_status.length;
    if (localValue.date_from || localValue.date_to) count++;
    if (localValue.showOverdueOnly) count++;
    return count;
  }, [localValue]);

  const handleFilterChange = (key: keyof PipelineFiltersValue, filterValue: any) => {
    setLocalValue(prev => ({ ...prev, [key]: filterValue }));
  };

  const handleApplyFilters = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    onClear();
    setLocalValue({});
    setIsOpen(false);
  };

  // Filter content - organized by sections
  const FilterContent = () => (
    <>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Work Order Status */}
        <div>
          <label className="text-sm font-medium mb-2 block">Work Order Status</label>
          <MultiSelectFilter
            options={workOrderStatusOptions}
            selectedValues={localValue.status || []}
            onSelectionChange={(vals) => handleFilterChange('status', vals)}
            placeholder="Filter by status..."
            className="w-full h-10"
          />
        </div>

        {/* Financial Status */}
        <div>
          <label className="text-sm font-medium mb-2 block">Financial Status</label>
          <MultiSelectFilter
            options={financialStatusOptions}
            selectedValues={localValue.financial_status || []}
            onSelectionChange={(vals) => handleFilterChange('financial_status', vals)}
            placeholder="Filter by financial..."
            className="w-full h-10"
          />
        </div>

        {/* Partner Billing Status */}
        <div>
          <label className="text-sm font-medium mb-2 block">Partner Billing Status</label>
          <MultiSelectFilter
            options={partnerBillingStatusOptions}
            selectedValues={localValue.partner_billing_status || []}
            onSelectionChange={(vals) => handleFilterChange('partner_billing_status', vals)}
            placeholder="Filter by billing..."
            className="w-full h-10"
          />
        </div>

        {/* Report Status */}
        <div>
          <label className="text-sm font-medium mb-2 block">Report Status</label>
          <MultiSelectFilter
            options={reportStatusOptions}
            selectedValues={localValue.report_status || []}
            onSelectionChange={(vals) => handleFilterChange('report_status', vals)}
            placeholder="Filter by report..."
            className="w-full h-10"
          />
        </div>

        {/* Trade */}
        {trades && trades.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Trade</label>
            <MultiSelectFilter
              options={trades.map(t => ({ value: t.id, label: t.name }))}
              selectedValues={localValue.trade_id || []}
              onSelectionChange={(vals) => handleFilterChange('trade_id', vals)}
              placeholder="Filter by trade..."
              className="w-full h-10"
            />
          </div>
        )}

        {/* Partner Organization */}
        {partnerOrgs.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Partner Organization</label>
            <MultiSelectFilter
              options={partnerOrgs.map(org => ({ value: org.id, label: org.name }))}
              selectedValues={localValue.partner_organization_ids || []}
              onSelectionChange={(vals) => handleFilterChange('partner_organization_ids', vals)}
              placeholder="Filter by partner..."
              className="w-full h-10"
            />
          </div>
        )}

        {/* Completed By */}
        {subcontractors && subcontractors.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Completed By</label>
            <Select 
              value={localValue.completed_by?.[0] || 'all'}
              onValueChange={(val) => handleFilterChange('completed_by', val === 'all' ? [] : [val])}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                {subcontractors.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Priority */}
        <div>
          <label className="text-sm font-medium mb-2 block">Priority</label>
          <MultiSelectFilter
            options={priorityOptions}
            selectedValues={localValue.priority || []}
            onSelectionChange={(vals) => handleFilterChange('priority', vals)}
            placeholder="Filter by priority..."
            className="w-full h-10"
          />
        </div>

        {/* Location */}
        {locations.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Location</label>
            <MultiSelectFilter
              options={locations.map(loc => ({ value: loc, label: loc }))}
              selectedValues={localValue.location_filter || []}
              onSelectionChange={(vals) => handleFilterChange('location_filter', vals)}
              placeholder="Filter by location..."
              className="w-full h-10"
            />
          </div>
        )}

        {/* Date Range */}
        <div>
          <label className="text-sm font-medium mb-2 block">Date Range</label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={localValue.date_from || ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="h-10"
            />
            <Input
              type="date"
              value={localValue.date_to || ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        {/* Quick Filter */}
        <div>
          <Button
            variant={localValue.showOverdueOnly ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange('showOverdueOnly', !localValue.showOverdueOnly)}
            className="w-full justify-start"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Show Overdue Only
          </Button>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-between pt-4 border-t sticky bottom-0 bg-background">
        <Button variant="outline" onClick={handleClearFilters}>
          Clear
        </Button>
        <Button onClick={handleApplyFilters}>
          Apply
        </Button>
      </div>
    </>
  );

  // Mobile filter overlay
  const MobileFilterOverlay = () => (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Filters</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <FilterContent />
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              {activeCount}
            </span>
          )}
        </Button>
        
        {isOpen && <MobileFilterOverlay />}
      </>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-4" align="start">
        <FilterContent />
      </PopoverContent>
    </Popover>
  );
}