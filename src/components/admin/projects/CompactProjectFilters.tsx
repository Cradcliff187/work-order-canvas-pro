import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { useIsMobile } from '@/hooks/use-mobile';
import { Filter } from 'lucide-react';

export interface ProjectFiltersValue {
  status?: string[];
}

interface CompactProjectFiltersProps {
  value: ProjectFiltersValue;
  onChange: (value: ProjectFiltersValue) => void;
  onClear: () => void;
}

const PROJECT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' }
];

export function CompactProjectFilters({
  value,
  onChange,
  onClear
}: CompactProjectFiltersProps) {
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
    if (localValue.status?.length) count += localValue.status.length;
    return count;
  }, [localValue]);

  const handleFilterChange = (key: keyof ProjectFiltersValue, filterValue: any) => {
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
        {/* Status Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <MultiSelectFilter
            options={PROJECT_STATUSES}
            selectedValues={localValue.status || []}
            onSelectionChange={(vals) => handleFilterChange('status', vals)}
            placeholder="Filter by status..."
            className="w-full h-10"
          />
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-3 pt-4 border-t mt-4 bg-background/95 backdrop-blur">
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
