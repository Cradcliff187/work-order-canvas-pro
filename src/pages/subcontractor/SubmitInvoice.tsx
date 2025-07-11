import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSubcontractorWorkOrders } from '@/hooks/useSubcontractorWorkOrders';
import { useInvoiceSubmission } from '@/hooks/useInvoiceSubmission';

const invoiceSchema = z.object({
  external_invoice_number: z.string().optional(),
  work_order_id: z.string().min(1, 'Please select a work order'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const SubmitInvoice = () => {
  const navigate = useNavigate();
  const { assignedWorkOrders } = useSubcontractorWorkOrders();
  const invoiceSubmission = useInvoiceSubmission();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      external_invoice_number: '',
      work_order_id: '',
      amount: 0,
      notes: '',
    },
  });

  // Filter completed work orders
  const completedWorkOrders = assignedWorkOrders.data?.filter(
    (wo) => wo.status === 'completed'
  ) || [];

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      await invoiceSubmission.mutateAsync({
        external_invoice_number: data.external_invoice_number,
        work_order_id: data.work_order_id,
        amount: data.amount,
        notes: data.notes
      });
      navigate('/subcontractor/work-orders');
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  if (assignedWorkOrders.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container max-w-2xl mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit Invoice</CardTitle>
          <CardDescription>
            Create an invoice for completed work orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Internal invoice number will be auto-generated upon submission
                </p>
              </div>

              <FormField
                control={form.control}
                name="external_invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Invoice Number (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your invoice number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="work_order_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completed Work Order</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a completed work order" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {completedWorkOrders.map((workOrder) => (
                          <SelectItem key={workOrder.id} value={workOrder.id}>
                            {workOrder.work_order_number} - {workOrder.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes or description"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/subcontractor/work-orders')}
                  disabled={invoiceSubmission.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={invoiceSubmission.isPending || completedWorkOrders.length === 0}
                >
                  {invoiceSubmission.isPending ? 'Submitting...' : 'Submit Invoice'}
                </Button>
              </div>

              {completedWorkOrders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  No completed work orders available for invoicing
                </p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubmitInvoice;