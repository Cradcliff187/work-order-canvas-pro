import React from 'react';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface BillDatesFieldsProps {
  billDate: Date | null;
  dueDate: Date | null;
  onChangeBillDate: (date: Date) => void;
  onChangeDueDate: (date: Date) => void;
  error?: string | null;
  className?: string;
}

export function BillDatesFields({
  billDate,
  dueDate,
  onChangeBillDate,
  onChangeDueDate,
  error,
  className,
}: BillDatesFieldsProps) {
  const handleBillDateSelect = (date?: Date) => {
    if (!date) return;
    onChangeBillDate(date);
    // If due date is before the new bill date, auto-adjust to +30 days
    if (!dueDate || isBefore(dueDate, date)) {
      onChangeDueDate(addDays(date, 30));
    }
  };

  const handleDueDateSelect = (date?: Date) => {
    if (!date || !billDate) return;
    // Ensure due date is not before bill date
    if (isBefore(date, billDate)) {
      onChangeDueDate(billDate);
      return;
    }
    onChangeDueDate(date);
  };

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}>
      <div className="space-y-2">
        <Label>Bill Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !billDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {billDate ? format(billDate, 'MMM d, yyyy') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={billDate ?? undefined}
              onSelect={handleBillDateSelect}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">Defaults to today</p>
      </div>

      <div className="space-y-2">
        <Label>Due Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, 'MMM d, yyyy') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate ?? undefined}
              onSelect={handleDueDateSelect}
              disabled={(date) => billDate ? isBefore(date, billDate) : false}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">Must be on or after bill date</p>
        {!!error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}