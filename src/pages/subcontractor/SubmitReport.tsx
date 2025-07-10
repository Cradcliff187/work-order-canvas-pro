import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSubcontractorWorkOrders, compressImage } from "@/hooks/useSubcontractorWorkOrders";
import { ArrowLeft, Upload, X, Camera, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const workOrderQuery = getWorkOrder(workOrderId!);
  
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

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

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    setUploading(true);
    try {
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith("image/")) {
            return await compressImage(file, 1); // 1MB max
          }
          return file;
        })
      );

      setPhotos(prev => [...prev, ...compressedFiles]);
    } catch (error) {
      console.error("Error compressing images:", error);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

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
        photos,
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Work Performed */}
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

              {/* Materials Used */}
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

              {/* Hours and Invoice */}
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              {/* Invoice Number */}
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

              {/* Photo Upload */}
              <div className="space-y-4">
                <div>
                  <FormLabel>Work Photos</FormLabel>
                  <p className="text-sm text-muted-foreground">Upload photos of the completed work (max 1MB each)</p>
                </div>
                
                <div className="grid gap-4">
                  {/* Upload Button */}
                  <div className="flex items-center gap-4">
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-muted-foreground rounded-lg hover:border-foreground transition-colors">
                        <Camera className="h-4 w-4" />
                        <span className="text-sm">Add Photos</span>
                      </div>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                      />
                    </label>
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="h-4 w-4 animate-spin" />
                        Compressing images...
                      </div>
                    )}
                  </div>

                  {/* Photo Previews */}
                  {photos.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={`Work photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div className="absolute bottom-2 left-2 right-2">
                            <Badge variant="secondary" className="text-xs">
                              {photo.name} ({(photo.size / 1024 / 1024).toFixed(1)}MB)
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Notes */}
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

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Link to={`/subcontractor/work-orders/${workOrderId}`}>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={submitReport.isPending || uploading}
                  className="min-w-32"
                >
                  {submitReport.isPending ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}