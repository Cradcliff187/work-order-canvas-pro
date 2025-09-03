
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { UniversalUploadSheet } from '@/components/upload/UniversalUploadSheet';
import { Upload, ArrowLeft, FileText, Loader2, Save, Building2, Info, DollarSign, Paperclip } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubcontractorBillSubmission } from '@/hooks/useSubcontractorBillSubmission';
import { WorkOrderAmountCard } from '@/components/subcontractor-bills/WorkOrderAmountCard';
import { BillTotalSummary } from '@/components/subcontractor-bills/BillTotalSummary';
import { PreSubmissionSummaryCard } from '@/components/subcontractor-bills/PreSubmissionSummaryCard';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { BillDatesFields } from '@/components/subcontractor-bills/BillDatesFields';
import { validateReportBeforeInvoice } from '@/lib/validations/estimate-validations';
import { addDays, isBefore, format as formatDate } from 'date-fns';

interface BillFormData {
  externalInvoiceNumber: string;
  adminNotes: string;
  selectedWorkOrders: Record<string, number>; // workOrderId -> amount
  selectedOrganizationId?: string; // For admin submissions

  // New fields
  billDate: Date | null;
  dueDate: Date | null;
  paymentTerms: string;
  purchaseOrderNumber: string;
  subcontractorNotes: string;
}

export default function SubmitBill() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userOrganizations } = useAuth();
  const { isAdmin, profile } = useUserProfile();
  const { submitSubcontractorBill, isSubmitting } = useSubcontractorBillSubmission();

  const [formData, setFormData] = useState<BillFormData>({
    externalInvoiceNumber: '',
    adminNotes: '',
    selectedWorkOrders: {},
    selectedOrganizationId: undefined,
    billDate: new Date(),
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

  // Fetch completed work orders for billing
  const completedWorkOrdersForBilling = useQuery({
    queryKey: ['completed-work-orders-for-billing', organizationIds],
    queryFn: async () => {
      if (organizationIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          subcontractor_bill_work_orders (id),
          work_order_reports!inner (
            id,
            status
          )
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
    const savedData = localStorage.getItem('billFormData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData({
          ...parsed,
          billDate: parsed.billDate ? new Date(parsed.billDate) : new Date(),
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
      billDate: formData.billDate ? formatDate(formData.billDate, 'yyyy-MM-dd') : null,
      dueDate: formData.dueDate ? formatDate(formData.dueDate, 'yyyy-MM-dd') : null,
    };
    localStorage.setItem('billFormData', JSON.stringify(toSave));
  }, [formData]);

  const workOrders = completedWorkOrdersForBilling?.data || [];
  const availableWorkOrders = workOrders.filter(wo => 
    !wo.subcontractor_bill_work_orders || wo.subcontractor_bill_work_orders.length === 0
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
    if (!formData.billDate || !formData.dueDate) {
      setDateError('Both dates are required.');
      return false;
    }
    if (isBefore(formData.dueDate, formData.billDate)) {
      setDateError('Due date must be on or after the bill date.');
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
        description: "Please select at least one work order to bill.",
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

    // Validate that all selected work orders have approved reports
    const selectedWorkOrders = availableWorkOrders.filter(wo => selectedWorkOrderIds.includes(wo.id));
    const problematicWorkOrders = selectedWorkOrders.filter(wo => {
      const reports = wo.work_order_reports || [];
      return reports.length === 0 || reports.some(report => report.status !== 'approved');
    });
    
    if (problematicWorkOrders.length > 0) {
      const workOrderNumbers = problematicWorkOrders.map(wo => wo.work_order_number).join(', ');
      toast({
        title: "Cannot submit bill",
        description: `The following work orders have missing or unapproved reports: ${workOrderNumbers}. All reports must be approved before billing.`,
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
        work_order_id: workOrderId,
        amount: formData.selectedWorkOrders[workOrderId],
      }));

      await submitSubcontractorBill({
        external_bill_number: formData.externalInvoiceNumber || undefined,
        total_amount: totalAmount,
        work_orders: workOrdersData,
        attachments: files.length > 0 ? files : undefined,
        subcontractor_organization_id: isAdminMode ? formData.selectedOrganizationId : undefined,
        created_by_admin_id: isAdminMode ? profile?.id : undefined,
        admin_notes: isAdminMode && formData.adminNotes ? formData.adminNotes : undefined,

        // New fields
        bill_date: formData.billDate!,
        due_date: formData.dueDate!,
        payment_terms: formData.paymentTerms || 'Net 30',
        purchase_order_number: formData.purchaseOrderNumber || undefined,
        subcontractor_notes: formData.subcontractorNotes || undefined,
      });
      
      // Clear saved form data
      localStorage.removeItem('billFormData');
      
      navigate(isAdminMode ? '/admin/subcontractor-bills' : '/subcontractor/bills');
    } catch (error: any) {
      toast({
        title: "Error submitting bill",
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
          <Link to={isAdminMode ? "/admin/subcontractor-bills" : "/subcontractor/bills"}>
            <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bills
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Submit Bill</h1>
            <p className="text-muted-foreground">
              {isAdminMode ? "Submit bill on behalf of subcontractor" : "Submit your bill for completed work"}
            </p>
          </div>
        </div>
      </div>

      {/* Submission Context Card */}
      {isAdminMode && formData.selectedOrganizationId && selectedOrganization && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {selectedOrganization.name}
                </Badge>
                <span className="text-sm font-medium text-primary">Admin Submission</span>
              </div>
              {totalAmount > 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-lg font-semibold text-primary">
                    ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <StandardFormLayout>
          {isAdminMode && (
            <StandardFormLayout.Section>
              <div className="space-y-2 mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <Building2 className="h-4 w-4 mr-2 inline" />
                  Select Organization
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose the subcontractor organization for this bill
                </p>
              </div>
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
                      Submitting bill on behalf of: <strong className="text-primary">{selectedOrganization.name}</strong>
                    </AlertDescription>
                  </Alert>
                 )}
                 
                 {isAdminMode && (
                   <div className="space-y-2">
                     <Label htmlFor="adminNotes">Admin Notes</Label>
                     <Textarea
                       id="adminNotes"
                       placeholder="Document why this bill was entered manually by admin..."
                       value={formData.adminNotes}
                       onChange={(e) => setFormData(prev => ({ ...prev, adminNotes: e.target.value }))}
                       className="min-h-[100px] transition-all duration-200"
                     />
                     <p className="text-xs text-muted-foreground">
                       These notes will help track why this bill was entered manually and any special circumstances.
                     </p>
                   </div>
                 )}
               </StandardFormLayout.FieldGroup>
             </StandardFormLayout.Section>
           )}

           <StandardFormLayout.Section>
            <div className="space-y-2 mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <FileText className="h-4 w-4 mr-2 inline" />
                Bill Details
              </h3>
              <p className="text-sm text-muted-foreground">
                Enter your external bill number and related identifiers (optional)
              </p>
            </div>
            <StandardFormLayout.FieldGroup>
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="externalInvoiceNumber">External Bill Number</Label>
                      <Input
                        id="externalInvoiceNumber"
                        placeholder="BILL-2024-001"
                        value={formData.externalInvoiceNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, externalInvoiceNumber: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional: Your own bill number for reference
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
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardContent className="pt-6">
                  <BillDatesFields
                    billDate={formData.billDate}
                    dueDate={formData.dueDate}
                    paymentTerms={formData.paymentTerms}
                    onChangeBillDate={(d) => setFormData(prev => ({ ...prev, billDate: d, dueDate: prev.dueDate && isBefore(prev.dueDate, d) ? addDays(d, 30) : prev.dueDate }))}
                    onChangeDueDate={(d) => setFormData(prev => ({ ...prev, dueDate: d }))}
                    onChangePaymentTerms={(value) => setFormData(prev => ({ ...prev, paymentTerms: value }))}
                    error={dateError}
                  />
                </CardContent>
               </Card>
             </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          <StandardFormLayout.Section 
            title="Notes & Terms"
            description="Optional notes and payment terms"
          >
            <StandardFormLayout.FieldGroup>
              <div className="space-y-2">
                <Label htmlFor="subcontractorNotes">Notes</Label>
                <Textarea
                  id="subcontractorNotes"
                  placeholder="Add any relevant notes for the admin to review..."
                  value={formData.subcontractorNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, subcontractorNotes: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          <StandardFormLayout.Section>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 inline" />
                  Select Work Orders
                </h3>
                {selectedWorkOrderIds.length > 0 && (
                  <>
                    <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                      ({selectedWorkOrderIds.length} selected)
                    </Badge>
                    {totalAmount > 0 && (
                      <Badge variant="success" className="h-5 text-[10px] px-1.5">
                        ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Choose completed work orders to include in this bill
              </p>
            </div>
            <StandardFormLayout.FieldGroup>
              {isAdminMode && !formData.selectedOrganizationId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Please select a subcontractor organization first</p>
                </div>
              ) : completedWorkOrdersForBilling?.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : availableWorkOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed work orders available for billing</p>
                </div>
              ) : (
                <div className={availableWorkOrders.length > 4 
                  ? "grid grid-cols-1 lg:grid-cols-2 gap-4" 
                  : "space-y-4"
                }>
                  {availableWorkOrders.map((workOrder) => {
                    const isCompactMode = availableWorkOrders.length > 4;
                    return (
                      <WorkOrderAmountCard
                        key={workOrder.id}
                        workOrder={workOrder}
                        isSelected={workOrder.id in formData.selectedWorkOrders}
                        amount={formData.selectedWorkOrders[workOrder.id] || 0}
                        onSelectionChange={(checked) => handleWorkOrderSelection(workOrder.id, checked)}
                        onAmountChange={(amount) => handleWorkOrderAmountChange(workOrder.id, amount)}
                        compact={isCompactMode}
                      />
                    );
                  })}
                </div>
              )}
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          {selectedWorkOrderIds.length > 0 && (
            <div className="mt-6 mb-6">
              <PreSubmissionSummaryCard
                totalAmount={totalAmount}
                workOrderCount={selectedWorkOrderIds.length}
                billDate={formData.billDate}
                dueDate={formData.dueDate}
              />
            </div>
          )}

          {selectedWorkOrderIds.length > 0 && (
            <StandardFormLayout.Section 
              title="Bill Summary"
              description="Review the selected work orders and total amount"
            >
              <StandardFormLayout.FieldGroup>
                <BillTotalSummary
                  selectedWorkOrders={selectedWorkOrderSummary}
                  totalAmount={totalAmount}
                />
              </StandardFormLayout.FieldGroup>
            </StandardFormLayout.Section>
          )}

          <StandardFormLayout.Section>
            <div className="space-y-2 mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <Paperclip className="h-4 w-4 mr-2 inline" />
                Supporting Documents
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload any relevant bills or documentation
              </p>
            </div>
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
                  'Submit Bill'
                )}
              </Button>
          </StandardFormLayout.Actions>
        </StandardFormLayout>
      </form>
    </div>
  );
}

