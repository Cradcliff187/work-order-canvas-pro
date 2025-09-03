import React, { useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MDEditor from '@uiw/react-md-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, FileText, Loader2, AlertTriangle, Users, RotateCcw, Paperclip, Eye, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSuccessAnimation } from "@/hooks/useSuccessAnimation";
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { useAdminReportSubmission } from '@/hooks/useAdminReportSubmission';
import { useSubcontractorOrganizations } from '@/hooks/useSubcontractorOrganizations';
import { UniversalUploadSheet } from '@/components/upload/UniversalUploadSheet';
import { EnhancedUploadTrigger } from '@/components/ui/enhanced-upload-trigger';
import { useAuth } from '@/contexts/AuthContext';
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal';
import { StepProgressIndicator } from '@/components/ui/step-progress-indicator';

interface FormData {
  workPerformed: string;
  materialsUsed: string;
  notes: string;
  hoursWorked: string;
  attachments: File[];
  selectedSubcontractorOrganization: string | null; // Only used for unassigned work orders
}

export default function AdminSubmitReport() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const steps = [
    { label: "Work Details", icon: FileText },
    { label: "Attachments", icon: Paperclip },
    { label: "Review", icon: Eye },
    { label: "Submit", icon: Send }
  ];
  const { profile } = useAuth();
  const { showSuccess } = useSuccessAnimation();
  
  const { data: workOrder, isLoading, error, refetch } = useWorkOrderDetail(workOrderId!);
  const { data: subcontractorOrganizations } = useSubcontractorOrganizations();
  const { submitReportForSubcontractor, isSubmitting } = useAdminReportSubmission();

  const [formData, setFormData] = useState<FormData>({
    workPerformed: '',
    materialsUsed: '',
    notes: '',
    hoursWorked: '',
    attachments: [],
    selectedSubcontractorOrganization: null, // Only relevant for unassigned orders
  });

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Dynamic step calculation based on form state
  const getCurrentStep = () => {
    if (isSubmitting) return 4;
    if (showPreview) return 3;
    if (formData.attachments.length > 0) return 2;
    if (formData.workPerformed.trim()) return 2;
    return 1;
  };

  const currentStep = getCurrentStep();

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
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            We couldn't load the work order details. Please try again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch?.()} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Assignment detection logic - determines if manual selection is needed
  const hasIndividualAssignment = workOrder.work_order_assignments && workOrder.work_order_assignments.length > 0;
  const hasOrganizationAssignment = workOrder.assigned_organization_id;
  const assignedSubcontractor = hasIndividualAssignment ? workOrder.work_order_assignments[0].profiles : null;
  
  // Get assigned organization from the assignment data, not from workOrder.organizations
  const assignedOrganization = hasIndividualAssignment 
    ? workOrder.work_order_assignments[0].assigned_organization
    : hasOrganizationAssignment 
    ? workOrder.organizations 
    : null;
    
  const isCompletelyUnassigned = !hasIndividualAssignment && !hasOrganizationAssignment;
  
  // Debug logging for visibility issue
  console.log('🔍 Assignment Detection Debug:', {
    hasIndividualAssignment,
    hasOrganizationAssignment,
    assignedSubcontractor,
    assignedOrganization,
    assignmentData: workOrder.work_order_assignments?.[0],
    isCompletelyUnassigned
  });

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

    // Validation for unassigned work orders - ensure they have explicit assignment choice
    if (isCompletelyUnassigned && !formData.selectedSubcontractorOrganization) {
      toast({
        title: "Assignment Required",
        description: "Please select a subcontractor organization or choose admin-only report.",
        variant: "destructive",
      });
      return;
    }

    if (!showConfirmation) {
      setShowPreview(true);
      return;
    }

    try {
      // Auto-detect assignment details from existing work order assignments
      let subcontractorUserId = null;
      let subcontractorOrganizationId = null;

      if (hasIndividualAssignment) {
        // Use individual assignment (employee/subcontractor user)
        subcontractorUserId = workOrder.work_order_assignments[0].assigned_to;
        subcontractorOrganizationId = workOrder.work_order_assignments[0].assigned_organization_id;
      } else if (hasOrganizationAssignment) {
        // Use organization assignment (first active user from org)
        subcontractorOrganizationId = workOrder.assigned_organization_id;
        // For org assignments, we don't specify individual user - let system handle it
        subcontractorUserId = null;
      } else if (isCompletelyUnassigned && formData.selectedSubcontractorOrganization) {
        // Manual selection for unassigned work orders
        const selectedOrg = subcontractorOrganizations?.find(org => org.id === formData.selectedSubcontractorOrganization);
        subcontractorOrganizationId = formData.selectedSubcontractorOrganization;
        subcontractorUserId = selectedOrg?.first_active_user_id || null;
      }

      await submitReportForSubcontractor.mutateAsync({
        workOrderId,
        subcontractorUserId,
        subcontractorOrganizationId,
        workPerformed: formData.workPerformed,
        materialsUsed: formData.materialsUsed || undefined,
        hoursWorked: formData.hoursWorked ? parseFloat(formData.hoursWorked) : undefined,
        notes: formData.notes || undefined,
        photos: formData.attachments.length > 0 ? formData.attachments : undefined,
      });

      // Trigger success animation
      showSuccess();

      // Success message based on assignment type
      const getSuccessMessage = () => {
        if (assignedSubcontractor) {
          return `Report submitted for ${assignedSubcontractor.first_name} ${assignedSubcontractor.last_name}.`;
        } else if (assignedOrganization) {
          return `Report submitted for ${assignedOrganization.name}.`;
        } else if (formData.selectedSubcontractorOrganization) {
          const selectedOrg = subcontractorOrganizations?.find(org => org.id === formData.selectedSubcontractorOrganization);
          return `Report submitted for ${selectedOrg?.name}.`;
        } else {
          return "Admin-only report submitted successfully.";
        }
      };

      toast({
        title: "Report Submitted",
        description: getSuccessMessage(),
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
            {(() => {
              if (assignedSubcontractor) {
                return (
            <>You are about to submit a work report on behalf of <strong>{assignedSubcontractor.first_name} {assignedSubcontractor.last_name}</strong> for work order <strong>{workOrder.work_order_number}</strong>. This action will mark the work order as completed.</>
                );
              } else if (assignedOrganization) {
                return (
                  <>You are about to submit a work report for <strong>{assignedOrganization.name}</strong> for work order <strong>{workOrder.work_order_number}</strong>. This action will mark the work order as completed.</>
                );
              } else if (formData.selectedSubcontractorOrganization) {
                const selectedOrg = subcontractorOrganizations?.find(org => org.id === formData.selectedSubcontractorOrganization);
                return (
                  <>You are about to submit a work report for <strong>{selectedOrg?.name}</strong> for work order <strong>{workOrder.work_order_number}</strong>. This action will mark the work order as completed.</>
                );
              } else {
                return (
                  <>You are about to submit an admin-only work report for work order <strong>{workOrder.work_order_number}</strong>. This action will mark the work order as completed.</>
                );
              }
            })()}
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
    <>
      <ReportPreviewModal
        isOpen={showPreview}
        onEdit={() => setShowPreview(false)}
        onConfirm={() => {
          setShowPreview(false);
          setShowConfirmation(true);
        }}
        formData={{
          workPerformed: formData.workPerformed,
          materialsUsed: formData.materialsUsed,
          hoursWorked: formData.hoursWorked,
          notes: formData.notes,
          attachments: formData.attachments
        }}
      />
      
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate(`/admin/work-orders/${workOrderId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Submit Work Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant="outline">{workOrder.work_order_number}</Badge>
              <span className="text-muted-foreground">
                {assignedSubcontractor 
                  ? `For ${assignedSubcontractor.first_name} ${assignedSubcontractor.last_name}`
                  : assignedOrganization?.name
                  ? `For ${assignedOrganization.name}`
                  : `Admin Report`
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <StepProgressIndicator
        currentStep={currentStep}
        totalSteps={steps.length}
        steps={steps}
        className="mb-8"
      />

      {/* Assignment Status Display */}
      {!isCompletelyUnassigned && (
        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            Assigned to: {assignedSubcontractor 
              ? `${assignedSubcontractor.first_name} ${assignedSubcontractor.last_name}`
              : assignedOrganization?.name
            }
          </AlertDescription>
        </Alert>
      )}

      {isCompletelyUnassigned && (
        <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unassigned - Select organization below (optional)
          </AlertDescription>
        </Alert>
      )}


      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <StandardFormLayout>
          {/* Manual Subcontractor Selection - ONLY for completely unassigned work orders */}
          {isCompletelyUnassigned && (
            <StandardFormLayout.Section 
              title="Subcontractor Assignment"
              description="This work order has no assignment. Choose attribution for the report."
              className="border-l-4 border-amber-200 pl-4"
            >
              <StandardFormLayout.FieldGroup>
                <div className="space-y-2">
                  <Label htmlFor="subcontractor" className="text-base font-semibold">
                    Subcontractor Organization <span className="text-red-600">*Required</span>
                  </Label>
                  <Select
                    value={formData.selectedSubcontractorOrganization || ""}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      selectedSubcontractorOrganization: value === "ADMIN_ONLY" ? null : value 
                    }))}
                    required
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Choose attribution for this report..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN_ONLY" className="text-muted-foreground">
                        📝 Admin-only report (no organization)
                      </SelectItem>
                      {subcontractorOrganizations?.map((organization) => (
                        <SelectItem key={organization.id} value={organization.id}>
                          🏢 {organization.name} ({organization.active_user_count} member{organization.active_user_count !== 1 ? 's' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Select who should be credited with this work for accurate reporting and attribution.
                  </p>
                </div>
              </StandardFormLayout.FieldGroup>
            </StandardFormLayout.Section>
          )}

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
            title="Documentation"
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
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                  multiple={true}
                />
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
    </>
  );
}