
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { UniversalUploadSheet } from '@/components/upload/UniversalUploadSheet';
import { Upload, ArrowLeft, FileText, Loader2, Save, Building2, Info } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useInvoiceSubmission } from '@/hooks/useInvoiceSubmission';
import { WorkOrderAmountCard } from '@/components/invoices/WorkOrderAmountCard';
import { InvoiceTotalSummary } from '@/components/invoices/InvoiceTotalSummary';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { InvoiceDatesFields } from '@/components/invoices/InvoiceDatesFields';
import { addDays, isBefore, format as formatDate } from 'date-fns';

interface InvoiceFormData {
  externalInvoiceNumber: string;
  adminNotes: string;
  selectedWorkOrders: Record<string, number>; // workOrderId -> amount
  selectedOrganizationId?: string; // For admin submissions

  // New fields
  invoiceDate: Date | null;
  dueDate: Date | null;
  paymentTerms: string;
  purchaseOrderNumber: string;
  subcontractorNotes: string;
}

export default function SubmitInvoice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userOrganizations } = useAuth();
  const { isAdmin, profile } = useUserProfile();
  const { submitInvoice, isSubmitting } = useInvoiceSubmission();

  const [formData, setFormData] = useState<InvoiceFormData>({
    externalInvoiceNumber: '',
    adminNotes: '',
    selectedWorkOrders: {},
    selectedOrganizationId: undefined,
    invoiceDate: new Date(),
    dueDate: addDays(new Date(), 30),
    paymentTerms: 'Net 30',
    purchaseOrderNumber: '',
    subcontractorNotes: '',
  });

  const [dateError, setDateError] = useState<string | null>(null);

  const isAdminMode = isAdmin();
  
  // Get organization IDs for the query - either selected org (admin) or user's orgs (subcontractor)
  const organizationIds = React.useMemo(() => {
    if (isAdminMode && formData.selectedOrganizationId) {
      return [formData.selectedOrganizationId];
    }
    return userOrganizations?.map(org => org.organization_id) || [];
  }, [userOrganizations, isAdminMode, formData.selectedOrganizationId]);

  // Fetch completed work orders for invoicing
  const completedWorkOrdersForInvoicing = useQuery({
    queryKey: ['completed-work-orders-for-invoicing', organizationIds],
    queryFn: async () => {
      if (organizationIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          invoice_work_orders (id)
        `)
        .in('assigned_organization_id', organizationIds)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: organizationIds.length > 0,
    staleTime: 30 * 1000,
  });
  
  const [files, setFiles] = useState<File[]>([]);
  
  // Get selected organization details for display
  const { data: selectedOrganization } = useQuery({
    queryKey: ['organization', formData.selectedOrganizationId],
    queryFn: async () => {
      if (!formData.selectedOrganizationId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, organization_type')
        .eq('id', formData.selectedOrganizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!formData.selectedOrganizationId,
  });

  // Load saved form data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('invoiceFormData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData({
          ...parsed,
          invoiceDate: parsed.invoiceDate ? new Date(parsed.invoiceDate) : new Date(),
          dueDate: parsed.dueDate ? new Date(parsed.dueDate) : addDays(new Date(), 30),
        });
      } catch (error) {
        console.error('Failed to parse saved form data:', error);
      }
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    const toSave = {
      ...formData,
      invoiceDate: formData.invoiceDate ? formatDate(formData.invoiceDate, 'yyyy-MM-dd') : null,
      dueDate: formData.dueDate ? formatDate(formData.dueDate, 'yyyy-MM-dd') : null,
    };
    localStorage.setItem('invoiceFormData', JSON.stringify(toSave));
  }, [formData]);

  const workOrders = completedWorkOrdersForInvoicing?.data || [];
  const availableWorkOrders = workOrders.filter(wo => 
    !wo.invoice_work_orders || wo.invoice_work_orders.length === 0
  );

  const selectedWorkOrderIds = Object.keys(formData.selectedWorkOrders);
  const selectedWorkOrderSummary = selectedWorkOrderIds.map(id => {
    const workOrder = availableWorkOrders.find(wo => wo.id === id);
    return {
      id,
      work_order_number: workOrder?.work_order_number || '',
      amount: formData.selectedWorkOrders[id] || 0,
    };
  });
  
  const totalAmount = Object.values(formData.selectedWorkOrders).reduce((sum, amount) => sum + amount, 0);

  const handleWorkOrderSelection = (workOrderId: string, isSelected: boolean) => {
    setFormData(prev => {
      const newSelectedWorkOrders = { ...prev.selectedWorkOrders };
      if (isSelected) {
        newSelectedWorkOrders[workOrderId] = 0; // Start with 0, user will enter amount
      } else {
        delete newSelectedWorkOrders[workOrderId];
      }
      return { ...prev, selectedWorkOrders: newSelectedWorkOrders };
    });
  };

  const handleWorkOrderAmountChange = (workOrderId: string, amount: number) => {
    setFormData(prev => ({
      ...prev,
      selectedWorkOrders: {
        ...prev.selectedWorkOrders,
        [workOrderId]: amount,
      },
    }));
  };

  const validateDates = () => {
    if (!formData.invoiceDate || !formData.dueDate) {
      setDateError('Both dates are required.');
      return false;
    }
    if (isBefore(formData.dueDate, formData.invoiceDate)) {
      setDateError('Due date must be on or after the invoice date.');
      return false;
    }
    setDateError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (selectedWorkOrderIds.length === 0) {
      toast({
        title: "No work orders selected",
        description: "Please select at least one work order to invoice.",
        variant: "destructive",
      });
      return;
    }

    if (Object.values(formData.selectedWorkOrders).some(amount => amount <= 0)) {
      toast({
        title: "Invalid amounts",
        description: "All selected work orders must have an amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (!validateDates()) {
      toast({
        title: "Invalid dates",
        description: dateError || "Please fix the date selections.",
        variant: "destructive",
      });
      return;
    }

    try {
      const workOrdersData = selectedWorkOrderIds.map(workOrderId => ({
        workOrderId,
        amount: formData.selectedWorkOrders[workOrderId],
      }));

      await submitInvoice({
        externalInvoiceNumber: formData.externalInvoiceNumber || undefined,
        totalAmount,
        workOrders: workOrdersData,
        attachments: files.length > 0 ? files : undefined,
        organizationId: isAdminMode ? formData.selectedOrganizationId : undefined,
        createdByAdminId: isAdminMode ? profile?.id : undefined,
        adminNotes: isAdminMode && formData.adminNotes ? formData.adminNotes : undefined,

        // New fields
        invoiceDate: formData.invoiceDate!,
        dueDate: formData.dueDate!,
        paymentTerms: formData.paymentTerms || 'Net 30',
        purchaseOrderNumber: formData.purchaseOrderNumber || undefined,
        subcontractorNotes: formData.subcontractorNotes || undefined,
      });
      
      // Clear saved form data
      localStorage.removeItem('invoiceFormData');
      
      navigate(isAdminMode ? '/admin/invoices' : '/subcontractor/invoices');
    } catch (error: any) {
      toast({
        title: "Error submitting invoice",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveDraft = () => {
    // Form data is already being saved to localStorage
    toast({
      title: "Draft saved!",
      description: "Your progress has been saved locally.",
    });
  };

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
  }, []);

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={isAdminMode ? "/admin/invoices" : "/subcontractor/invoices"}>
            <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Submit Invoice</h1>
            <p className="text-muted-foreground">
              {isAdminMode ? "Submit invoice on behalf of subcontractor" : "Submit your invoice for completed work"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <StandardFormLayout>
          {isAdminMode && (
            <StandardFormLayout.Section 
              title="Select Organization"
              description="Choose the subcontractor organization for this invoice"
            >
              <StandardFormLayout.FieldGroup>
                <div className="space-y-2">
                  <Label>Subcontractor Organization</Label>
                  <OrganizationSelector
                    value={formData.selectedOrganizationId}
                    onChange={(orgId) => setFormData(prev => ({ 
                      ...prev, 
                      selectedOrganizationId: orgId,
                      selectedWorkOrders: {} // Reset work orders when org changes
                    }))}
                    organizationType="subcontractor"
                    placeholder="Select subcontractor organization..."
                  />
                </div>
                {selectedOrganization && (
                  <Alert className="border-l-4 border-l-primary bg-primary/5 transition-all duration-200">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary">Admin Mode</AlertTitle>
                    <AlertDescription className="text-primary/80">
                      Submitting invoice on behalf of: <strong className="text-primary">{selectedOrganization.name}</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </StandardFormLayout.FieldGroup>
            </StandardFormLayout.Section>
          )}

          <StandardFormLayout.Section 
            title="Invoice Details"
            description="Enter your external invoice number and related identifiers (optional)"
          >
            <StandardFormLayout.FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="externalInvoiceNumber">External Invoice Number</Label>
                  <Input
                    id="externalInvoiceNumber"
                    placeholder="INV-2024-001"
                    value={formData.externalInvoiceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, externalInvoiceNumber: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Your own invoice number for reference
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchaseOrderNumber">Purchase Order Number</Label>
                  <Input
                    id="purchaseOrderNumber"
                    placeholder="PO-123456"
                    value={formData.purchaseOrderNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchaseOrderNumber: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Provide a PO number if applicable
                  </p>
                </div>
              </div>

              <InvoiceDatesFields
                invoiceDate={formData.invoiceDate}
                dueDate={formData.dueDate}
                onChangeInvoiceDate={(d) => setFormData(prev => ({ ...prev, invoiceDate: d, dueDate: prev.dueDate && isBefore(prev.dueDate, d) ? addDays(d, 30) : prev.dueDate }))}
                onChangeDueDate={(d) => setFormData(prev => ({ ...prev, dueDate: d }))}
                error={dateError}
                className="mt-2"
              />

              {isAdminMode && (
                <div className="space-y-2">
                  <Label htmlFor="adminNotes">Admin Notes</Label>
                  <Textarea
                    id="adminNotes"
                    placeholder="Document why this invoice was entered manually by admin..."
                    value={formData.adminNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminNotes: e.target.value }))}
                    className="min-h-[100px] transition-all duration-200"
                  />
                  <p className="text-xs text-muted-foreground">
                    These notes will help track why this invoice was entered manually and any special circumstances.
                  </p>
                </div>
              )}
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          <StandardFormLayout.Section 
            title="Notes & Terms"
            description="Optional notes and payment terms"
          >
            <StandardFormLayout.FieldGroup>
              <div className="space-y-2">
                <Label htmlFor="subcontractorNotes">Subcontractor Notes</Label>
                <Textarea
                  id="subcontractorNotes"
                  placeholder="Add any relevant notes for the admin to review..."
                  value={formData.subcontractorNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, subcontractorNotes: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  placeholder="Net 30"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to "Net 30". Adjust if different terms apply.
                </p>
              </div>
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          <StandardFormLayout.Section 
            title="Select Work Orders"
            description="Choose completed work orders to include in this invoice"
          >
            <StandardFormLayout.FieldGroup>
              {isAdminMode && !formData.selectedOrganizationId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Please select a subcontractor organization first</p>
                </div>
              ) : completedWorkOrdersForInvoicing?.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : availableWorkOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed work orders available for invoicing</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableWorkOrders.map((workOrder) => (
                    <WorkOrderAmountCard
                      key={workOrder.id}
                      workOrder={workOrder}
                      isSelected={workOrder.id in formData.selectedWorkOrders}
                      amount={formData.selectedWorkOrders[workOrder.id] || 0}
                      onSelectionChange={(checked) => handleWorkOrderSelection(workOrder.id, checked)}
                      onAmountChange={(amount) => handleWorkOrderAmountChange(workOrder.id, amount)}
                    />
                  ))}
                </div>
              )}
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          {selectedWorkOrderIds.length > 0 && (
            <StandardFormLayout.Section 
              title="Invoice Summary"
              description="Review your invoice totals"
            >
              <StandardFormLayout.FieldGroup>
                <InvoiceTotalSummary
                  selectedWorkOrders={selectedWorkOrderSummary}
                  totalAmount={totalAmount}
                />
              </StandardFormLayout.FieldGroup>
            </StandardFormLayout.Section>
          )}

          <StandardFormLayout.Section 
            title="Supporting Documents"
            description="Upload invoice documents and supporting files (optional)"
          >
            <StandardFormLayout.FieldGroup>
              <div className="space-y-2">
                <Label>Upload Documents</Label>
                <UniversalUploadSheet
                  trigger={
                    <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors border-muted-foreground/25 hover:border-muted-foreground/50">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to select documents
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, PNG, JPG up to 10MB each
                      </p>
                    </div>
                  }
                  onFilesSelected={handleFilesSelected}
                  accept="image/*,application/pdf"
                  multiple={true}
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(file)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          <StandardFormLayout.Actions>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className="min-h-[44px]"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || selectedWorkOrderIds.length === 0 || (isAdminMode && !formData.selectedOrganizationId)}
              className="min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Submit Invoice ({selectedWorkOrderIds.length} work order{selectedWorkOrderIds.length !== 1 ? 's' : ''})
                </>
              )}
            </Button>
          </StandardFormLayout.Actions>
        </StandardFormLayout>
      </form>
    </div>
  );
}

