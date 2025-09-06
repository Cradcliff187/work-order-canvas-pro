import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Edit, AlertTriangle, Save, X } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type PartnerInvoice = Database['public']['Tables']['partner_invoices']['Row'] & {
  partner_organization: { name: string } | null;
};

const bulkEditSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  due_date: z.string().optional(),
});

type BulkEditFormData = z.infer<typeof bulkEditSchema>;

interface PartnerInvoiceBulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: PartnerInvoice[];
  onSave: (changes: BulkEditFormData) => Promise<void>;
}

export function PartnerInvoiceBulkEditModal({ isOpen, onClose, invoices, onSave }: PartnerInvoiceBulkEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [conflictAnalysis, setConflictAnalysis] = useState<Record<string, boolean>>({});

  const form = useForm<BulkEditFormData>({
    resolver: zodResolver(bulkEditSchema),
    defaultValues: {
      status: undefined,
      due_date: undefined,
    },
  });

  // Analyze conflicts when invoices change
  useEffect(() => {
    if (invoices.length === 0) return;

    const conflicts: Record<string, boolean> = {};
    
    // Check for conflicts in each field
    const statuses = [...new Set(invoices.map(inv => inv.status))];
    const dueDates = [...new Set(invoices.map(inv => inv.due_date))];

    conflicts.status = statuses.length > 1;
    conflicts.due_date = dueDates.length > 1;

    setConflictAnalysis(conflicts);

    // Reset form when invoices change
    form.reset({
      status: undefined,
      due_date: undefined,
    });
  }, [invoices, form]);

  const handleSave = async (data: BulkEditFormData) => {
    setIsLoading(true);
    try {
      // Filter out undefined values
      const changes = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined && value !== '')
      ) as BulkEditFormData;
      
      await onSave(changes);
      onClose();
    } catch (error) {
      console.error('Bulk edit failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConflictMessage = (field: string) => {
    if (!conflictAnalysis[field]) return null;
    
    const fieldLabels: Record<string, string> = {
      status: 'Status',
      due_date: 'Due Date',
    };
    
    return `Multiple ${fieldLabels[field] || field} values detected in selection`;
  };

  const getCurrentValue = (field: keyof PartnerInvoice) => {
    if (invoices.length === 0) return 'N/A';
    
    const values = [...new Set(invoices.map(inv => {
      const value = inv[field];
      if (value === null || value === undefined) return 'Not set';
      if (typeof value === 'string' && value.trim() === '') return 'Empty';
      return String(value);
    }))];
    
    if (values.length === 1) return values[0];
    return `${values.length} different values`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto" aria-describedby="bulk-edit-description">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Bulk Edit Invoices
          </SheetTitle>
          <SheetDescription id="bulk-edit-description">
            Edit multiple invoices at once. Only fields you change will be updated.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Selection Summary */}
          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-medium text-sm">Selection Summary</h3>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary">{invoices.length} invoices selected</Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Current Status: {getCurrentValue('status')}</div>
              <div>Current Due Date: {getCurrentValue('due_date')}</div>
            </div>
          </div>

          <Separator />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    {conflictAnalysis.status && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {getConflictMessage('status')}
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormControl>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status (no change)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Due Date */}
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    {conflictAnalysis.due_date && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {getConflictMessage('due_date')}
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormControl>
                      <Input
                        type="date"
                        placeholder="Select due date (no change)"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </form>
          </Form>
        </div>

        <SheetFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(handleSave)}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}