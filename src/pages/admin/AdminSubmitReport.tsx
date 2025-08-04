import React, { useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, FileText, Loader2, AlertTriangle, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { useAdminReportSubmission } from '@/hooks/useAdminReportSubmission';
import { useSubcontractors } from '@/hooks/useSubcontractors';
import { UniversalUploadSheet } from '@/components/upload/UniversalUploadSheet';
import { useAuth } from '@/contexts/AuthContext';

interface FormData {
  workPerformed: string;
  materialsUsed: string;
  notes: string;
  hoursWorked: string;
  attachments: File[];
  selectedSubcontractor: string | null; // For unassigned work orders
}

export default function AdminSubmitReport() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const { data: workOrder, isLoading, error } = useWorkOrderDetail(workOrderId!);
  const { data: subcontractors } = useSubcontractors();
  const { submitReportForSubcontractor, isSubmitting } = useAdminReportSubmission();

  const [formData, setFormData] = useState<FormData>({
    workPerformed: '',
    materialsUsed: '',
    notes: '',
    hoursWorked: '',
    attachments: [],
    selectedSubcontractor: null,
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
  const isUnassigned = !hasAssignments || !assignedSubcontractor;

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
      // Determine which subcontractor to use
      const subcontractorUserId = isUnassigned 
        ? formData.selectedSubcontractor 
        : workOrder.work_order_assignments[0].assigned_to;

      await submitReportForSubcontractor.mutateAsync({
        workOrderId,
        subcontractorUserId,
        workPerformed: formData.workPerformed,
        materialsUsed: formData.materialsUsed || undefined,
        hoursWorked: formData.hoursWorked ? parseFloat(formData.hoursWorked) : undefined,
        notes: formData.notes || undefined,
        photos: formData.attachments.length > 0 ? formData.attachments : undefined,
      });

      // Get subcontractor name for toast message
      const selectedSubcontractor = formData.selectedSubcontractor 
        ? subcontractors?.find(sub => sub.id === formData.selectedSubcontractor)
        : null;
      
      const subcontractorName = assignedSubcontractor 
        ? `${assignedSubcontractor.first_name} ${assignedSubcontractor.last_name}`
        : selectedSubcontractor 
        ? `${selectedSubcontractor.first_name} ${selectedSubcontractor.last_name}`
        : null;

      toast({
        title: "Report Submitted",
        description: subcontractorName 
          ? `Report submitted successfully on behalf of ${subcontractorName}.`
          : "Admin-only report submitted successfully.",
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
              } else if (formData.selectedSubcontractor) {
                const selectedSubcontractor = subcontractors?.find(sub => sub.id === formData.selectedSubcontractor);
                return (
                  <>You are about to submit a work report on behalf of <strong>{selectedSubcontractor?.first_name} {selectedSubcontractor?.last_name}</strong> for work order <strong>{workOrder.work_order_number}</strong>. This action will mark the work order as completed.</>
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
            {assignedSubcontractor 
              ? `For ${assignedSubcontractor.first_name} ${assignedSubcontractor.last_name} • ${workOrder.work_order_number}`
              : `Admin Report • ${workOrder.work_order_number}`
            }
          </p>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {assignedSubcontractor 
            ? "You are submitting this report on behalf of the assigned subcontractor. This action will be logged for audit purposes."
            : "You are submitting this report as an admin. You can optionally select a subcontractor to attribute the work to, or submit as admin-only. This action will be logged for audit purposes."
          }
        </AlertDescription>
      </Alert>

      {/* Subcontractor Selection for Unassigned Work Orders */}
      {isUnassigned && (
        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            This work order is not currently assigned to a subcontractor. You can optionally select a subcontractor to attribute this work to, or submit the report as admin-only.
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <StandardFormLayout>
          {/* Subcontractor Selection Section for Unassigned Work Orders */}
          {isUnassigned && (
            <StandardFormLayout.Section 
              title="Subcontractor Assignment"
              description="Optionally select a subcontractor to attribute this work to"
            >
              <StandardFormLayout.FieldGroup>
                <div className="space-y-2">
                  <Label htmlFor="subcontractor">Select Subcontractor (Optional)</Label>
                  <Select
                    value={formData.selectedSubcontractor || ""}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      selectedSubcontractor: value || null 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subcontractor or leave blank for admin-only report" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Admin-only report (no subcontractor)</SelectItem>
                      {subcontractors?.map((subcontractor) => (
                        <SelectItem key={subcontractor.id} value={subcontractor.id}>
                          {subcontractor.first_name} {subcontractor.last_name} - {subcontractor.organization_members[0]?.organization?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose a subcontractor to attribute this work to, or leave blank to submit as an admin-only report.
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
                <UniversalUploadSheet
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-20 border-dashed border-2 hover:border-primary/50"
                    >
                      <div className="text-center">
                        <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">Upload Files</p>
                        <p className="text-xs text-muted-foreground">Click to select photos & documents</p>
                      </div>
                    </Button>
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
  );
}