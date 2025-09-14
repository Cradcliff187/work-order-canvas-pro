import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { parseDateOnly } from '@/lib/utils/date';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimeReportReceipts } from "./TimeReportReceipts";
import { TimeReportMaterials } from "./TimeReportMaterials";
import { Clock, CalendarIcon, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const timeReportSchema = z.object({
  reportDate: z.date({
    required_error: "Report date is required",
  }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  workPerformed: z.string().min(10, "Please provide at least 10 characters describing the work performed"),
  materialsUsed: z.string().optional(),
  hoursWorked: z.coerce.number().min(0.1, "Hours worked must be greater than 0"),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    const start = new Date(`2000-01-01T${data.startTime}:00`);
    const end = new Date(`2000-01-01T${data.endTime}:00`);
    return end > start;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

export type TimeReportFormData = z.infer<typeof timeReportSchema>;

interface TimeReportFormProps {
  workOrderId: string;
  hourlyRate: number;
  existingReport?: any;
  editingReport?: any;
  isSubmitting: boolean;
  onSubmit: (data: TimeReportFormData & { receipts: File[] }) => Promise<void>;
  onCancel: () => void;
  onDateChange?: (date: Date) => void;
}

export function TimeReportForm({
  hourlyRate,
  existingReport,
  editingReport,
  isSubmitting,
  onSubmit,
  onCancel,
  onDateChange,
}: TimeReportFormProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const form = useForm<TimeReportFormData>({
    resolver: zodResolver(timeReportSchema),
    defaultValues: {
      reportDate: new Date(),
      startTime: "08:00",
      endTime: "16:00",
      workPerformed: "",
      materialsUsed: "",
      hoursWorked: 8,
      notes: "",
    },
  });

  const watchedDate = form.watch("reportDate");
  const watchedStartTime = form.watch("startTime");
  const watchedEndTime = form.watch("endTime");
  const watchedHours = form.watch("hoursWorked");
  
  // Auto-calculate hours from start/end times
  const autoCalculatedHours = React.useMemo(() => {
    if (watchedStartTime && watchedEndTime) {
      const start = new Date(`2000-01-01T${watchedStartTime}:00`);
      const end = new Date(`2000-01-01T${watchedEndTime}:00`);
      if (end > start) {
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
    }
    return 0;
  }, [watchedStartTime, watchedEndTime]);
  
  // Update hours when start/end time changes
  React.useEffect(() => {
    if (autoCalculatedHours > 0 && autoCalculatedHours !== watchedHours) {
      form.setValue("hoursWorked", autoCalculatedHours);
    }
  }, [autoCalculatedHours, watchedHours, form]);
  
  const calculatedLaborCost = (watchedHours || 0) * hourlyRate;

  // Notify parent of date changes
  useEffect(() => {
    if (onDateChange && watchedDate) {
      onDateChange(watchedDate);
    }
  }, [watchedDate, onDateChange]);

  // Populate form when editing
  useEffect(() => {
    if (editingReport) {
      form.setValue("workPerformed", editingReport.work_performed || "");
      form.setValue("materialsUsed", editingReport.materials_used || "");
      form.setValue("hoursWorked", editingReport.hours_worked || 0);
      form.setValue("notes", editingReport.notes || "");
      form.setValue("reportDate", parseDateOnly(editingReport.report_date));
      
      // Extract times from clock_in_time and clock_out_time if available
      if (editingReport.clock_in_time) {
        const clockInTime = new Date(editingReport.clock_in_time);
        form.setValue("startTime", clockInTime.toTimeString().slice(0, 5));
      }
      if (editingReport.clock_out_time) {
        const clockOutTime = new Date(editingReport.clock_out_time);
        form.setValue("endTime", clockOutTime.toTimeString().slice(0, 5));
      }
    }
  }, [editingReport, form]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
  }, []);

  const handleSubmit = async (data: TimeReportFormData) => {
    await onSubmit({ ...data, receipts: selectedFiles });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Time Report Details</CardTitle>
          {editingReport && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCancel}
            >
              Cancel Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

            {/* Time Range */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
            <TimeReportMaterials disabled={isSubmitting} />

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
            <TimeReportReceipts
              onFilesSelected={handleFilesSelected}
              disabled={isSubmitting}
            />

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
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || (existingReport && !editingReport)}
                className="min-w-32"
              >
                {isSubmitting ? (
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
  );
}