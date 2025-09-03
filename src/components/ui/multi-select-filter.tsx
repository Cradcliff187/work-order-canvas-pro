import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  options: Option[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  maxDisplayCount?: number;
  disabled?: boolean;
}

export function MultiSelectFilter({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select items",
  searchPlaceholder = "Search...",
  className,
  maxDisplayCount = 2,
  disabled = false,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile();

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleOption = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onSelectionChange(newValues);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    
    if (selectedValues.length <= maxDisplayCount) {
      const selectedLabels = selectedValues
        .map(value => options.find(opt => opt.value === value)?.label)
        .filter(Boolean);
      return selectedLabels.join(', ');
    }
    
    return `${selectedValues.length} selected`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-between text-left font-normal w-full",
            selectedValues.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[300px] p-0 z-[9999] bg-background border shadow-lg" 
        align="start"
        sideOffset={5}
        disablePortal={isMobile}
      >
          <div className="p-3 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Selection count - no individual clear button */}
            {selectedValues.length > 0 && (
              <div className="text-sm text-muted-foreground px-1">
                {selectedValues.length} selected
              </div>
            )}

            {/* Options list */}
            <div className="max-h-[40vh] md:max-h-[300px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {filteredOptions.length === 0 ? (
                <div className="py-2 text-center text-sm text-muted-foreground">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => handleToggleOption(option.value)}
                  >
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      onChange={() => handleToggleOption(option.value)}
                    />
                    <span className="text-sm">{option.label}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
    </Popover>
  );
}