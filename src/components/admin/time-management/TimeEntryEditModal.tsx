import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TimeEntry, Employee, WorkOrder, Project } from '@/hooks/useTimeManagement';
import { AuditLogDisplay } from './AuditLogDisplay';
import { parseDateOnly } from '@/lib/utils/date';

const editTimeEntrySchema = z.object({
  report_date: z.date({ required_error: 'Date is required' }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  breakMinutes: z.number().min(0, 'Break time cannot be negative').optional(),
  hourly_rate_snapshot: z.number().min(0, 'Rate must be positive'),
  work_performed: z.string().min(1, 'Description is required'),
  notes: z.string().optional(),
  work_order_id: z.string().optional(),
  project_id: z.string().optional(),
});

type EditTimeEntryForm = z.infer<typeof editTimeEntrySchema>;

interface TimeEntryEditModalProps {
  entry: TimeEntry;
  onSave: (updatedEntry: TimeEntry) => void;
  onCancel: () => void;
  employees: Employee[];
  workOrders: WorkOrder[];
  projects: Project[];
}

export function TimeEntryEditModal({
  entry,
  onSave,
  onCancel,
  employees,
  workOrders,
  projects
}: TimeEntryEditModalProps) {
  
  // Helper functions
  const getTimeFromTimestamp = (timestamp?: string | null): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toTimeString().slice(0, 5); // HH:MM format
  };

  const calculateBreakMinutes = (): number => {
    // Check if entry has clock times in different possible property names
    const clockIn = entry.clock_in_time || (entry as any).clockInTime;
    const clockOut = entry.clock_out_time || (entry as any).clockOutTime;
    
    if (!clockIn || !clockOut) return 0;
    
    const clockInTime = new Date(clockIn);
    const clockOutTime = new Date(clockOut);
    const totalMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60);
    const hoursInMinutes = entry.hours_worked * 60;
    return Math.max(0, totalMinutes - hoursInMinutes);
  };

  const calculateHours = (start: string, end: string, breakMinutes: number = 0): number => {
    if (!start || !end) return 0;
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
    totalMinutes -= breakMinutes;
    return Math.max(0, totalMinutes / 60);
  };

  const createTimestamp = (date: Date, timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const timestamp = new Date(date);
    timestamp.setHours(hours, minutes, 0, 0);
    return timestamp.toISOString();
  };

  // Get initial time values, fallback to calculated times if not available
  const getInitialStartTime = (): string => {
    const clockIn = entry.clock_in_time || (entry as any).clockInTime;
    if (clockIn) return getTimeFromTimestamp(clockIn);
    // Fallback: assume 8-hour day ending at calculated end time
    return '08:00';
  };

  const getInitialEndTime = (): string => {
    const clockOut = entry.clock_out_time || (entry as any).clockOutTime;
    if (clockOut) return getTimeFromTimestamp(clockOut);
    // Fallback: calculate based on start time + hours worked
    const startTime = getInitialStartTime();
    const [startHour, startMin] = startTime.split(':').map(Number);
    const totalMinutes = startHour * 60 + startMin + (entry.hours_worked * 60);
    const endHour = Math.floor(totalMinutes / 60) % 24;
    const endMin = totalMinutes % 60;
    return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<EditTimeEntryForm>({
    resolver: zodResolver(editTimeEntrySchema),
    defaultValues: {
      report_date: parseDateOnly(entry.report_date),
      startTime: getInitialStartTime(),
      endTime: getInitialEndTime(),
      breakMinutes: Math.round(calculateBreakMinutes()),
      hourly_rate_snapshot: entry.hourly_rate_snapshot,
      work_performed: entry.work_performed,
      notes: entry.notes || '',
      work_order_id: entry.work_order_id || 'none',
      project_id: entry.project_id || 'none',
    }
  });

  const selectedDate = watch('report_date');
  const workOrderId = watch('work_order_id') || 'none';
  const projectId = watch('project_id') || 'none';
  
  const watchedValues = watch(['startTime', 'endTime', 'breakMinutes']);
  const calculatedHours = calculateHours(
    watchedValues[0], 
    watchedValues[1], 
    watchedValues[2] || 0
  );

  const onSubmit = (data: EditTimeEntryForm) => {
    const updatedEntry: TimeEntry = {
      ...entry,
      report_date: format(data.report_date, 'yyyy-MM-dd'),
      hours_worked: calculatedHours,
      hourly_rate_snapshot: data.hourly_rate_snapshot,
      work_performed: data.work_performed,
      notes: data.notes || '',
      work_order_id: data.work_order_id === 'none' ? null : data.work_order_id,
      project_id: data.project_id === 'none' ? null : data.project_id,
      total_labor_cost: calculatedHours * data.hourly_rate_snapshot,
      updated_at: new Date().toISOString(),
    };
    onSave(updatedEntry);
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => setValue('report_date', date!)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.report_date && (
                    <p className="text-sm text-destructive">{errors.report_date.message}</p>
                  )}
                </div>

                {/* Hourly Rate */}
                <div className="space-y-2">
                  <Label htmlFor="rate">Hourly Rate</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('hourly_rate_snapshot', { valueAsNumber: true })}
                  />
                  {errors.hourly_rate_snapshot && (
                    <p className="text-sm text-destructive">{errors.hourly_rate_snapshot.message}</p>
                  )}
                </div>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <div className="relative">
                    <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      {...register('startTime')}
                      className={cn("pl-8", errors.startTime && "border-destructive")}
                    />
                  </div>
                  {errors.startTime && (
                    <p className="text-sm text-destructive">{errors.startTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>End Time *</Label>
                  <div className="relative">
                    <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      {...register('endTime')}
                      className={cn("pl-8", errors.endTime && "border-destructive")}
                    />
                  </div>
                  {errors.endTime && (
                    <p className="text-sm text-destructive">{errors.endTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Break (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    {...register('breakMinutes', { valueAsNumber: true })}
                    className={errors.breakMinutes ? 'border-destructive' : ''}
                  />
                  {errors.breakMinutes && (
                    <p className="text-sm text-destructive">{errors.breakMinutes.message}</p>
                  )}
                </div>
              </div>

              {/* Calculated Hours Display */}
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-sm font-medium text-muted-foreground mb-1">Calculated Hours</div>
                <div className="text-xl font-bold text-primary">
                  {calculatedHours.toFixed(2)} hours
                </div>
                <div className="text-xs text-muted-foreground">
                  Total: ${(calculatedHours * (watch('hourly_rate_snapshot') || 0)).toFixed(2)}
                </div>
              </div>

              {/* Work Item Selection */}
              <div className="space-y-2">
                <Label>Work Item</Label>
                <div className="space-y-2">
                  <Select
                    value={workOrderId}
                    onValueChange={(value) => {
                      setValue('work_order_id', value === 'none' ? '' : value);
                      if (value && value !== 'none') setValue('project_id', 'none');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select work order..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No work order</SelectItem>
                      {workOrders.map((wo) => (
                        <SelectItem key={wo.id} value={wo.id}>
                          {wo.work_order_number} - {wo.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={projectId}
                    onValueChange={(value) => {
                      setValue('project_id', value === 'none' ? '' : value);
                      if (value && value !== 'none') setValue('work_order_id', 'none');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Or select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_number} - {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Work Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Work Performed</Label>
                <Textarea
                  id="description"
                  rows={3}
                  {...register('work_performed')}
                />
                {errors.work_performed && (
                  <p className="text-sm text-destructive">{errors.work_performed.message}</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  {...register('notes')}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </div>

          {/* Audit Log Section */}
          <div>
            <AuditLogDisplay timeEntryId={entry.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}