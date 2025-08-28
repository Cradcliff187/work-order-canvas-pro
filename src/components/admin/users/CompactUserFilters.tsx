import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { useIsMobile } from '@/hooks/use-mobile';
import { Filter, Users } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';

export interface UserFiltersValue {
  roleFilter?: string[];
  status?: string[];
  organizationId?: string;
  organizationType?: string[];
  hasRecentActivity?: boolean;
  hasNeverLoggedIn?: boolean;
}

interface CompactUserFiltersProps {
  value: UserFiltersValue;
  onChange: (value: UserFiltersValue) => void;
  onClear: () => void;
}

const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'employee', label: 'Employee' },
  { value: 'partner', label: 'Partner' },
  { value: 'subcontractor', label: 'Subcontractor' }
];

const USER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' }
];

const ORGANIZATION_TYPES = [
  { value: 'internal', label: 'Internal' },
  { value: 'partner', label: 'Partner' },
  { value: 'subcontractor', label: 'Subcontractor' }
];

export function CompactUserFilters({
  value,
  onChange,
  onClear
}: CompactUserFiltersProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const { data: organizations = [] } = useOrganizations();
  
  // Sync local with external
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Calculate active filter count
  const activeCount = useMemo(() => {
    let count = 0;
    if (localValue.roleFilter?.length) count += localValue.roleFilter.length;
    if (localValue.status?.length) count += localValue.status.length;
    if (localValue.organizationId) count++;
    if (localValue.organizationType?.length) count += localValue.organizationType.length;
    if (localValue.hasRecentActivity) count++;
    if (localValue.hasNeverLoggedIn) count++;
    return count;
  }, [localValue]);

  const handleFilterChange = (key: keyof UserFiltersValue, filterValue: any) => {
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

  // Filter content
  const FilterContent = () => (
    <>
      <div className="space-y-4">
        {/* Role Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Role</label>
          <MultiSelectFilter
            options={USER_ROLES}
            selectedValues={localValue.roleFilter || []}
            onSelectionChange={(vals) => handleFilterChange('roleFilter', vals)}
            placeholder="Filter by role..."
            className="w-full h-10"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <MultiSelectFilter
            options={USER_STATUSES}
            selectedValues={localValue.status || []}
            onSelectionChange={(vals) => handleFilterChange('status', vals)}
            placeholder="Filter by status..."
            className="w-full h-10"
          />
        </div>

        {/* Organization Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Organization</label>
          <OrganizationSelector
            value={localValue.organizationId}
            onChange={(orgId) => handleFilterChange('organizationId', orgId)}
            placeholder="All organizations..."
            className="h-10"
          />
        </div>

        {/* Organization Type Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Organization Type</label>
          <MultiSelectFilter
            options={ORGANIZATION_TYPES}
            selectedValues={localValue.organizationType || []}
            onSelectionChange={(vals) => handleFilterChange('organizationType', vals)}
            placeholder="Filter by org type..."
            className="w-full h-10"
          />
        </div>

        {/* Quick Filters */}
        <div>
          <label className="text-sm font-medium mb-2 block">Quick Filters</label>
          <div className="space-y-2">
            <Button
              variant={localValue.hasRecentActivity ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange('hasRecentActivity', !localValue.hasRecentActivity)}
              className="w-full justify-start"
            >
              Recent Activity (Last 7 days)
            </Button>
            <Button
              variant={localValue.hasNeverLoggedIn ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange('hasNeverLoggedIn', !localValue.hasNeverLoggedIn)}
              className="w-full justify-start"
            >
              Never Logged In
            </Button>
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleClearFilters}>
          Clear
        </Button>
        <Button onClick={handleApplyFilters}>
          Apply
        </Button>
      </div>
    </>
  );

  // Mobile overlay
  const MobileFilterOverlay = () => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Filters</h2>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            ✕
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4" style={{ height: 'calc(100vh - 136px)' }}>
          <FilterContent />
        </div>
      </div>
    );
  };

  // Main render
  return (
    <>
      {isMobile ? (
        <>
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className="relative flex-1"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs min-w-[1.25rem] h-5 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </Button>
          <MobileFilterOverlay />
        </>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs min-w-[1.25rem] h-5 flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <FilterContent />
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}