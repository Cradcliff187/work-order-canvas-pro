import React, { useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, FileText, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { useAdminReportSubmission } from '@/hooks/useAdminReportSubmission';
import { MobileFileUpload } from '@/components/MobileFileUpload';
import { FileUpload } from '@/components/FileUpload';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

interface FormData {
  workPerformed: string;
  materialsUsed: string;
  notes: string;
  hoursWorked: string;
  attachments: File[];
}

export default function AdminSubmitReport() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  
  const { data: workOrder, isLoading, error } = useWorkOrderDetail(workOrderId!);
  const { submitReportForSubcontractor, isSubmitting } = useAdminReportSubmission();

  const [formData, setFormData] = useState<FormData>({
    workPerformed: '',
    materialsUsed: '',
    notes: '',
    hoursWorked: '',
    attachments: [],
  });

  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!workOrderId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Work Order ID is required.</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load work order details. {error?.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Check if there's an assigned subcontractor
  const hasAssignments = workOrder.work_order_assignments && workOrder.work_order_assignments.length > 0;
  const assignedSubcontractor = hasAssignments ? workOrder.work_order_assignments[0].profiles : null;
  
  if (!hasAssignments || !assignedSubcontractor) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This work order must be assigned to a subcontractor before a report can be submitted on their behalf.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate(`/admin/work-orders/${workOrderId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Order
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.workPerformed.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Please describe the work performed.",
        variant: "destructive",
      });
      return;
    }

    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    try {
      await submitReportForSubcontractor.mutateAsync({
        workOrderId,
        subcontractorUserId: workOrder.work_order_assignments[0].assigned_to,
        workPerformed: formData.workPerformed,
        materialsUsed: formData.materialsUsed || undefined,
        hoursWorked: formData.hoursWorked ? parseFloat(formData.hoursWorked) : undefined,
        notes: formData.notes || undefined,
        photos: formData.attachments.length > 0 ? formData.attachments : undefined,
      });

      toast({
        title: "Report Submitted",
        description: `Report submitted successfully on behalf of ${assignedSubcontractor.first_name} ${assignedSubcontractor.last_name}.`,
      });

      navigate(`/admin/work-orders/${workOrderId}`);
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit the report. Please try again.",
        variant: "destructive",
      });
      setShowConfirmation(false);
    }
  };

  const handleFilesSelected = useCallback((files: File[]) => {
    setFormData(prev => ({
      ...prev,
      attachments: files,
    }));
  }, []);

  if (showConfirmation) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowConfirmation(false)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Confirm Report Submission</h1>
            <p className="text-muted-foreground">Review and confirm the details below</p>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You are about to submit a work report on behalf of <strong>{assignedSubcontractor.first_name} {assignedSubcontractor.last_name}</strong> for work order <strong>{workOrder.work_order_number}</strong>. This action will mark the work order as completed.
          </AlertDescription>
        </Alert>

        <div className="bg-muted p-4 rounded-lg space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Work Performed</label>
            <p className="text-sm">{formData.workPerformed}</p>
          </div>
          
          {formData.materialsUsed && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Materials Used</label>
              <p className="text-sm">{formData.materialsUsed}</p>
            </div>
          )}
          
          {formData.hoursWorked && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Hours Worked</label>
              <p className="text-sm">{formData.hoursWorked} hours</p>
            </div>
          )}

          {formData.notes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Notes</label>
              <p className="text-sm">{formData.notes}</p>
            </div>
          )}

          {formData.attachments.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Attachments</label>
              <p className="text-sm">{formData.attachments.length} file(s) selected</p>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => setShowConfirmation(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Confirm & Submit Report
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate(`/admin/work-orders/${workOrderId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Submit Work Report</h1>
          <p className="text-muted-foreground">
            For {assignedSubcontractor.first_name} {assignedSubcontractor.last_name} • {workOrder.work_order_number}
          </p>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You are submitting this report on behalf of the assigned subcontractor. This action will be logged for audit purposes.
        </AlertDescription>
      </Alert>

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
                  placeholder="Describe the work performed in detail..."
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
            title="Time Tracking"
            description="Record hours worked (optional)"
          >
            <StandardFormLayout.FieldGroup columns={1}>
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
                <p className="text-xs text-muted-foreground">
                  Optional: Enter total hours worked on this assignment
                </p>
              </div>
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

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
              onClick={() => navigate(`/admin/work-orders/${workOrderId}`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Review & Submit Report
                </>
              )}
            </Button>
          </StandardFormLayout.Actions>
        </StandardFormLayout>
      </form>
    </div>
  );
}