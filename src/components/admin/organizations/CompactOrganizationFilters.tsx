import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { Filter, Building2 } from 'lucide-react';

interface OrganizationFiltersValue {
  organizationType?: 'all' | 'internal' | 'partner' | 'subcontractor';
  status?: 'all' | 'active' | 'inactive';
}

interface CompactOrganizationFiltersProps {
  value: OrganizationFiltersValue;
  onChange: (value: OrganizationFiltersValue) => void;
  onClear: () => void;
}

export function CompactOrganizationFilters({
  value,
  onChange,
  onClear
}: CompactOrganizationFiltersProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  
  // Sync local with external
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Calculate active filter count
  const activeCount = useMemo(() => {
    let count = 0;
    if (localValue.organizationType && localValue.organizationType !== 'all') count++;
    if (localValue.status && localValue.status !== 'all') count++;
    return count;
  }, [localValue]);

  const handleFilterChange = (key: keyof OrganizationFiltersValue, filterValue: any) => {
    setLocalValue(prev => ({ ...prev, [key]: filterValue }));
  };

  const handleApplyFilters = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    onClear();
    setLocalValue({ organizationType: 'all', status: 'all' });
    setIsOpen(false);
  };

  // Filter content
  const FilterContent = () => (
    <>
      <div className="space-y-4">
        {/* Organization Type Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Organization Type</label>
          <Select 
            value={localValue.organizationType || 'all'} 
            onValueChange={(val) => handleFilterChange('organizationType', val)}
          >
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="subcontractor">Subcontractor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <Select 
            value={localValue.status || 'all'} 
            onValueChange={(val) => handleFilterChange('status', val)}
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
      
      {/* Action buttons - exactly like Work Orders */}
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