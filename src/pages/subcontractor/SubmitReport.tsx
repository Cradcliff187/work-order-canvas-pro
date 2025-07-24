
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DraftIndicator } from '@/components/DraftIndicator';
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { useSubcontractorWorkOrders } from '@/hooks/useSubcontractorWorkOrders';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useAuth } from '@/contexts/AuthContext';
import { MobileFileUpload } from '@/components/MobileFileUpload';
import { useIsMobile } from '@/hooks/use-mobile';
import { FileUpload } from '@/components/FileUpload';
import type { PhotoAttachment } from '@/types/offline';

interface FormData {
  workPerformed: string;
  materialsUsed: string;
  notes: string;
  hoursWorked: string;
  attachments: File[];
}

export default function SubmitReport() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { submitReport } = useSubcontractorWorkOrders();
  const { saveDraft, getDrafts } = useOfflineStorage();
  const isMobile = useIsMobile();

  // Use getWorkOrder hook directly
  const workOrderQuery = useSubcontractorWorkOrders().getWorkOrder(workOrderId || '');

  const [formData, setFormData] = useState<FormData>({
    workPerformed: '',
    materialsUsed: '',
    notes: '',
    hoursWorked: '',
    attachments: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Check for work order ID
  if (!workOrderId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Work Order ID is required.</AlertDescription>
      </Alert>
    );
  }

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

    if (!formData.workPerformed.trim() || (profile?.user_type === 'employee' && !formData.hoursWorked.trim())) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReport.mutateAsync({
        workOrderId,
        workPerformed: formData.workPerformed,
        materialsUsed: formData.materialsUsed || undefined,
        hoursWorked: profile?.user_type === 'employee' && formData.hoursWorked ? parseFloat(formData.hoursWorked) : undefined,
        notes: formData.notes || undefined,
        photos: formData.attachments.length > 0 ? formData.attachments : undefined,
      });

      toast({
        title: "Report Submitted",
        description: "Your report has been successfully submitted.",
      });

      // Clear saved draft
      if (currentDraftId) {
        localStorage.removeItem(`draft_${currentDraftId}`);
      }

      // Redirect to work orders or reports
      navigate('/subcontractor/work-orders');
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
      // Convert attachments to PhotoAttachment format
      const photoAttachments: PhotoAttachment[] = await Promise.all(
        formData.attachments.map(async (file, index) => {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });

          return {
            id: `photo_${index}_${Date.now()}`,
            name: file.name,
            base64Data: base64,
            mimeType: file.type,
            size: file.size,
            originalFile: {
              name: file.name,
              lastModified: file.lastModified,
            },
          };
        })
      );

      const draftId = await saveDraft(
        workOrderId,
        {
          workPerformed: formData.workPerformed,
          materialsUsed: formData.materialsUsed,
          hoursWorked: profile?.user_type === 'employee' && formData.hoursWorked ? parseFloat(formData.hoursWorked) : undefined,
          notes: formData.notes,
        },
        photoAttachments,
        true // isManual
      );

      setCurrentDraftId(draftId);
      
      toast({
        title: "Draft Saved",
        description: "Your progress has been saved.",
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
      hoursWorked: draft.hoursWorked?.toString() || '',
      attachments: [], // Attachments would need to be converted back from base64
    });
    setCurrentDraftId(draft.id);
    toast({
      title: "Draft Loaded",
      description: "Draft loaded successfully.",
    });
  };

  const handleFilesSelected = useCallback((files: File[]) => {
    setFormData(prev => ({
      ...prev,
      attachments: files,
    }));
  }, []);

  // Handle query states
  if (workOrderQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{workOrderQuery.error?.message || 'Failed to load work order.'}</AlertDescription>
      </Alert>
    );
  }

  if (workOrderQuery.isLoading) {
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

  if (!workOrderQuery.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load work order details.
        </AlertDescription>
      </Alert>
    );
  }

  const workOrder = workOrderQuery.data;

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

          {profile?.user_type === 'employee' && (
            <StandardFormLayout.Section 
              title="Time Tracking"
              description="Record hours worked for this assignment"
            >
              <StandardFormLayout.FieldGroup columns={1}>
                <div className="space-y-2">
                  <Label htmlFor="hoursWorked">Hours Worked *</Label>
                  <Input
                    id="hoursWorked"
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="8.5"
                    value={formData.hoursWorked}
                    onChange={(e) => setFormData(prev => ({ ...prev, hoursWorked: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter total hours worked on this assignment for payroll tracking
                  </p>
                </div>
              </StandardFormLayout.FieldGroup>
            </StandardFormLayout.Section>
          )}

          <StandardFormLayout.Section 
            title="Photos & Documentation"
            description="Upload photos and documents related to the work"
          >
            <StandardFormLayout.FieldGroup>
              <div className="space-y-2">
                <Label>Upload Files</Label>
                {isMobile ? (
                  <MobileFileUpload
                    onFilesSelected={handleFilesSelected}
                    maxFiles={10}
                    acceptedTypes={['image/*', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv']}
                    showCameraButton={true}
                    showGalleryButton={true}
                    showDocumentButton={true}
                  />
                ) : (
                  <FileUpload
                    onFilesSelected={handleFilesSelected}
                    maxFiles={10}
                    acceptedTypes={['image/*', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv']}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Upload photos, PDF documents, Excel files, or Word documents
                </p>
              </div>
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
