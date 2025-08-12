
import React from 'react';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface InvoiceDatesFieldsProps {
  invoiceDate: Date | null;
  dueDate: Date | null;
  onChangeInvoiceDate: (date: Date) => void;
  onChangeDueDate: (date: Date) => void;
  error?: string | null;
  className?: string;
}

export function InvoiceDatesFields({
  invoiceDate,
  dueDate,
  onChangeInvoiceDate,
  onChangeDueDate,
  error,
  className,
}: InvoiceDatesFieldsProps) {
  const handleInvoiceDateSelect = (date?: Date) => {
    if (!date) return;
    onChangeInvoiceDate(date);
    // If due date is before the new invoice date, auto-adjust to +30 days
    if (!dueDate || isBefore(dueDate, date)) {
      onChangeDueDate(addDays(date, 30));
    }
  };

  const handleDueDateSelect = (date?: Date) => {
    if (!date || !invoiceDate) return;
    // Ensure due date is not before invoice date
    if (isBefore(date, invoiceDate)) {
      onChangeDueDate(invoiceDate);
      return;
    }
    onChangeDueDate(date);
  };

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}>
      <div className="space-y-2">
        <Label>Invoice Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !invoiceDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {invoiceDate ? format(invoiceDate, 'MMM d, yyyy') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={invoiceDate ?? undefined}
              onSelect={handleInvoiceDateSelect}
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
              disabled={(date) => invoiceDate ? isBefore(date, invoiceDate) : false}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">Must be on or after invoice date</p>
        {!!error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

