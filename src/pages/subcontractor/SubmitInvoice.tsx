import React, { useState, useMemo, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSubcontractorWorkOrders } from '@/hooks/useSubcontractorWorkOrders';
import { useInvoiceSubmission } from '@/hooks/useInvoiceSubmission';
import { useInvoiceDrafts, type InvoiceDraftData } from '@/hooks/useInvoiceDrafts';
import { useInvoiceFileUpload } from '@/hooks/useInvoiceFileUpload';
import { Save, FileText, Trash2, Clock, TrendingUp } from 'lucide-react';
import { WorkOrderAmountCard } from '@/components/invoices/WorkOrderAmountCard';
import { InvoiceTotalSummary } from '@/components/invoices/InvoiceTotalSummary';
import { FileUpload } from '@/components/FileUpload';
import { OrganizationValidationAlert } from '@/components/OrganizationValidationAlert';

// Relaxed schema for drafts
const draftInvoiceSchema = z.object({
  external_invoice_number: z.string().optional(),
  work_orders: z.array(z.object({
    work_order_id: z.string(),
    amount: z.coerce.number().min(0, 'Amount cannot be negative'),
    selected: z.boolean(),
  })),
  notes: z.string().optional(),
});

// Strict schema for submission
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
  const invoiceDrafts = useInvoiceDrafts();
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [isSubmissionMode, setIsSubmissionMode] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { uploadProgress, isUploading } = useInvoiceFileUpload({
    maxFiles: 5,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(isSubmissionMode ? invoiceSchema : draftInvoiceSchema),
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
      } as { work_order_id: string; amount: number; selected: boolean }));
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

  // Calculate suggested total from work order reports
  const suggestedTotal = useMemo(() => {
    if (!workOrdersFormData) return 0;
    return workOrdersFormData
      .filter(wo => wo.selected)
      .reduce((sum, formWo) => {
        const workOrder = availableWorkOrders.find(wo => wo.id === formWo.work_order_id);
        const approvedReport = workOrder?.work_order_reports?.find(report => report.status === 'approved');
        return sum + (approvedReport?.invoice_amount || 0);
      }, 0);
  }, [workOrdersFormData, availableWorkOrders]);

  // Prepare selected work orders summary
  const selectedWorkOrdersSummary = useMemo(() => {
    if (!workOrdersFormData) return [];
    return workOrdersFormData
      .filter(wo => wo.selected)
      .map(formWo => {
        const workOrder = availableWorkOrders.find(wo => wo.id === formWo.work_order_id);
        return {
          id: formWo.work_order_id,
          work_order_number: workOrder?.work_order_number || 'Unknown',
          amount: formWo.amount || 0,
        };
      });
  }, [workOrdersFormData, availableWorkOrders]);

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

  // Auto-save effect
  useEffect(() => {
    const formData = form.getValues();
    const hasData = formData.external_invoice_number || 
                   formData.work_orders.some(wo => wo.selected) || 
                   formData.notes;
    
    if (hasData && !isSubmissionMode) {
      // Ensure all work orders have the required properties
      const validatedWorkOrders = formData.work_orders.map(wo => ({
        work_order_id: wo.work_order_id || '',
        amount: wo.amount || 0,
        selected: wo.selected || false,
      }));
      
      invoiceDrafts.autoSave(currentDraftId, {
        external_invoice_number: formData.external_invoice_number,
        total_amount: runningTotal,
        work_orders: validatedWorkOrders,
        notes: formData.notes,
      });
    }
  }, [form.watch(), currentDraftId, runningTotal, invoiceDrafts, isSubmissionMode]);

  const handleSaveDraft = async () => {
    const data = form.getValues();
    
    // Ensure all work orders have the required properties
    const validatedWorkOrders = data.work_orders.map(wo => ({
      work_order_id: wo.work_order_id || '',
      amount: wo.amount || 0,
      selected: wo.selected || false,
    }));
    
    const draftData: InvoiceDraftData = {
      external_invoice_number: data.external_invoice_number,
      total_amount: runningTotal,
      work_orders: validatedWorkOrders,
      notes: data.notes,
    };

    if (currentDraftId) {
      invoiceDrafts.updateDraft(currentDraftId, draftData);
    } else {
      invoiceDrafts.saveDraft(draftData);
    }
    setLastSavedAt(new Date());
  };

  const handleLoadDraft = (draft: any) => {
    form.setValue('external_invoice_number', draft.external_invoice_number || '');
    form.setValue('notes', draft.notes || '');
    
    // Load work order selections ensuring all required fields are present
    const draftWorkOrders = completedWorkOrdersForInvoicing.data?.map(wo => {
      const draftWo = draft.work_orders?.find((dwo: any) => dwo.work_order_id === wo.id);
      return {
        work_order_id: wo.id,
        amount: draftWo?.amount || 0,
        selected: !!draftWo,
      } as { work_order_id: string; amount: number; selected: boolean };
    }) || [];
    
    form.setValue('work_orders', draftWorkOrders);
    setCurrentDraftId(draft.id);
  };

  const handleDeleteDraft = (draftId: string) => {
    invoiceDrafts.deleteDraft(draftId);
    if (currentDraftId === draftId) {
      setCurrentDraftId(null);
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmissionMode(true);
    
    try {
      if (currentDraftId) {
        // Convert draft to submission
        await invoiceDrafts.convertDraftToSubmission(currentDraftId);
      } else {
        // Direct submission
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
          })),
          attachments: selectedFiles
        });
      }
      setSelectedFiles([]);
      navigate('/subcontractor/work-orders');
    } catch (error) {
      // Error is handled in the mutation
    } finally {
      setIsSubmissionMode(false);
    }
  };

  if (completedWorkOrdersForInvoicing.isLoading) {
    return <LoadingSpinner />;
  }

  const selectedCount = workOrdersFormData?.filter(wo => wo.selected).length || 0;

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      {/* Organization Validation Alert */}
      <OrganizationValidationAlert />

      {/* Draft Management Section */}
      {invoiceDrafts.drafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Draft Invoices ({invoiceDrafts.drafts.length})
            </CardTitle>
            <CardDescription>
              Load and continue working on saved drafts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {invoiceDrafts.drafts.map((draft) => (
                <div key={draft.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {draft.external_invoice_number || 'Untitled Draft'}
                      </span>
                      <Badge variant="secondary">Draft</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {draft.work_orders?.length || 0} work orders • 
                      Updated {format(new Date(draft.updated_at), 'PPp')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadDraft(draft)}
                      disabled={currentDraftId === draft.id}
                    >
                      {currentDraftId === draft.id ? 'Current' : 'Load'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteDraft(draft.id)}
                      disabled={invoiceDrafts.isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Submit Invoice
                {currentDraftId && <Badge variant="secondary">Editing Draft</Badge>}
              </CardTitle>
              <CardDescription>
                Create an invoice for one or more completed work orders
              </CardDescription>
            </div>
            {lastSavedAt && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last saved {format(lastSavedAt, 'HH:mm')}
              </div>
            )}
          </div>
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

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {availableWorkOrders.length === 0 && alreadyInvoicedWorkOrders.length === 0 && (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No completed work orders available for invoicing
                      </p>
                    </div>
                  )}

                  {/* Available work orders */}
                  {availableWorkOrders.map(workOrder => {
                    const formWorkOrder = workOrdersFormData?.find(wo => wo.work_order_id === workOrder.id);
                    const isSelected = formWorkOrder?.selected || false;
                    const amount = formWorkOrder?.amount || 0;

                    return (
                      <WorkOrderAmountCard
                        key={workOrder.id}
                        workOrder={workOrder}
                        isSelected={isSelected}
                        amount={amount}
                        onSelectionChange={(checked) => handleWorkOrderSelection(workOrder.id, checked)}
                        onAmountChange={(newAmount) => handleAmountChange(workOrder.id, newAmount)}
                        showWorkSummary={true}
                      />
                    );
                  })}

                  {/* Already invoiced work orders (disabled) */}
                  {alreadyInvoicedWorkOrders.map(workOrder => (
                    <Card key={workOrder.id} className="opacity-50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox checked={false} disabled className="mt-1" />
                          <div className="flex-1 space-y-1">
                            <div className="font-medium text-sm">{workOrder.work_order_number}</div>
                            <div className="text-sm">{workOrder.title}</div>
                            {workOrder.description && (
                              <div className="text-xs text-muted-foreground line-clamp-2">{workOrder.description}</div>
                            )}
                            <Badge variant="outline" className="text-xs w-fit">
                              Already invoiced
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <FormMessage>{form.formState.errors.work_orders?.message}</FormMessage>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes or comments about this invoice"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <InvoiceTotalSummary
                    selectedWorkOrders={selectedWorkOrdersSummary}
                    totalAmount={runningTotal}
                    suggestedTotal={suggestedTotal}
                  />
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Supporting Documents</CardTitle>
                  <CardDescription>
                    Upload invoice documents (PDF, Excel, Word, images) - Max 5 files, 10MB each
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload
                    onFilesSelected={setSelectedFiles}
                    maxFiles={5}
                    maxSizeBytes={10 * 1024 * 1024}
                    uploadProgress={uploadProgress}
                    disabled={invoiceSubmission.isSubmitting || isUploading || invoiceDrafts.isSaving}
                    acceptedTypes={['.pdf', '.xlsx', '.xls', '.csv', '.doc', '.docx', 'image/*']}
                  />
                </CardContent>
              </Card>

              <Separator />
              
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/subcontractor/work-orders')}
                  disabled={invoiceSubmission.isSubmitting || invoiceDrafts.isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={invoiceDrafts.isSaving || invoiceSubmission.isSubmitting}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {invoiceDrafts.isSaving ? 'Saving...' : 'Save as Draft'}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    invoiceSubmission.isSubmitting || 
                    invoiceDrafts.isSubmitting || 
                    selectedCount === 0 ||
                    invoiceDrafts.isSaving
                  }
                >
                  {(invoiceSubmission.isSubmitting || invoiceDrafts.isSubmitting) 
                    ? 'Submitting...' 
                    : `Submit Invoice (${selectedCount} orders)`}
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