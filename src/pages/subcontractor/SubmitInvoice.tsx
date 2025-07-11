import React, { useState, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSubcontractorWorkOrders } from '@/hooks/useSubcontractorWorkOrders';
import { useInvoiceSubmission } from '@/hooks/useInvoiceSubmission';

const invoiceSchema = z.object({
  external_invoice_number: z.string().optional(),
  work_orders: z.array(z.object({
    work_order_id: z.string(),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
    selected: z.boolean(),
  })).refine(
    (workOrders) => workOrders.some(wo => wo.selected),
    { message: 'Select at least one work order' }
  ).refine(
    (workOrders) => workOrders.filter(wo => wo.selected).every(wo => wo.amount > 0),
    { message: 'All selected work orders must have an amount greater than 0' }
  ),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const SubmitInvoice = () => {
  const navigate = useNavigate();
  const { completedWorkOrdersForInvoicing } = useSubcontractorWorkOrders();
  const invoiceSubmission = useInvoiceSubmission();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      external_invoice_number: '',
      work_orders: [],
      notes: '',
    },
  });

  // Initialize form when work orders load
  React.useEffect(() => {
    if (completedWorkOrdersForInvoicing.data) {
      const workOrdersFormData = completedWorkOrdersForInvoicing.data.map(wo => ({
        work_order_id: wo.id,
        amount: 0,
        selected: false,
      }));
      form.setValue('work_orders', workOrdersFormData);
    }
  }, [completedWorkOrdersForInvoicing.data, form]);

  const workOrdersFormData = useWatch({
    control: form.control,
    name: 'work_orders',
  });

  // Calculate running total
  const runningTotal = useMemo(() => {
    if (!workOrdersFormData) return 0;
    return workOrdersFormData
      .filter(wo => wo.selected)
      .reduce((sum, wo) => sum + (wo.amount || 0), 0);
  }, [workOrdersFormData]);

  // Get work orders that are available for invoicing (not already invoiced)
  const availableWorkOrders = useMemo(() => {
    return completedWorkOrdersForInvoicing.data?.filter(
      wo => !wo.invoice_work_orders || wo.invoice_work_orders.length === 0
    ) || [];
  }, [completedWorkOrdersForInvoicing.data]);

  // Get work orders that are already invoiced
  const alreadyInvoicedWorkOrders = useMemo(() => {
    return completedWorkOrdersForInvoicing.data?.filter(
      wo => wo.invoice_work_orders && wo.invoice_work_orders.length > 0
    ) || [];
  }, [completedWorkOrdersForInvoicing.data]);

  const handleSelectAll = () => {
    const newWorkOrders = workOrdersFormData?.map(wo => {
      const isAvailable = availableWorkOrders.some(available => available.id === wo.work_order_id);
      return {
        ...wo,
        selected: isAvailable ? true : wo.selected,
      };
    }) || [];
    form.setValue('work_orders', newWorkOrders);
  };

  const handleDeselectAll = () => {
    const newWorkOrders = workOrdersFormData?.map(wo => ({
      ...wo,
      selected: false,
    })) || [];
    form.setValue('work_orders', newWorkOrders);
  };

  const handleWorkOrderSelection = (workOrderId: string, checked: boolean) => {
    const newWorkOrders = workOrdersFormData?.map(wo => 
      wo.work_order_id === workOrderId ? { ...wo, selected: checked } : wo
    ) || [];
    form.setValue('work_orders', newWorkOrders);
  };

  const handleAmountChange = (workOrderId: string, amount: number) => {
    const newWorkOrders = workOrdersFormData?.map(wo => 
      wo.work_order_id === workOrderId ? { ...wo, amount } : wo
    ) || [];
    form.setValue('work_orders', newWorkOrders);
  };

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      const selectedWorkOrders = data.work_orders
        .filter(wo => wo.selected)
        .map(wo => ({
          work_order_id: wo.work_order_id,
          amount: wo.amount,
        }));

      const totalAmount = selectedWorkOrders.reduce((sum, wo) => sum + wo.amount, 0);
      
      await invoiceSubmission.submitInvoiceAsync({
        externalInvoiceNumber: data.external_invoice_number,
        totalAmount,
        workOrders: selectedWorkOrders.map(wo => ({
          workOrderId: wo.work_order_id,
          amount: wo.amount,
          description: data.notes
        }))
      });
      navigate('/subcontractor/work-orders');
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  if (completedWorkOrdersForInvoicing.isLoading) {
    return <LoadingSpinner />;
  }

  const selectedCount = workOrdersFormData?.filter(wo => wo.selected).length || 0;

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit Invoice</CardTitle>
          <CardDescription>
            Create an invoice for one or more completed work orders
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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base">Select Work Orders</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={availableWorkOrders.length === 0}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                  {availableWorkOrders.length === 0 && alreadyInvoicedWorkOrders.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No completed work orders available for invoicing
                    </p>
                  )}

                  {/* Available work orders */}
                  {availableWorkOrders.map(workOrder => {
                    const formWorkOrder = workOrdersFormData?.find(wo => wo.work_order_id === workOrder.id);
                    const isSelected = formWorkOrder?.selected || false;

                    return (
                      <div key={workOrder.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleWorkOrderSelection(workOrder.id, checked === true)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="font-medium">{workOrder.work_order_number}</div>
                            <div className="text-sm">{workOrder.title}</div>
                            {workOrder.description && (
                              <div className="text-sm text-muted-foreground">{workOrder.description}</div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Completed: {workOrder.completed_at ? format(new Date(workOrder.completed_at), 'PPP') : 'N/A'}
                            </div>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="ml-6">
                            <FormLabel className="text-sm">Amount</FormLabel>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="0.00"
                              value={formWorkOrder?.amount || ''}
                              onChange={(e) => handleAmountChange(workOrder.id, parseFloat(e.target.value) || 0)}
                              className="w-32"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Already invoiced work orders (disabled) */}
                  {alreadyInvoicedWorkOrders.map(workOrder => (
                    <div key={workOrder.id} className="border rounded-lg p-4 space-y-3 opacity-50">
                      <div className="flex items-start gap-3">
                        <Checkbox checked={false} disabled className="mt-1" />
                        <div className="flex-1 space-y-1">
                          <div className="font-medium">{workOrder.work_order_number}</div>
                          <div className="text-sm">{workOrder.title}</div>
                          {workOrder.description && (
                            <div className="text-sm text-muted-foreground">{workOrder.description}</div>
                          )}
                          <div className="text-xs text-orange-600">
                            Already invoiced
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedCount > 0 && (
                  <div className="bg-accent p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Selected work orders: {selectedCount}</span>
                      <span className="text-lg font-bold">
                        Total: ${runningTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <FormMessage>{form.formState.errors.work_orders?.message}</FormMessage>
              </div>

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
                  disabled={invoiceSubmission.isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={invoiceSubmission.isSubmitting || selectedCount === 0}
                >
                  {invoiceSubmission.isSubmitting ? 'Submitting...' : `Submit Invoice (${selectedCount} orders)`}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubmitInvoice;