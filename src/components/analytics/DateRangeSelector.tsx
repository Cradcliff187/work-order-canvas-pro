import React from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRangeSelectorProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

const PRESET_RANGES = [
  {
    label: 'Last 7 days',
    value: 'last-7-days',
    getRange: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: 'Last 30 days',
    value: 'last-30-days',
    getRange: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: 'Last 90 days',
    value: 'last-90-days',
    getRange: () => ({
      from: subDays(new Date(), 89),
      to: new Date(),
    }),
  },
  {
    label: 'This month',
    value: 'this-month',
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: 'This year',
    value: 'this-year',
    getRange: () => ({
      from: startOfYear(new Date()),
      to: new Date(),
    }),
  },
];

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  dateRange,
  onDateRangeChange,
  className,
}) => {
  const [selectedPreset, setSelectedPreset] = React.useState<string>('last-30-days');

  React.useEffect(() => {
    // Set initial range to last 30 days
    if (!dateRange) {
      const defaultRange = PRESET_RANGES.find(p => p.value === 'last-30-days')?.getRange();
      if (defaultRange) {
        onDateRangeChange(defaultRange);
      }
    }
  }, [dateRange, onDateRangeChange]);

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value === 'custom') {
      return; // Let user select custom range
    }
    
    const preset = PRESET_RANGES.find(p => p.value === value);
    if (preset) {
      onDateRangeChange(preset.getRange());
    }
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return 'Select date range';
    if (!range.to) return format(range.from, 'LLL dd, y');
    return `${format(range.from, 'LLL dd, y')} - ${format(range.to, 'LLL dd, y')}`;
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {PRESET_RANGES.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal min-w-60',
              !dateRange && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(dateRange)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={(range) => {
              onDateRangeChange(range);
              if (range?.from && range?.to) {
                setSelectedPreset('custom');
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};