import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter, CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganizations } from '@/hooks/useOrganizations';

export interface BillingFiltersValue {
  search?: string;
  status?: string[];                    // work order status
  financial_status?: string[];
  partner_billing_status?: string[];
  report_status?: string[];
  partner_organization_ids?: string[];
  subcontractor_organization_ids?: string[];
  date_from?: string;
  date_to?: string;
  amount_min?: string;
  amount_max?: string;
}

export interface BillingFiltersProps {
  value: BillingFiltersValue;
  onChange: (value: BillingFiltersValue) => void;
  onClear?: () => void;
}

const workOrderStatusOptions = [
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending', label: 'Pending' }
];

const financialStatusOptions = [
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' }
];

const partnerBillingStatusOptions = [
  { value: 'report_pending', label: 'Report Pending' },
  { value: 'invoice_needed', label: 'Invoice Needed' },
  { value: 'ready_to_bill', label: 'Ready to Bill' },
  { value: 'billed', label: 'Billed' }
];

const reportStatusOptions = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' }
];

export function BillingFilters({
  value,
  onChange,
  onClear
}: BillingFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDateFrom, setShowDateFrom] = useState(false);
  const [showDateTo, setShowDateTo] = useState(false);
  const [localValue, setLocalValue] = useState<BillingFiltersValue>(value);
  const isMobile = useIsMobile();
  
  const { data: organizations = [] } = useOrganizations();

  // Calculate active filter count
  const activeCount = useMemo(() => {
    let count = 0;
    if (value.search?.trim()) count++;
    if (value.status?.length) count++;
    if (value.financial_status?.length) count++;
    if (value.partner_billing_status?.length) count++;
    if (value.report_status?.length) count++;
    if (value.partner_organization_ids?.length) count++;
    if (value.subcontractor_organization_ids?.length) count++;
    if (value.date_from) count++;
    if (value.date_to) count++;
    if (value.amount_min?.trim()) count++;
    if (value.amount_max?.trim()) count++;
    return count;
  }, [value]);

  // Prepare organization options
  const partnerOrganizationOptions = organizations
    .filter(org => org.organization_type === 'partner')
    .map(org => ({
      value: org.id,
      label: org.name
    }));

  const subcontractorOrganizationOptions = organizations
    .filter(org => org.organization_type === 'subcontractor')
    .map(org => ({
      value: org.id,
      label: org.name
    }));

  const handleFilterChange = (field: keyof BillingFiltersValue, newValue: string[]) => {
    const updated = { ...localValue, [field]: newValue };
    setLocalValue(updated);
    if (!isMobile) {
      onChange(updated);
    }
  };

  const handleStringFilterChange = (field: keyof BillingFiltersValue, newValue: string) => {
    const updated = { ...localValue, [field]: newValue };
    setLocalValue(updated);
    if (!isMobile) {
      onChange(updated);
    }
  };

  const handleDateFromChange = (date: Date | undefined) => {
    const dateString = date ? format(date, 'yyyy-MM-dd') : '';
    const updated = { ...localValue, date_from: dateString };
    setLocalValue(updated);
    if (!isMobile) {
      onChange(updated);
    }
    setShowDateFrom(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    const dateString = date ? format(date, 'yyyy-MM-dd') : '';
    const updated = { ...localValue, date_to: dateString };
    setLocalValue(updated);
    if (!isMobile) {
      onChange(updated);
    }
    setShowDateTo(false);
  };

  const handleApplyFilters = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const clearedFilters: BillingFiltersValue = {};
    setLocalValue(clearedFilters);
    if (isMobile) {
      onChange(clearedFilters);
      setIsOpen(false);
    } else {
      onChange(clearedFilters);
    }
    onClear?.();
  };

  const FilterContent = () => (
    <div className="space-y-4">
      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Work Order Status */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Work Order Status</Label>
            <MultiSelectFilter
              options={workOrderStatusOptions}
              selectedValues={localValue.status || []}
              onSelectionChange={(values) => handleFilterChange('status', values)}
              placeholder="Select status..."
              className="w-full"
            />
          </div>
          
          {/* Partner Organization */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Partner Organization</Label>
            <MultiSelectFilter
              options={partnerOrganizationOptions}
              selectedValues={localValue.partner_organization_ids || []}
              onSelectionChange={(values) => handleFilterChange('partner_organization_ids', values)}
              placeholder="Select partner organizations..."
              className="w-full"
            />
          </div>
          
          {/* Report Status */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Report Status</Label>
            <MultiSelectFilter
              options={reportStatusOptions}
              selectedValues={localValue.report_status || []}
              onSelectionChange={(values) => handleFilterChange('report_status', values)}
              placeholder="Select report status..."
              className="w-full"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Financial Status */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Financial Status</Label>
            <MultiSelectFilter
              options={financialStatusOptions}
              selectedValues={localValue.financial_status || []}
              onSelectionChange={(values) => handleFilterChange('financial_status', values)}
              placeholder="Select financial status..."
              className="w-full"
            />
          </div>
          
          {/* Subcontractor */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Subcontractor</Label>
            <MultiSelectFilter
              options={subcontractorOrganizationOptions}
              selectedValues={localValue.subcontractor_organization_ids || []}
              onSelectionChange={(values) => handleFilterChange('subcontractor_organization_ids', values)}
              placeholder="Select subcontractor organizations..."
              className="w-full"
            />
          </div>
          
          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover open={showDateFrom} onOpenChange={setShowDateFrom}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !localValue.date_from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localValue.date_from ? format(new Date(localValue.date_from), 'MMM d') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localValue.date_from ? new Date(localValue.date_from) : undefined}
                    onSelect={handleDateFromChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover open={showDateTo} onOpenChange={setShowDateTo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !localValue.date_to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localValue.date_to ? format(new Date(localValue.date_to), 'MMM d') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localValue.date_to ? new Date(localValue.date_to) : undefined}
                    onSelect={handleDateToChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      {/* Apply and Clear buttons at bottom */}
      {!isMobile && (
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="flex-1"
          >
            Clear
          </Button>
          <Button
            onClick={handleApplyFilters}
            className="flex-1"
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );

  const MobileFilterOverlay = () => (
    <div className="fixed inset-0 z-[9999] bg-background">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Filters</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <FilterContent />
        </div>

        {/* Footer Actions */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="flex-1"
            >
              Clear All
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
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
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
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
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[640px] p-4 z-[9999] max-h-[80vh] overflow-y-auto" 
        align="start"
        sideOffset={5}
      >
        <FilterContent />
      </PopoverContent>
    </Popover>
  );
}