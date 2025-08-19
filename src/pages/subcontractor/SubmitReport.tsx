
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MDEditor from '@uiw/react-md-editor';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, ArrowLeft, FileText, Loader2, Paperclip, Eye, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSuccessAnimation } from "@/hooks/useSuccessAnimation";
import { DraftIndicator } from '@/components/DraftIndicator';
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkOrderReportSubmission } from '@/hooks/useWorkOrderReportSubmission';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UniversalUploadSheet } from '@/components/upload/UniversalUploadSheet';
import { EnhancedUploadTrigger } from '@/components/ui/enhanced-upload-trigger';
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal';
import { StepProgressIndicator } from '@/components/ui/step-progress-indicator';
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
  const { showSuccess } = useSuccessAnimation();
  const { profile } = useAuth();
  const { isEmployee } = useUserProfile();
  const { submitReport } = useWorkOrderReportSubmission();
  const { saveDraft, getDrafts } = useOfflineStorage();
  

  // Fetch work order details
  const workOrderQuery = useQuery({
    queryKey: ['work-order-detail', workOrderId],
    queryFn: async () => {
      if (!workOrderId) throw new Error('Work order ID is required');
      
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', workOrderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!workOrderId,
    staleTime: 30 * 1000,
  });

  const [formData, setFormData] = useState<FormData>({
    workPerformed: '',
    materialsUsed: '',
    notes: '',
    hoursWorked: '',
    attachments: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const steps = [
    { label: "Work Details", icon: FileText },
    { label: "Attachments", icon: Paperclip },
    { label: "Review", icon: Eye },
    { label: "Submit", icon: Send }
  ];

  // Dynamic step calculation based on form state
  const getCurrentStep = () => {
    if (isSubmitting) return 4;
    if (showPreview) return 3;
    if (formData.attachments.length > 0) return 2;
    if (formData.workPerformed.trim()) return 2;
    return 1;
  };

  const currentStep = getCurrentStep();

  // Check for work order ID
  if (!workOrderId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Work Order ID is required.</AlertDescription>
      </Alert>
    );
  }

  const canAdvanceToStep = (step: number) => {
    if (step === 1) return true;
    if (step === 2) return formData.workPerformed.trim().length > 0;
    if (step === 3) return formData.workPerformed.trim().length > 0;
    if (step === 4) return false; // Submit step is not manually accessible
    return false;
  };

  const goToPreviousStep = () => {
    if (showPreview) {
      setShowPreview(false);
    }
  };

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

    if (!formData.workPerformed.trim() || (isEmployee() && !formData.hoursWorked.trim())) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setShowPreview(true);
  };

  const handleConfirmedSubmit = async () => {
    if (!workOrderId) return;

    setIsSubmitting(true);
    try {
      await submitReport.mutateAsync({
        workOrderId,
        workPerformed: formData.workPerformed,
        materialsUsed: formData.materialsUsed || undefined,
        hoursWorked: isEmployee() && formData.hoursWorked ? parseFloat(formData.hoursWorked) : undefined,
        notes: formData.notes || undefined,
        photos: formData.attachments.length > 0 ? formData.attachments : undefined,
      });

      // Trigger success animation
      showSuccess();

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
          hoursWorked: isEmployee() && formData.hoursWorked ? parseFloat(formData.hoursWorked) : undefined,
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
    <>
      <ReportPreviewModal
        isOpen={showPreview}
        onEdit={() => setShowPreview(false)}
        onConfirm={() => {
          setShowPreview(false);
          handleConfirmedSubmit();
        }}
        formData={{
          workPerformed: formData.workPerformed,
          materialsUsed: formData.materialsUsed,
          hoursWorked: formData.hoursWorked,
          notes: formData.notes,
          attachments: formData.attachments
        }}
      />
      
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

      <StepProgressIndicator
        currentStep={currentStep}
        totalSteps={steps.length}
        steps={steps}
        className="mb-8"
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <StandardFormLayout>
          {/* Work Details Section - Always visible */}
          <StandardFormLayout.Section 
            title="Work Details"
            description="Provide detailed information about the work performed"
          >
            <StandardFormLayout.FieldGroup>
              <div className="space-y-2">
                <Label htmlFor="workPerformed">Work Performed *</Label>
                <MDEditor
                  value={formData.workPerformed}
                  onChange={(value) => setFormData(prev => ({ ...prev, workPerformed: value || '' }))}
                  data-color-mode="light"
                  height={200}
                  preview="edit"
                  hideToolbar={false}
                  visibleDragbar={false}
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

              {isEmployee() && (
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
              )}
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          {/* Attachments Section - Show when work performed has content */}
          {formData.workPerformed.trim() && (
            <StandardFormLayout.Section 
              title="Photos & Documentation"
              description="Upload photos and documents related to the work"
            >
              <StandardFormLayout.FieldGroup>
                <div className="space-y-2">
                  <Label>Upload Files</Label>
                  <UniversalUploadSheet
                    trigger={
                      <EnhancedUploadTrigger>
                        <Button variant="outline" className="w-full h-20 border-dashed border-2 hover:border-primary/50 bg-background">
                          <div className="text-center">
                            <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm font-medium">Upload Files</p>
                            <p className="text-xs text-muted-foreground">Click to select photos & documents</p>
                          </div>
                        </Button>
                      </EnhancedUploadTrigger>
                    }
                    onFilesSelected={handleFilesSelected}
                    open={showUploadSheet}
                    onOpenChange={setShowUploadSheet}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                    multiple={true}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload photos, PDF documents, Excel files, or Word documents
                  </p>
                </div>
              </StandardFormLayout.FieldGroup>
            </StandardFormLayout.Section>
          )}

          <StandardFormLayout.Actions>
            <div className="flex justify-between w-full">
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/subcontractor/work-orders')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                
                {showPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                    disabled={isSubmitting}
                  >
                    Back to Edit
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting || !formData.workPerformed.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !formData.workPerformed.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Review & Submit
                    </>
                  )}
                </Button>
              </div>
            </div>
          </StandardFormLayout.Actions>
        </StandardFormLayout>
      </form>
      </div>
    </>
  );
}
