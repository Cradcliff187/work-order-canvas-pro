import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { Filter, Building2 } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';

interface LocationFiltersValue {
  organization_id?: string;
  status?: 'all' | 'active' | 'inactive';
  location_ids?: string[];
}

export function CompactLocationFilters({
  value,
  onChange,
  onClear,
  locationOptions = []
}: {
  value: LocationFiltersValue;
  onChange: (value: LocationFiltersValue) => void;
  onClear: () => void;
  locationOptions: Array<{ value: string; label: string }>;
}) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const { data: organizations = [] } = useOrganizations();
  
  // Partner organizations only
  const partnerOrgs = useMemo(() => 
    organizations.filter(org => org.organization_type === 'partner'),
    [organizations]
  );
  
  // Sync local with external
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Calculate active filter count
  const activeCount = useMemo(() => {
    let count = 0;
    if (localValue.organization_id && localValue.organization_id !== 'all') count++;
    if (localValue.status && localValue.status !== 'all') count++;
    if (localValue.location_ids && localValue.location_ids.length > 0) count += localValue.location_ids.length;
    return count;
  }, [localValue]);

  const handleFilterChange = (key: keyof LocationFiltersValue, filterValue: any) => {
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

  // Filter content (shared between mobile and desktop)
  const FilterContent = () => (
    <>
      <div className="space-y-4">
        {/* Organization Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Organization</label>
          <Select 
            value={localValue.organization_id || 'all'} 
            onValueChange={(val) => handleFilterChange('organization_id', val === 'all' ? undefined : val)}
          >
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="All organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {partnerOrgs.map(org => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Locations Multi-Select */}
        <div>
          <label className="text-sm font-medium mb-2 block">Locations</label>
          <MultiSelectFilter
            options={locationOptions}
            selectedValues={localValue.location_ids || []}
            onSelectionChange={(vals) => handleFilterChange('location_ids', vals)}
            placeholder="Filter by locations..."
            className="w-full h-10"
            maxDisplayCount={2}
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <Select 
            value={localValue.status || 'all'} 
            onValueChange={(val) => handleFilterChange('status', val as any)}
          >
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Action buttons - matches Work Orders exactly */}
      <div className="flex gap-3 pt-4 border-t bg-background/95 backdrop-blur">
        <Button variant="outline" onClick={handleClearFilters} className="flex-1 h-12">
          Clear
        </Button>
        <Button onClick={handleApplyFilters} className="flex-1 h-12">
          Apply
        </Button>
      </div>
    </>
  );

  // Mobile overlay component
  const MobileFilterOverlay = () => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Filters</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
          >
            ✕
          </Button>
        </div>
        
        {/* Scrollable content */}
        <div className="max-h-[calc(100vh-140px)] overflow-y-auto p-4">
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