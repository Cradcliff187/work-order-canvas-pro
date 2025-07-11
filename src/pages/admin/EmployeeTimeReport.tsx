import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEmployeeReports } from "@/hooks/useEmployeeReports";
import { FileUpload } from "@/components/FileUpload";
import { ArrowLeft, Clock, CalendarIcon, Save, Edit, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const timeReportSchema = z.object({
  reportDate: z.date({
    required_error: "Report date is required",
  }),
  workPerformed: z.string().min(10, "Please provide at least 10 characters describing the work performed"),
  materialsUsed: z.string().optional(),
  hoursWorked: z.coerce.number().min(0.1, "Hours worked must be greater than 0"),
  notes: z.string().optional(),
});

type TimeReportFormData = z.infer<typeof timeReportSchema>;

export default function EmployeeTimeReport() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { getWorkOrder, getExistingTimeReport, submitTimeReport, employeeProfile } = useEmployeeReports();
  const workOrderQuery = getWorkOrder(workOrderId!);
  const profileQuery = employeeProfile;
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editingReport, setEditingReport] = useState<any>(null);
  
  const form = useForm<TimeReportFormData>({
    resolver: zodResolver(timeReportSchema),
    defaultValues: {
      reportDate: new Date(),
      workPerformed: "",
      materialsUsed: "",
      hoursWorked: 0,
      notes: "",
    },
  });

  const watchedDate = form.watch("reportDate");
  const watchedHours = form.watch("hoursWorked");
  const hourlyRate = profileQuery.data?.hourly_cost_rate || 0;
  const calculatedLaborCost = (watchedHours || 0) * hourlyRate;

  // Check for existing report when date changes
  const existingReportQuery = getExistingTimeReport(
    workOrderId!,
    watchedDate ? format(watchedDate, "yyyy-MM-dd") : ""
  );

  const existingReport = existingReportQuery.data;

  // Populate form when editing
  useEffect(() => {
    if (editingReport) {
      form.setValue("workPerformed", editingReport.work_performed || "");
      form.setValue("materialsUsed", editingReport.materials_used || "");
      form.setValue("hoursWorked", editingReport.hours_worked || 0);
      form.setValue("notes", editingReport.notes || "");
      form.setValue("reportDate", new Date(editingReport.report_date));
    }
  }, [editingReport, form]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
  }, []);

  const handleEditExisting = () => {
    if (existingReport) {
      setEditingReport(existingReport);
    }
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
    form.reset({
      reportDate: new Date(),
      workPerformed: "",
      materialsUsed: "",
      hoursWorked: 0,
      notes: "",
    });
  };

  const onSubmit = async (data: TimeReportFormData) => {
    if (!workOrderId) return;

    try {
      await submitTimeReport.mutateAsync({
        workOrderId,
        reportDate: data.reportDate.toISOString().split('T')[0],
        workPerformed: data.workPerformed,
        materialsUsed: data.materialsUsed,
        hoursWorked: data.hoursWorked,
        notes: data.notes,
        receipts: selectedFiles,
        existingReportId: editingReport?.id,
      });

      navigate("/admin/time-reports");
    } catch (error) {
      console.error("Error submitting time report:", error);
    }
  };

  if (workOrderQuery.isLoading || profileQuery.isLoading) {
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
          <Link to="/admin/work-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Work order not found or you don't have access to submit a time report for it.
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
        <Link to={`/admin/work-orders/${workOrderId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {editingReport ? "Edit Time Report" : "Submit Time Report"}
          </h1>
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

      {/* Existing Report Alert */}
      {existingReport && !editingReport && watchedDate && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>
              A time report already exists for {format(watchedDate, "PPP")}. 
              Hours: {existingReport.hours_worked}, Labor Cost: ${existingReport.total_labor_cost?.toFixed(2) || '0.00'}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEditExisting}
              className="ml-4"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Report
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Time Report Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Time Report Details</CardTitle>
            {editingReport && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancelEdit}
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Report Date */}
              <FormField
                control={form.control}
                name="reportDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Report Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              {/* Hours and Labor Cost */}
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="hoursWorked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours Worked *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="8.0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Hourly Rate</FormLabel>
                  <Input
                    type="text"
                    value={`$${hourlyRate.toFixed(2)}`}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <FormLabel>Labor Cost</FormLabel>
                  <Input
                    type="text"
                    value={`$${calculatedLaborCost.toFixed(2)}`}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Receipt Upload */}
              <div className="space-y-4">
                <div>
                  <FormLabel>Receipt Attachments</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Upload receipts for materials or expenses (up to 10 files, max 10MB each)
                  </p>
                </div>
                
                <FileUpload
                  onFilesSelected={handleFilesSelected}
                  maxFiles={10}
                  maxSizeBytes={10 * 1024 * 1024}
                  disabled={submitTimeReport.isPending}
                />
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
                <Link to={`/admin/work-orders/${workOrderId}`}>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={submitTimeReport.isPending || (existingReport && !editingReport)}
                  className="min-w-32"
                >
                  {submitTimeReport.isPending ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : editingReport ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Time Report
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Submit Time Report
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