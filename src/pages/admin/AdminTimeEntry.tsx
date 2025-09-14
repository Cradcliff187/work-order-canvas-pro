import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/utils/date';
import { CalendarIcon, Clock, Plus, Edit, Trash2, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAdminTimeEntry } from '@/hooks/useAdminTimeEntry';

import { ReceiptAttachmentSection } from '@/components/admin/ReceiptAttachmentSection';
import { CSVImportModal } from '@/components/admin/CSVImportModal';

const timeEntrySchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  workItemId: z.string().min(1, 'Work order or project is required'),
  date: z.date({ required_error: 'Date is required' }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  breakMinutes: z.number().min(0, 'Break time cannot be negative').optional(),
  workPerformed: z.string().min(1, 'Work performed description is required'),
  materialsCost: z.number().min(0, 'Materials cost cannot be negative').optional(),
});

type TimeEntryForm = z.infer<typeof timeEntrySchema>;

interface ReceiptAttachment {
  receipt_id: string;
  allocated_amount: number;
}

export default function AdminTimeEntry() {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [receiptAttachments, setReceiptAttachments] = useState<ReceiptAttachment[]>([]);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const {
    employees,
    workOrders,
    projects,
    recentEntries,
    employeeReceipts,
    isLoading,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    refetch,
  } = useAdminTimeEntry();

  const form = useForm<TimeEntryForm>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      date: new Date(),
      startTime: '08:00',
      endTime: '17:00',
      breakMinutes: 0,
      materialsCost: 0,
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

  // Helper function to convert date and time to ISO timestamp
  const createTimestamp = (date: Date, timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const timestamp = new Date(date);
    timestamp.setHours(hours, minutes, 0, 0);
    return timestamp.toISOString();
  };

  const onSubmit = async (data: TimeEntryForm) => {
    try {
      const employee = employees?.find(emp => emp.id === data.employeeId);
      if (!employee) {
        toast({
          title: "Error",
          description: "Selected employee not found",
          variant: "destructive",
        });
        return;
      }

      // Calculate hours from time inputs
      const calculatedHours = calculateHours(data.startTime, data.endTime, data.breakMinutes || 0);

      if (calculatedHours <= 0) {
        toast({
          title: "Error",
          description: "Invalid time range. End time must be after start time.",
          variant: "destructive",
        });
        return;
      }

      // Parse the prefixed value
      const [type, id] = data.workItemId.split('_');

      const entryData = {
        employee_user_id: data.employeeId,
        work_order_id: type === 'wo' ? id : undefined,
        project_id: type === 'proj' ? id : undefined,
        report_date: format(data.date, 'yyyy-MM-dd'),
        hours_worked: calculatedHours,
        work_performed: data.workPerformed,
        hourly_rate_snapshot: employee.hourly_billable_rate || 0,
        notes: 'Added by admin',
        clock_in_time: createTimestamp(data.date, data.startTime),
        clock_out_time: createTimestamp(data.date, data.endTime),
        is_retroactive: true, // Admin entries are always retroactive
        approval_status: 'approved' as const, // Admin entries are pre-approved
        approved_by: employee.id, // Set admin as approver
        approved_at: new Date().toISOString(), // Set approval timestamp
        receipt_attachments: receiptAttachments.length > 0 ? receiptAttachments : undefined,
      };

      await createTimeEntry.mutateAsync(entryData);
      
      // Reset form but keep employee selected for batch entry
      form.reset({
        employeeId: data.employeeId,
        workItemId: '',
        date: new Date(),
        startTime: '08:00',
        endTime: '17:00',
        breakMinutes: 0,
        workPerformed: '',
        materialsCost: 0,
      });
      
      // Clear receipt attachments
      setReceiptAttachments([]);
      
      toast({
        title: "Success",
        description: "Time entry added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add time entry",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteTimeEntry.mutateAsync(entryId);
      toast({
        title: "Success",
        description: "Time entry deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete time entry",
        variant: "destructive",
      });
    }
  };

  const handleMaterialsCostUpdate = (cost: number) => {
    form.setValue('materialsCost', cost);
  };

  const handleEmployeeChange = (employeeId: string) => {
    const selectedEmployee = employees?.find(emp => emp.id === employeeId);
    
    if (selectedEmployee && !selectedEmployee.hourly_billable_rate) {
      toast({
        title: "Error",
        description: `${selectedEmployee.first_name} ${selectedEmployee.last_name} doesn't have an hourly rate set. Please set their rate in Employee Management first.`,
        variant: "destructive",
      });
      form.setValue('employeeId', '');
      return;
    }
    
    form.setValue('employeeId', employeeId);
  };


  const watchedEmployee = form.watch('employeeId');
  const selectedEmployeeData = employees?.find(emp => emp.id === watchedEmployee);
  const watchedStartTime = form.watch('startTime');
  const watchedEndTime = form.watch('endTime');
  const watchedBreakMinutes = form.watch('breakMinutes') || 0;
  const calculatedHours = calculateHours(watchedStartTime, watchedEndTime, watchedBreakMinutes);
  const calculatedLabor = calculatedHours * (selectedEmployeeData?.hourly_billable_rate || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Time Entry</h1>
          <p className="text-muted-foreground">
            Add time entries for internal team members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowImportModal(true)} variant="outline">
            <FileUp className="h-4 w-4 mr-2" />
            Import from CSV
          </Button>
        </div>
      </div>

      {/* Time Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Time Entry</CardTitle>
          <CardDescription>
            Enter time worked by internal employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee Selector */}
              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Select
                  value={form.watch('employeeId')}
                  onValueChange={handleEmployeeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{employee.first_name} {employee.last_name}</span>
                          {employee.hourly_billable_rate ? (
                            <span className="text-sm text-emerald-600 dark:text-emerald-400">
                              (Rate: ${employee.hourly_billable_rate}/hr)
                            </span>
                          ) : (
                            <span className="text-sm text-destructive font-medium">
                              (No rate set)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.employeeId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.employeeId.message}
                  </p>
                )}
              </div>

              {/* Work Item Selector */}
              <div className="space-y-2">
                <Label htmlFor="workItem">Work Order / Project</Label>
                <Select
                  value={form.watch('workItemId')}
                  onValueChange={(value) => form.setValue('workItemId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select work order or project" />
                  </SelectTrigger>
                  <SelectContent>
                    {workOrders && workOrders.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                          Work Orders
                        </div>
                        {workOrders.map((workOrder) => (
                          <SelectItem key={workOrder.id} value={`wo_${workOrder.id}`}>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                {workOrder.work_order_number} - {workOrder.title}
                                <Badge variant="secondary" className="text-xs">
                                  {workOrder.status}
                                </Badge>
                              </div>
                              {workOrder.store_location && (
                                <div className="text-xs text-muted-foreground">
                                  {workOrder.store_location}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {projects && projects.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                          Projects
                        </div>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={`proj_${project.id}`}>
                            <div className="flex flex-col">
                              <div>
                                {project.project_number} - {project.name}
                              </div>
                              {project.location_address && (
                                <div className="text-xs text-muted-foreground">
                                  {project.location_address}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.workItemId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.workItemId.message}
                  </p>
                )}
              </div>

              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch('date') && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('date') ? format(form.watch('date'), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch('date')}
                      onSelect={(date) => date && form.setValue('date', date)}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.date && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              {/* Time Tracking */}
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register('startTime')}
                />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.startTime.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...form.register('endTime')}
                />
                {form.formState.errors.endTime && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.endTime.message}
                  </p>
                )}
              </div>

              {/* Break Time (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="breakMinutes">Break Time (minutes)</Label>
                <Input
                  id="breakMinutes"
                  type="number"
                  min="0"
                  placeholder="0"
                  {...form.register('breakMinutes', { valueAsNumber: true })}
                />
                {form.formState.errors.breakMinutes && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.breakMinutes.message}
                  </p>
                )}
              </div>

              {/* Calculated Hours Display */}
              <div className="space-y-2">
                <Label>Total Hours</Label>
                <div className="text-lg font-semibold text-primary">
                  {calculatedHours.toFixed(2)} hours
                </div>
                {calculatedLabor > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Labor cost: ${calculatedLabor.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Materials Cost */}
              <div className="space-y-2">
                <Label htmlFor="materialsCost">Materials Cost (Optional)</Label>
                <Input
                  id="materialsCost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...form.register('materialsCost', { valueAsNumber: true })}
                />
                {form.formState.errors.materialsCost && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.materialsCost.message}
                  </p>
                )}
              </div>
            </div>

            {/* Work Performed */}
            <div className="space-y-2">
              <Label htmlFor="workPerformed">Work Performed</Label>
              <Textarea
                id="workPerformed"
                placeholder="Describe the work performed..."
                {...form.register('workPerformed')}
              />
              {form.formState.errors.workPerformed && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.workPerformed.message}
                </p>
              )}
            </div>

            {/* Receipt Attachments */}
            <ReceiptAttachmentSection
              receipts={employeeReceipts || []}
              selectedEmployee={watchedEmployee}
              attachments={receiptAttachments}
              onAttachmentsChange={setReceiptAttachments}
              onMaterialsCostUpdate={handleMaterialsCostUpdate}
              disabled={createTimeEntry.isPending || isLoading}
              className="mt-6"
            />

            <Button type="submit" disabled={createTimeEntry.isPending || isLoading || !selectedEmployeeData?.hourly_billable_rate} className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
          <CardDescription>
            Last 20 time entries (sorted by date, newest first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEntries?.length === 0 ? (
            <EmptyTableState
              icon={Clock}
              title="No time entries found"
              description="Add your first time entry above"
              colSpan={6}
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Work Item</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Labor Cost</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEntries?.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(parseDateOnly(entry.report_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {entry.employee?.first_name} {entry.employee?.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.employee?.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.work_order ? (
                          <>
                            <div className="font-medium">
                              {entry.work_order.work_order_number}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {entry.work_order.title}
                            </div>
                          </>
                        ) : entry.project ? (
                          <>
                            <div className="font-medium">
                              {entry.project.project_number}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {entry.project.name}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">No work item</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.hours_worked}h
                      </TableCell>
                      <TableCell className="text-right">
                        ${entry.total_labor_cost?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        <TableActionsDropdown
                          actions={[
                            {
                              label: 'Edit',
                              onClick: () => handleEdit(entry),
                              icon: Edit,
                            },
                            {
                              label: 'Delete',
                              onClick: () => handleDelete(entry.id),
                              icon: Trash2,
                              variant: 'destructive',
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Import Modal */}
      <CSVImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={() => {
          refetch();
          setShowImportModal(false);
        }}
      />
    </div>
  );
}
