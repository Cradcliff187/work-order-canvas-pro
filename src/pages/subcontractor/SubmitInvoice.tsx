
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDropzone } from 'react-dropzone';
import { Upload, ArrowLeft, FileText, Loader2, Save } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { useSubcontractorWorkOrders } from '@/hooks/useSubcontractorWorkOrders';
import { useInvoiceSubmission } from '@/hooks/useInvoiceSubmission';
import { WorkOrderAmountCard } from '@/components/invoices/WorkOrderAmountCard';
import { InvoiceTotalSummary } from '@/components/invoices/InvoiceTotalSummary';

interface InvoiceFormData {
  externalInvoiceNumber: string;
  selectedWorkOrders: Record<string, number>; // workOrderId -> amount
}

export default function SubmitInvoice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { completedWorkOrdersForInvoicing } = useSubcontractorWorkOrders();
  const { submitInvoice, isSubmitting } = useInvoiceSubmission();
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    externalInvoiceNumber: '',
    selectedWorkOrders: {},
  });
  const [files, setFiles] = useState<File[]>([]);

  // Load saved form data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('invoiceFormData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(parsed);
      } catch (error) {
        console.error('Failed to parse saved form data:', error);
      }
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('invoiceFormData', JSON.stringify(formData));
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
      });
      
      // Clear saved form data
      localStorage.removeItem('invoiceFormData');
      
      navigate('/subcontractor/invoices');
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
  }, []);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10000000, // 10MB
  });

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/subcontractor/invoices">
            <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Submit Invoice</h1>
            <p className="text-muted-foreground">Submit your invoice for completed work</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <StandardFormLayout>
          <StandardFormLayout.Section 
            title="Invoice Details"
            description="Enter your external invoice number (optional)"
          >
            <StandardFormLayout.FieldGroup>
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
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          <StandardFormLayout.Section 
            title="Select Work Orders"
            description="Choose completed work orders to include in this invoice"
          >
            <StandardFormLayout.FieldGroup>
              {completedWorkOrdersForInvoicing?.isLoading ? (
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
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? "Drop files here..." : "Drag & drop files here, or click to select"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, PNG, JPG up to 10MB each
                  </p>
                </div>
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
              disabled={isSubmitting || selectedWorkOrderIds.length === 0}
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
