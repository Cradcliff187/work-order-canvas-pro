import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSubcontractorWorkOrders } from "@/hooks/useSubcontractorWorkOrders";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDraftAutoSave } from "@/hooks/useDraftAutoSave";
import { useIsMobile } from "@/hooks/use-mobile";
import { FileUpload } from "@/components/FileUpload";
import { MobileMediaUpload } from "@/components/MobileMediaUpload";
import { DraftIndicator } from "@/components/DraftIndicator";
import { OrganizationValidationAlert } from "@/components/OrganizationValidationAlert";
import StandardFormLayout from "@/components/layout/StandardFormLayout";
import { ArrowLeft, FileText, Save } from "lucide-react";
import type { PhotoAttachment, ReportDraft } from "@/types/offline";

const reportSchema = z.object({
  workPerformed: z.string().min(10, "Please provide at least 10 characters describing the work performed"),
  materialsUsed: z.string().optional(),
  hoursWorked: z.coerce.number().min(0.1, "Hours worked must be greater than 0").optional(),
  invoiceAmount: z.coerce.number().min(0.01, "Invoice amount must be greater than 0"),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

export default function SubmitReport() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { getWorkOrder, submitReport } = useSubcontractorWorkOrders();
  const isMobile = useIsMobile();
  
  // Validate workOrderId parameter
  if (!workOrderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workOrderId)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/subcontractor/work-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Invalid work order ID provided.
          </CardContent>
        </Card>
      </div>
    );
  }

  const workOrderQuery = getWorkOrder(workOrderId);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [photoAttachments, setPhotoAttachments] = useState<PhotoAttachment[]>([]);
  
  const { uploadFiles, uploadProgress, isUploading } = useFileUpload({
    maxFiles: 10,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  });

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      workPerformed: "",
      materialsUsed: "",
      hoursWorked: undefined,
      invoiceAmount: undefined,
      invoiceNumber: "",
      notes: "",
    },
  });

  // Auto-save functionality
  const { manualSave, lastSavedDraftId, isAutoSaveEnabled } = useDraftAutoSave({
    workOrderId: workOrderId!,
    watch: form.watch,
    getValues: form.getValues,
    photos: photoAttachments,
    enabled: !!workOrderId,
  });

  // Convert files to photo attachments
  const convertFilesToAttachments = useCallback(async (files: File[]): Promise<PhotoAttachment[]> => {
    const attachments: PhotoAttachment[] = [];
    
    for (const file of files) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        attachments.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          base64Data: base64,
          mimeType: file.type,
          size: file.size,
          originalFile: {
            name: file.name,
            lastModified: file.lastModified,
          },
        });
      } catch (error) {
        console.error('Failed to convert file to attachment:', error);
      }
    }
    
    return attachments;
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setSelectedFiles(files);
    const attachments = await convertFilesToAttachments(files);
    setPhotoAttachments(attachments);
  }, [convertFilesToAttachments]);

  const handleLoadDraft = useCallback((draft: ReportDraft) => {
    // Load draft data into form
    form.reset({
      workPerformed: draft.workPerformed,
      materialsUsed: draft.materialsUsed,
      hoursWorked: draft.hoursWorked,
      invoiceAmount: draft.invoiceAmount,
      invoiceNumber: draft.invoiceNumber,
      notes: draft.notes,
    });

    // Load photos
    setPhotoAttachments(draft.photos);
    
    // Convert back to File objects for display
    const files = draft.photos.map(photo => {
      // Create a mock file for display purposes
      const dataUrl = photo.base64Data;
      const byteString = atob(dataUrl.split(',')[1]);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }
      
      return new File([arrayBuffer], photo.name, { type: photo.mimeType });
    });
    
    setSelectedFiles(files);
  }, [form]);

  const handleManualSave = useCallback(async () => {
    try {
      await manualSave();
    } catch (error) {
      console.error('Manual save failed:', error);
    }
  }, [manualSave]);

  const onSubmit = async (data: ReportFormData) => {
    if (!workOrderId) return;

    try {
      await submitReport.mutateAsync({
        workOrderId,
        workPerformed: data.workPerformed,
        materialsUsed: data.materialsUsed,
        hoursWorked: data.hoursWorked,
        invoiceAmount: data.invoiceAmount,
        invoiceNumber: data.invoiceNumber,
        notes: data.notes,
        photos: selectedFiles,
      });

      navigate("/subcontractor/work-orders");
    } catch (error) {
      console.error("Error submitting report:", error);
    }
  };

  if (workOrderQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                  <div className="h-10 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (workOrderQuery.error || !workOrderQuery.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/subcontractor/work-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Work order not found or you don't have access to submit a report for it.
          </CardContent>
        </Card>
      </div>
    );
  }

  const workOrder = workOrderQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/subcontractor/work-orders/${workOrderId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Submit Work Report</h1>
            <p className="text-muted-foreground">
              {workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`} - {workOrder.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DraftIndicator
            workOrderId={workOrderId!}
            onLoadDraft={handleLoadDraft}
            currentDraftId={lastSavedDraftId}
          />
          {isAutoSaveEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSave}
              className="h-8"
            >
              <Save className="h-3 w-3 mr-1" />
              Save Draft
            </Button>
          )}
        </div>
      </div>

      {/* Organization Validation Alert */}
      <OrganizationValidationAlert className="mb-6" />

      {/* Work Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Work Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Location</h4>
              <p className="text-sm">{workOrder.store_location}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Trade</h4>
              <p className="text-sm">{workOrder.trades?.name}</p>
            </div>
            <div className="sm:col-span-2">
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
              <p className="text-sm">{workOrder.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Work Report Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <StandardFormLayout variant="single" sectionSpacing="normal">
                
                {/* Work Details Section */}
                <StandardFormLayout.Section title="Work Details">
                  <StandardFormLayout.FieldGroup>
                    <FormField
                      control={form.control}
                      name="workPerformed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Performed *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe in detail the work that was performed..."
                              className="min-h-[120px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="materialsUsed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Materials Used</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="List any materials or parts used..."
                              className="min-h-[80px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </StandardFormLayout.FieldGroup>
                </StandardFormLayout.Section>

                {/* Time & Invoice Section */}
                <StandardFormLayout.Section title="Time & Invoice">
                  <StandardFormLayout.FieldGroup columns={2}>
                    <FormField
                      control={form.control}
                      name="hoursWorked"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hours Worked</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="8.5"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="invoiceAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Amount *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="250.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </StandardFormLayout.FieldGroup>

                  <StandardFormLayout.FieldGroup>
                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number</FormLabel>
                          <FormControl>
                            <Input placeholder="INV-2024-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </StandardFormLayout.FieldGroup>
                </StandardFormLayout.Section>

                {/* Documentation Section */}
                <StandardFormLayout.Section title="Documentation">
                  <StandardFormLayout.FieldGroup>
                    <div className="space-y-4">
                      <div>
                        <FormLabel>Work Photos</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Upload photos of the completed work (up to 10 photos, max 10MB each)
                        </p>
                      </div>
                      
                      {isMobile ? (
                        <MobileMediaUpload
                          onFilesSelected={handleFilesSelected}
                          maxFiles={10}
                          maxSizeBytes={10 * 1024 * 1024}
                          uploadProgress={uploadProgress}
                          disabled={submitReport.isPending || isUploading}
                          showCamera={true}
                          cameraFacingMode="environment"
                          showDocumentUpload={false}
                          compactView={false}
                        />
                      ) : (
                        <FileUpload
                          onFilesSelected={handleFilesSelected}
                          maxFiles={10}
                          maxSizeBytes={10 * 1024 * 1024}
                          uploadProgress={uploadProgress}
                          disabled={submitReport.isPending || isUploading}
                        />
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any additional notes or comments..."
                              className="min-h-[80px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </StandardFormLayout.FieldGroup>
                </StandardFormLayout.Section>

                {/* Form Actions */}
                <StandardFormLayout.Actions align="right">
                  <Link to={`/subcontractor/work-orders/${workOrderId}`}>
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={submitReport.isPending || isUploading}
                    className="min-w-32"
                  >
                    {submitReport.isPending || isUploading ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {isUploading ? "Uploading..." : "Submitting..."}
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
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
