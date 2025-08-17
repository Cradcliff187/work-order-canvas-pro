import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartInputProps {
  value: string | number | Date;
  onChange: (value: any) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  type: 'text' | 'currency' | 'date' | 'number';
  placeholder?: string;
  suggestions?: string[];
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

export const SmartInput: React.FC<SmartInputProps> = ({
  value,
  onChange,
  onBlur,
  onKeyDown,
  type,
  placeholder,
  suggestions = [],
  className,
  autoFocus = false,
  disabled = false
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (type === 'text' && suggestions.length > 0) {
      const currentValue = value?.toString().toLowerCase() || '';
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(currentValue)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0 && currentValue.length > 0);
    }
  }, [value, suggestions, type]);

  const formatCurrency = (val: string) => {
    const numericValue = val.replace(/[^\d.]/g, '');
    const parsedValue = parseFloat(numericValue);
    return isNaN(parsedValue) ? 0 : parsedValue;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    switch (type) {
      case 'currency':
        const formatted = formatCurrency(inputValue);
        onChange(formatted);
        break;
      case 'number':
        const numValue = parseFloat(inputValue) || 0;
        onChange(numValue);
        break;
      default:
        onChange(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          );
          break;
        case 'Enter':
          if (selectedSuggestionIndex >= 0) {
            e.preventDefault();
            onChange(filteredSuggestions[selectedSuggestionIndex]);
            setShowSuggestions(false);
            setSelectedSuggestionIndex(-1);
            return;
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
      }
    }
    
    onKeyDown?.(e);
  };

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const displayValue = () => {
    switch (type) {
      case 'currency':
        return typeof value === 'number' ? value.toFixed(2) : '0.00';
      case 'date':
        return value instanceof Date ? format(value, 'yyyy-MM-dd') : '';
      default:
        return value?.toString() || '';
    }
  };

  if (type === 'date') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value instanceof Date ? format(value, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value instanceof Date ? value : undefined}
            onSelect={(date) => {
              if (date) onChange(date);
            }}
            className="pointer-events-auto"
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        {type === 'currency' && (
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          value={displayValue()}
          onChange={handleInputChange}
          onBlur={() => {
            setShowSuggestions(false);
            onBlur?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            type === 'currency' && "pl-9",
            className
          )}
          disabled={disabled}
          type={type === 'number' ? 'number' : 'text'}
          step={type === 'number' ? 'any' : undefined}
        />
      </div>

      {/* Quick Amount Buttons for Currency */}
      {type === 'currency' && (
        <div className="flex flex-wrap gap-1 mt-2">
          {QUICK_AMOUNTS.map(amount => (
            <Button
              key={amount}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onChange(amount)}
            >
              ${amount}
            </Button>
          ))}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                index === selectedSuggestionIndex && "bg-accent text-accent-foreground"
              )}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setSelectedSuggestionIndex(index)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};