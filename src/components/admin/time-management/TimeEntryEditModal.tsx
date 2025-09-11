import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TimeEntry, Employee, WorkOrder, Project } from '@/hooks/useTimeManagement';
import { AuditLogDisplay } from './AuditLogDisplay';

const editTimeEntrySchema = z.object({
  report_date: z.date({ required_error: 'Date is required' }),
  hours_worked: z.number().min(0.25, 'Hours must be at least 0.25').max(24, 'Hours cannot exceed 24'),
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
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<EditTimeEntryForm>({
    resolver: zodResolver(editTimeEntrySchema),
    defaultValues: {
      report_date: new Date(entry.report_date),
      hours_worked: entry.hours_worked,
      hourly_rate_snapshot: entry.hourly_rate_snapshot,
      work_performed: entry.work_performed,
      notes: entry.notes || '',
      work_order_id: entry.work_order_id || '',
      project_id: entry.project_id || '',
    }
  });

  const selectedDate = watch('report_date');
  const workOrderId = watch('work_order_id');
  const projectId = watch('project_id');

  const onSubmit = (data: EditTimeEntryForm) => {
    const updatedEntry: TimeEntry = {
      ...entry,
      ...data,
      report_date: format(data.report_date, 'yyyy-MM-dd'),
      total_labor_cost: data.hours_worked * data.hourly_rate_snapshot,
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
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.report_date && (
                    <p className="text-sm text-destructive">{errors.report_date.message}</p>
                  )}
                </div>

                {/* Hours */}
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours Worked</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    {...register('hours_worked', { valueAsNumber: true })}
                  />
                  {errors.hours_worked && (
                    <p className="text-sm text-destructive">{errors.hours_worked.message}</p>
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

                {/* Work Item Selection */}
                <div className="space-y-2">
                  <Label>Work Item</Label>
                  <div className="space-y-2">
                    <Select
                      value={workOrderId}
                      onValueChange={(value) => {
                        setValue('work_order_id', value);
                        if (value) setValue('project_id', '');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select work order..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No work order</SelectItem>
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
                        setValue('project_id', value);
                        if (value) setValue('work_order_id', '');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Or select project..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.project_number} - {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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