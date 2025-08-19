import { useState, useMemo } from 'react';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Filter, ChevronDown, X, Calendar as CalendarIcon, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface PartnerBillingFiltersValue {
  search?: string;
  report_status?: string[];
  subcontractor_organization_id?: string;
  amount_min?: string;
  amount_max?: string;
  date_from?: Date;
  date_to?: Date;
  location_filter?: string[];
  variance_filter?: string[];
  submitted_by?: string[];
  has_invoice?: boolean;
  high_variance?: boolean;
  recently_submitted?: boolean;
}

interface PartnerBillingFiltersProps {
  value: PartnerBillingFiltersValue;
  onChange: (value: PartnerBillingFiltersValue) => void;
  onClear: () => void;
  filterCount: number;
  partnerOrgId?: string;
}

const reportStatusOptions = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Needs Revision' }
];

const varianceFilterOptions = [
  { value: 'high_over', label: 'High Over Budget (>20%)' },
  { value: 'moderate_over', label: 'Moderate Over Budget (5-20%)' },
  { value: 'on_budget', label: 'On Budget (±5%)' },
  { value: 'under_budget', label: 'Under Budget (<-5%)' },
  { value: 'no_estimate', label: 'No Estimate Available' }
];

export function PartnerBillingFilters({ 
  value, 
  onChange, 
  onClear, 
  filterCount, 
  partnerOrgId 
}: PartnerBillingFiltersProps) {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDesktopSheetOpen, setIsDesktopSheetOpen] = useState(false);
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  // Get partner locations
  const { data: partnerLocations } = usePartnerLocations(partnerOrgId);

  // Get subcontractor organizations
  const { data: subcontractors } = useQuery({
    queryKey: ['subcontractor-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, initials')
        .eq('organization_type', 'subcontractor')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Get submitted by users (for reports)
  const { data: submittedByUsers } = useQuery({
    queryKey: ['submitted-by-users', partnerOrgId],
    queryFn: async () => {
      if (!partnerOrgId) return [];
      
      const { data, error } = await supabase
        .from('work_order_reports')
        .select(`
          submitted_by_user_id,
          subcontractor:profiles!submitted_by_user_id(
            first_name,
            last_name,
            email
          )
        `)
        .not('submitted_by_user_id', 'is', null);
      
      if (error) throw error;
      
      // Deduplicate users
      const userMap = new Map();
      data?.forEach(report => {
        if (report.submitted_by_user_id && report.subcontractor) {
          userMap.set(report.submitted_by_user_id, report.subcontractor);
        }
      });
      
      return Array.from(userMap.entries()).map(([id, user]) => ({
        id,
        ...user
      }));
    },
    enabled: !!partnerOrgId,
  });

  // Create location options from partner locations
  const locationOptions = useMemo(() => {
    if (!partnerLocations) return [];
    
    return partnerLocations.map(location => ({
      value: location.location_name,
      label: `${location.location_name} (${location.location_number})`
    }));
  }, [partnerLocations]);

  // Create subcontractor options
  const subcontractorOptions = useMemo(() => {
    if (!subcontractors) return [];
    
    return subcontractors.map(sub => ({
      value: sub.id,
      label: `${sub.name} (${sub.initials})`
    }));
  }, [subcontractors]);

  // Create submitted by options
  const submittedByOptions = useMemo(() => {
    if (!submittedByUsers) return [];
    
    return submittedByUsers.map(user => ({
      value: user.id,
      label: `${user.first_name} ${user.last_name} (${user.email})`
    }));
  }, [submittedByUsers]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (value.search?.trim()) count++;
    if (value.report_status?.length) count += value.report_status.length;
    if (value.subcontractor_organization_id) count++;
    if (value.amount_min || value.amount_max) count++;
    if (value.date_from || value.date_to) count++;
    if (value.location_filter?.length) count += value.location_filter.length;
    if (value.variance_filter?.length) count += value.variance_filter.length;
    if (value.submitted_by?.length) count += value.submitted_by.length;
    if (value.has_invoice) count++;
    if (value.high_variance) count++;
    if (value.recently_submitted) count++;
    return count;
  }, [value]);

  // Helper function to update filter values
  const set = (key: keyof PartnerBillingFiltersValue, newValue: any) => {
    onChange({ ...value, [key]: newValue });
  };

  // Filter render functions
  const renderSearchFilter = () => (
    <SmartSearchInput
      value={value.search || ''}
      onChange={(e) => set('search', e.target.value)}
      placeholder="Search work orders, descriptions, locations..."
      storageKey="partner-billing-search"
    />
  );

  const renderQuickFilters = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Quick Filters</label>
      <div className="space-y-2">
        <Button
          variant={value.high_variance ? "default" : "outline"}
          size="sm"
          onClick={() => set('high_variance', !value.high_variance)}
          className="w-full justify-start"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          High Variance Reports
        </Button>
        <Button
          variant={value.recently_submitted ? "default" : "outline"}
          size="sm"
          onClick={() => set('recently_submitted', !value.recently_submitted)}
          className="w-full justify-start"
        >
          <Clock className="w-4 h-4 mr-2" />
          Recently Submitted
        </Button>
        <Button
          variant={value.has_invoice ? "default" : "outline"}
          size="sm"
          onClick={() => set('has_invoice', !value.has_invoice)}
          className="w-full justify-start"
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          Has Invoice Issues
        </Button>
      </div>
    </div>
  );

  const renderReportStatusFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Report Status</label>
      <MultiSelectFilter
        options={reportStatusOptions}
        selectedValues={value.report_status || []}
        onSelectionChange={(statuses) => set('report_status', statuses)}
        placeholder="Report Status"
        maxDisplayCount={2}
      />
    </div>
  );

  const renderSubcontractorFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Subcontractor</label>
      <MultiSelectFilter
        options={subcontractorOptions}
        selectedValues={value.subcontractor_organization_id ? [value.subcontractor_organization_id] : []}
        onSelectionChange={(values) => set('subcontractor_organization_id', values[0] || undefined)}
        placeholder="Select Subcontractor"
        maxDisplayCount={1}
      />
    </div>
  );

  const renderAmountRangeFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Amount Range</label>
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Min amount"
          value={value.amount_min || ''}
          onChange={(e) => set('amount_min', e.target.value)}
          className="flex-1"
        />
        <Input
          type="number"
          placeholder="Max amount"
          value={value.amount_max || ''}
          onChange={(e) => set('amount_max', e.target.value)}
          className="flex-1"
        />
      </div>
    </div>
  );

  const renderDateRangeFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Date Range</label>
      <div className="flex gap-2">
        <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal flex-1">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.date_from ? format(value.date_from, 'PPP') : 'From date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value.date_from}
              onSelect={(date) => {
                set('date_from', date);
                setDateFromOpen(false);
              }}
              disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal flex-1">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.date_to ? format(value.date_to, 'PPP') : 'To date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value.date_to}
              onSelect={(date) => {
                set('date_to', date);
                setDateToOpen(false);
              }}
              disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      {(value.date_from || value.date_to) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            set('date_from', undefined);
            set('date_to', undefined);
          }}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Clear Date Range
        </Button>
      )}
    </div>
  );

  const renderLocationFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Locations</label>
      <MultiSelectFilter
        options={locationOptions}
        selectedValues={value.location_filter || []}
        onSelectionChange={(locations) => set('location_filter', locations)}
        placeholder="Select Locations"
        disabled={!partnerOrgId}
        maxDisplayCount={2}
      />
    </div>
  );

  const renderVarianceFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Estimate Variance</label>
      <MultiSelectFilter
        options={varianceFilterOptions}
        selectedValues={value.variance_filter || []}
        onSelectionChange={(variances) => set('variance_filter', variances)}
        placeholder="Select Variance Range"
        maxDisplayCount={2}
      />
    </div>
  );

  const renderSubmittedByFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Submitted By</label>
      <MultiSelectFilter
        options={submittedByOptions}
        selectedValues={value.submitted_by || []}
        onSelectionChange={(users) => set('submitted_by', users)}
        placeholder="Select Users"
        maxDisplayCount={2}
      />
    </div>
  );

  // Mobile implementation
  if (isMobile) {
    return (
      <div className="block lg:hidden">
        <div className="space-y-4">
          {/* Always visible search */}
          <div className="bg-card rounded-lg p-4 border shadow-sm">
            {renderSearchFilter()}
          </div>

          {/* Filter trigger */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="h-[85vh] flex flex-col">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>Filter Reports</SheetTitle>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onClear();
                        setIsSheetOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear All
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <div className="overflow-y-auto max-h-[calc(85vh-8rem)] space-y-6 py-4 pb-20">
                {/* Quick Filters Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Quick Filters</h3>
                  {renderQuickFilters()}
                </div>

                {/* Essential Filters Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Essential Filters</h3>
                  {renderReportStatusFilter()}
                  {renderSubcontractorFilter()}
                  {renderAmountRangeFilter()}
                </div>

                {/* Advanced Filters Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Advanced Filters</h3>
                  {renderDateRangeFilter()}
                  {renderLocationFilter()}
                  {renderVarianceFilter()}
                  {renderSubmittedByFilter()}
                </div>
              </div>

              <SheetFooter className="border-t pt-4">
                <Button 
                  onClick={() => setIsSheetOpen(false)}
                  className="w-full"
                >
                  Apply Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

  // Desktop implementation
  return (
    <div className="hidden lg:block">
      <div className="space-y-4">
        {/* Always visible search */}
        <div className="bg-card rounded-lg p-4 border shadow-sm">
          {renderSearchFilter()}
        </div>

        {/* Filter trigger */}
        <Sheet open={isDesktopSheetOpen} onOpenChange={setIsDesktopSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          
          <SheetContent side="right" className="w-[480px] flex flex-col">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle>Filter Reports</SheetTitle>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onClear();
                      setIsDesktopSheetOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="overflow-y-auto max-h-[calc(100vh-8rem)] space-y-6 py-4">
              {/* Quick Filters Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2">Quick Filters</h3>
                {renderQuickFilters()}
              </div>

              {/* Essential Filters Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2">Essential Filters</h3>
                {renderReportStatusFilter()}
                {renderSubcontractorFilter()}
                {renderAmountRangeFilter()}
              </div>

              {/* Advanced Filters Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2">Advanced Filters</h3>
                {renderDateRangeFilter()}
                {renderLocationFilter()}
                {renderVarianceFilter()}
                {renderSubmittedByFilter()}
              </div>
            </div>

            <SheetFooter className="border-t pt-4">
              <Button 
                onClick={() => setIsDesktopSheetOpen(false)}
                className="w-full"
              >
                Apply Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}