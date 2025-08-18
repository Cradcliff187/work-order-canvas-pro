import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { 
  Building2, 
  DollarSign, 
  Calendar, 
  FileText, 
  PenTool 
} from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { FieldGroup } from './FieldGroup';
import { getFieldConfidence } from '@/utils/confidence-display';
import type { ConfidenceValues } from '@/utils/confidence-display';

// Quick amount constants
const QUICK_AMOUNTS = [5, 10, 25, 50, 100, 200];

interface SmartReceiptFormData {
  vendor_name: string;
  amount: number;
  receipt_date: string;
  description?: string;
  notes?: string;
  work_order_id?: string;
}

interface ReceiptFormFieldsProps {
  form: UseFormReturn<SmartReceiptFormData>;
  ocrConfidence?: ConfidenceValues;
  isMobile: boolean;
}

export const ReceiptFormFields: React.FC<ReceiptFormFieldsProps> = ({
  form,
  ocrConfidence,
  isMobile,
}) => {
  return (
    <>
      {/* Main Receipt Details */}
      <FieldGroup
        title="Receipt Details"
        icon={<FileText className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vendor Name Field */}
          <FormField
            control={form.control}
            name="vendor_name"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Vendor Name
                  <ConfidenceBadge 
                    confidence={getFieldConfidence(ocrConfidence, 'vendor_name') || 0}
                  />
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter vendor name..."
                    className="font-medium"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Amount Field */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Amount
                  <ConfidenceBadge 
                    confidence={getFieldConfidence(ocrConfidence, 'amount') || 0}
                  />
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-8 font-mono text-lg"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </FormControl>
                <FormMessage />
                
                {/* Quick amount buttons for mobile */}
                {isMobile && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {QUICK_AMOUNTS.map(amount => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => form.setValue('amount', amount, { shouldValidate: true })}
                        className="text-xs"
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                )}
              </FormItem>
            )}
          />
        </div>

        {/* Receipt Date Field - Full width */}
        <FormField
          control={form.control}
          name="receipt_date"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Receipt Date
                <ConfidenceBadge 
                  confidence={getFieldConfidence(ocrConfidence, 'receipt_date') || 0}
                />
              </FormLabel>
              <FormControl>
                <Input
                  type="date"
                  className="font-mono"
                  max={format(new Date(), "yyyy-MM-dd")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Optional Description Field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description (Optional)
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of purchase..."
                  className="min-h-[80px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FieldGroup>

      {/* Additional Details */}
      <FieldGroup
        title="Additional Details"
        icon={<PenTool className="h-4 w-4" />}
        badge={form.watch('notes') && (
          <Badge variant="secondary" className="ml-2">
            Notes added
          </Badge>
        )}
      >
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes about this receipt..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FieldGroup>
    </>
  );
};