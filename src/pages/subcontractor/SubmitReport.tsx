
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, ArrowLeft, Upload, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { DraftIndicator } from '@/components/DraftIndicator';
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { useSubcontractorWorkOrders } from '@/hooks/useSubcontractorWorkOrders';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';

interface FormData {
  workPerformed: string;
  materialsUsed: string;
  notes: string;
  hoursWorked: string;
  invoiceAmount: string;
  invoiceNumber: string;
  photos: File[];
}

export default function SubmitReport() {
  const { id: workOrderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getWorkOrder } = useSubcontractorWorkOrders();
  const { saveDraft, getDraft } = useOfflineStorage();

  const [formData, setFormData] = useState<FormData>({
    workPerformed: '',
    materialsUsed: '',
    notes: '',
    hoursWorked: '',
    invoiceAmount: '',
    invoiceNumber: '',
    photos: [],
  });
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (!workOrderId) {
      setError('Work Order ID is required.');
      setIsLoading(false);
      return;
    }

    const fetchWorkOrder = async () => {
      try {
        const fetchedWorkOrder = await getWorkOrder(workOrderId).refetch();
        setWorkOrder(fetchedWorkOrder.data);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load work order.');
        setIsLoading(false);
      }
    };

    fetchWorkOrder();
  }, [workOrderId, getWorkOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workOrderId) {
      toast({
        title: "Missing Work Order ID",
        description: "Please ensure you are accessing this form from a valid work order.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Here you would typically submit to your backend
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Report Submitted",
        description: "Your report has been successfully submitted.",
      });

      // Clear saved draft
      if (currentDraftId) {
        localStorage.removeItem(`draft_${currentDraftId}`);
      }

      // Redirect
      navigate('/subcontractor/reports');
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit the report. Please try again.",
        variant: "destructive",
      });
      console.error("Submit failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!workOrderId) {
      toast({
        title: "Missing Work Order ID",
        description: "Cannot save draft without a valid work order ID.",
        variant: "destructive",
      });
      return;
    }

    try {
      const draftKey = `draft_${workOrderId}`;
      localStorage.setItem(draftKey, JSON.stringify(formData));
      setCurrentDraftId(workOrderId);
      
      toast({
        title: "Draft Saved",
        description: "Your progress has been saved locally.",
      });
    } catch (err: any) {
      toast({
        title: "Draft Save Error",
        description: err.message || "Failed to save draft. Please try again.",
        variant: "destructive",
      });
      console.error("Draft save failed:", err);
    }
  };

  const handleLoadDraft = (draft: any) => {
    setFormData({
      workPerformed: draft.workPerformed || '',
      materialsUsed: draft.materialsUsed || '',
      notes: draft.notes || '',
      hoursWorked: draft.hoursWorked || '',
      invoiceAmount: draft.invoiceAmount || '',
      invoiceNumber: draft.invoiceNumber || '',
      photos: draft.photos || [],
    });
    setCurrentDraftId(draft.id);
    toast({
      title: "Draft Loaded",
      description: "Draft loaded successfully.",
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...acceptedFiles],
    }));
  }, []);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    }
  });

  const handleRemovePhoto = (index: number) => {
    setFormData(prev => {
      const newPhotos = [...prev.photos];
      newPhotos.splice(index, 1);
      return { ...prev, photos: newPhotos };
    });
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-24 rounded-md" />
            <div>
              <Skeleton className="h-6 w-48 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md mt-1" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-32 rounded-md" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load work order details.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/subcontractor/work-orders">
            <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Submit Work Report</h1>
            <p className="text-muted-foreground">
              {workOrder?.work_order_number || 'Loading...'}
            </p>
          </div>
        </div>
        
        <DraftIndicator 
          workOrderId={workOrderId} 
          onLoadDraft={handleLoadDraft}
          currentDraftId={currentDraftId}
        />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <StandardFormLayout>
          <StandardFormLayout.Section 
            title="Work Details"
            description="Provide detailed information about the work performed"
          >
            <StandardFormLayout.FieldGroup>
              <div className="space-y-2">
                <Label htmlFor="workPerformed">Work Performed *</Label>
                <Textarea
                  id="workPerformed"
                  placeholder="Describe the work you performed in detail..."
                  value={formData.workPerformed}
                  onChange={(e) => setFormData(prev => ({ ...prev, workPerformed: e.target.value }))}
                  className="min-h-[120px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="materialsUsed">Materials Used</Label>
                <Textarea
                  id="materialsUsed"
                  placeholder="List materials, parts, or supplies used..."
                  value={formData.materialsUsed}
                  onChange={(e) => setFormData(prev => ({ ...prev, materialsUsed: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information or observations..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          <StandardFormLayout.Section 
            title="Time & Billing"
            description="Enter time spent and billing information"
          >
            <StandardFormLayout.FieldGroup columns={2}>
              <div className="space-y-2">
                <Label htmlFor="hoursWorked">Hours Worked</Label>
                <Input
                  id="hoursWorked"
                  type="number"
                  step="0.25"
                  min="0"
                  placeholder="8.5"
                  value={formData.hoursWorked}
                  onChange={(e) => setFormData(prev => ({ ...prev, hoursWorked: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceAmount">Invoice Amount *</Label>
                <Input
                  id="invoiceAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.invoiceAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceAmount: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="INV-2024-001"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                />
              </div>
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          <StandardFormLayout.Section 
            title="Photos & Documentation"
            description="Upload photos or documents related to the work"
          >
            <StandardFormLayout.FieldGroup>
              <div className="space-y-2">
                <Label>Upload Photos</Label>
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
                    {isDragActive ? "Drop files here..." : "Drag & drop photos here, or click to select"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, GIF up to 10MB each
                  </p>
                </div>
              </div>

              {formData.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {formData.photos.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Uploaded ${index + 1}`}
                        className="rounded-md w-full h-32 object-cover"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <Upload className="h-3 w-3 rotate-90" />
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
              disabled={isSubmitting}
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
                  Submit Report
                </>
              )}
            </Button>
          </StandardFormLayout.Actions>
        </StandardFormLayout>
      </form>
    </div>
  );
}
