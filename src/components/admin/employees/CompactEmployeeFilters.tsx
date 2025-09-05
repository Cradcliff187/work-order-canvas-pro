import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { Filter, Users } from 'lucide-react';

interface EmployeeFiltersValue {
  activeFilter?: 'all' | 'active' | 'inactive';
  dateFrom?: string;
  dateTo?: string;
}

interface CompactEmployeeFiltersProps {
  value: EmployeeFiltersValue;
  onChange: (value: EmployeeFiltersValue) => void;
  onClear: () => void;
  totalCount?: number;
  activeCount?: number;
  inactiveCount?: number;
}

export function CompactEmployeeFilters({
  value,
  onChange,
  onClear,
  totalCount = 0,
  activeCount = 0,
  inactiveCount = 0
}: CompactEmployeeFiltersProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  
  // Sync local with external
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (localValue.activeFilter && localValue.activeFilter !== 'all') count++;
    if (localValue.dateFrom) count++;
    if (localValue.dateTo) count++;
    return count;
  }, [localValue]);

  const handleFilterChange = (key: keyof EmployeeFiltersValue, filterValue: any) => {
    setLocalValue(prev => ({ ...prev, [key]: filterValue }));
  };

  const handleApplyFilters = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    onClear();
    setLocalValue({ activeFilter: 'all', dateFrom: '', dateTo: '' });
    setIsOpen(false);
  };

  // Filter content
  const FilterContent = () => (
    <>
      <div className="space-y-4">
        {/* Status Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <Select 
            value={localValue.activeFilter || 'all'} 
            onValueChange={(val) => handleFilterChange('activeFilter', val)}
          >
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({totalCount})</SelectItem>
              <SelectItem value="active">Active ({activeCount})</SelectItem>
              <SelectItem value="inactive">Inactive ({inactiveCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Date Range</label>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <Input
                type="date"
                value={localValue.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <Input
                type="date"
                value={localValue.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Action buttons - gold standard pattern */}
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
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs min-w-[1.25rem] h-5 flex items-center justify-center">
                {activeFilterCount}
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
              {activeFilterCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs min-w-[1.25rem] h-5 flex items-center justify-center">
                  {activeFilterCount}
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