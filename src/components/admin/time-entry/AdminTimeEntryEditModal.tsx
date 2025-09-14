import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/utils/date';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReceiptAttachmentSection } from '@/components/admin/ReceiptAttachmentSection';

import type { Employee, WorkOrder, Project, TimeEntry } from '@/hooks/useAdminTimeEntry';

const editTimeEntrySchema = z.object({
  date: z.date({ required_error: 'Date is required' }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  breakMinutes: z.number().min(0, 'Break time cannot be negative').optional(),
  workPerformed: z.string().min(1, 'Work performed description is required'),
  materialsCost: z.number().min(0, 'Materials cost cannot be negative').optional(),
  workItemId: z.string().min(1, 'Work order or project is required'),
});

type EditTimeEntryForm = z.infer<typeof editTimeEntrySchema>;

interface ReceiptAttachment {
  receipt_id: string;
  allocated_amount: number;
}

interface AdminTimeEntryEditModalProps {
  entry: TimeEntry;
  onSave: (entryId: string, data: any) => void;
  onCancel: () => void;
  employees: Employee[];
  workOrders: WorkOrder[];
  projects: Project[];
  employeeReceipts?: any[];
  isLoading?: boolean;
}

export function AdminTimeEntryEditModal({
  entry,
  onSave,
  onCancel,
  employees,
  workOrders,
  projects,
  employeeReceipts = [],
  isLoading = false,
}: AdminTimeEntryEditModalProps) {
  const [receiptAttachments, setReceiptAttachments] = useState<ReceiptAttachment[]>([]);

  // Convert time entry back to form format
  const getTimeFromTimestamp = (timestamp: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toTimeString().slice(0, 5); // HH:MM format
  };

  const calculateBreakMinutes = (): number => {
    if (!entry.clock_in_time || !entry.clock_out_time) return 0;
    const clockIn = new Date(entry.clock_in_time);
    const clockOut = new Date(entry.clock_out_time);
    const totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
    const hoursInMinutes = entry.hours_worked * 60;
    return Math.max(0, totalMinutes - hoursInMinutes);
  };

  const getCurrentWorkItemId = (): string => {
    if (entry.work_order_id) return `wo_${entry.work_order_id}`;
    if (entry.project_id) return `proj_${entry.project_id}`;
    return '';
  };

  const form = useForm<EditTimeEntryForm>({
    resolver: zodResolver(editTimeEntrySchema),
    defaultValues: {
      date: parseDateOnly(entry.report_date),
      startTime: getTimeFromTimestamp(entry.clock_in_time || '08:00'),
      endTime: getTimeFromTimestamp(entry.clock_out_time || '17:00'),
      breakMinutes: Math.round(calculateBreakMinutes()),
      workPerformed: entry.work_performed || '',
      materialsCost: 0, // Default since this isn't stored in the time entry
      workItemId: getCurrentWorkItemId(),
    },
  });

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

  const watchedValues = form.watch(['startTime', 'endTime', 'breakMinutes']);
  const calculatedHours = calculateHours(
    watchedValues[0], 
    watchedValues[1], 
    watchedValues[2] || 0
  );

  const handleMaterialsCostUpdate = (cost: number) => {
    form.setValue('materialsCost', cost);
  };

  const onSubmit = (data: EditTimeEntryForm) => {
    const employee = employees?.find(emp => emp.id === entry.employee_user_id);
    if (!employee) return;

    // Parse the prefixed value
    const [type, id] = data.workItemId.split('_');

    const updateData = {
      work_order_id: type === 'wo' ? id : null,
      project_id: type === 'proj' ? id : null,
      report_date: format(data.date, 'yyyy-MM-dd'),
      hours_worked: calculatedHours,
      work_performed: data.workPerformed,
      clock_in_time: createTimestamp(data.date, data.startTime),
      clock_out_time: createTimestamp(data.date, data.endTime),
      receipt_attachments: receiptAttachments.length > 0 ? receiptAttachments : undefined,
    };

    onSave(entry.id, updateData);
  };

  const employee = employees?.find(emp => emp.id === entry.employee_user_id);

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
          <DialogDescription>
            Update the time entry details for {employee?.first_name} {employee?.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Employee Display (Read-only) */}
          <div className="grid gap-2">
            <Label>Employee</Label>
            <Input
              value={`${employee?.first_name} ${employee?.last_name} (${employee?.email})`}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Work Order/Project Selection */}
          <div className="grid gap-2">
            <Label>Work Order / Project *</Label>
            <Select 
              value={form.watch('workItemId')} 
              onValueChange={(value) => form.setValue('workItemId', value)}
            >
              <SelectTrigger className={form.formState.errors.workItemId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select work order or project" />
              </SelectTrigger>
              <SelectContent>
                {workOrders?.map((wo) => (
                  <SelectItem key={`wo_${wo.id}`} value={`wo_${wo.id}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">WO</span>
                      {wo.number} - {wo.title}
                    </div>
                  </SelectItem>
                ))}
                {projects?.map((proj) => (
                  <SelectItem key={`proj_${proj.id}`} value={`proj_${proj.id}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">PROJ</span>
                      {proj.number} - {proj.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.workItemId && (
              <p className="text-sm text-destructive">{form.formState.errors.workItemId.message}</p>
            )}
          </div>

          {/* Date Selection */}
          <div className="grid gap-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !form.watch('date') && "text-muted-foreground",
                    form.formState.errors.date && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch('date') ? format(form.watch('date'), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch('date')}
                  onSelect={(date) => date && form.setValue('date', date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.date && (
              <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
            )}
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Start Time *</Label>
              <div className="relative">
                <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  {...form.register('startTime')}
                  className={cn("pl-8", form.formState.errors.startTime && "border-destructive")}
                />
              </div>
              {form.formState.errors.startTime && (
                <p className="text-sm text-destructive">{form.formState.errors.startTime.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>End Time *</Label>
              <div className="relative">
                <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  {...form.register('endTime')}
                  className={cn("pl-8", form.formState.errors.endTime && "border-destructive")}
                />
              </div>
              {form.formState.errors.endTime && (
                <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Break (minutes)</Label>
              <Input
                type="number"
                min="0"
                {...form.register('breakMinutes', { valueAsNumber: true })}
                className={form.formState.errors.breakMinutes ? 'border-destructive' : ''}
              />
              {form.formState.errors.breakMinutes && (
                <p className="text-sm text-destructive">{form.formState.errors.breakMinutes.message}</p>
              )}
            </div>
          </div>

          {/* Calculated Hours Display */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Calculated Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {calculatedHours.toFixed(2)} hours
              </div>
              <p className="text-sm text-muted-foreground">
                Based on start time, end time, and break duration
              </p>
            </CardContent>
          </Card>

          {/* Work Performed */}
          <div className="grid gap-2">
            <Label>Work Performed *</Label>
            <Textarea
              placeholder="Describe the work that was performed..."
              className={cn("min-h-[100px]", form.formState.errors.workPerformed && "border-destructive")}
              {...form.register('workPerformed')}
            />
            {form.formState.errors.workPerformed && (
              <p className="text-sm text-destructive">{form.formState.errors.workPerformed.message}</p>
            )}
          </div>

          {/* Receipt Attachments */}
          <ReceiptAttachmentSection
            receipts={employeeReceipts.filter(receipt => 
              receipt.employee_user_id === entry.employee_user_id
            )}
            selectedEmployee={entry.employee_user_id}
            attachments={receiptAttachments}
            onAttachmentsChange={setReceiptAttachments}
            onMaterialsCostUpdate={handleMaterialsCostUpdate}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}