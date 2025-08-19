import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleOption = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onSelectionChange(newValues);
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
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "justify-between text-left font-normal min-w-[200px]",
            selectedValues.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[300px] p-0 bg-popover" 
        align="start"
        sideOffset={5}
        style={{ 
          zIndex: 99999,
          position: 'relative'
        }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <div className="p-3 space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>

          {/* Selection count */}
          {selectedValues.length > 0 && (
            <div className="text-sm text-muted-foreground px-1">
              {selectedValues.length} selected
            </div>
          )}

          {/* Options list */}
          <div 
            className="max-h-[40vh] md:max-h-[300px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            style={{ position: 'relative', zIndex: 1 }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-2 text-center text-sm text-muted-foreground">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer select-none"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleOption(option.value);
                  }}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      onCheckedChange={() => {}}
                      aria-label={option.label}
                      className="pointer-events-none"
                    />
                  </div>
                  <span className="text-sm flex-1 select-none">
                    {option.label}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}