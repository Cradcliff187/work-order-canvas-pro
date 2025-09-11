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
import { CalendarIcon, Clock, Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAdminTimeEntry } from '@/hooks/useAdminTimeEntry';

import { ReceiptAttachmentSection } from '@/components/admin/ReceiptAttachmentSection';

const timeEntrySchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  workItemId: z.string().min(1, 'Work order or project is required'),
  workItemType: z.enum(['work_order', 'project']),
  date: z.date({ required_error: 'Date is required' }),
  hours: z.number().min(0.25, 'Minimum 0.25 hours').max(24, 'Maximum 24 hours'),
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
      hours: 8,
      materialsCost: 0,
      workItemType: 'work_order',
    },
  });

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

      const entryData = {
        employee_user_id: data.employeeId,
        work_order_id: data.workItemType === 'work_order' ? data.workItemId : undefined,
        project_id: data.workItemType === 'project' ? data.workItemId : undefined,
        report_date: format(data.date, 'yyyy-MM-dd'),
        hours_worked: data.hours,
        work_performed: data.workPerformed,
        materials_used: data.materialsCost || 0,
        hourly_rate_snapshot: employee.hourly_billable_rate || 0,
        total_labor_cost: data.hours * (employee.hourly_billable_rate || 0),
        notes: 'Added by admin',
        receipt_attachments: receiptAttachments.length > 0 ? receiptAttachments : undefined,
      };

      await createTimeEntry.mutateAsync(entryData);
      
      // Reset form but keep employee selected for batch entry
      form.reset({
        employeeId: data.employeeId,
        workItemId: '',
        workItemType: 'work_order',
        date: new Date(),
        hours: 8,
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

  const watchedEmployee = form.watch('employeeId');
  const selectedEmployeeData = employees?.find(emp => emp.id === watchedEmployee);
  const watchedHours = form.watch('hours');
  const calculatedLabor = watchedHours * (selectedEmployeeData?.hourly_billable_rate || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Employee Time Entry</h1>
        <p className="text-muted-foreground">
          Add time entries for internal team members
        </p>
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
                  onValueChange={(value) => form.setValue('employeeId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} (Rate: ${employee.hourly_billable_rate || 0}/hr)
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
                  onValueChange={(value) => {
                    form.setValue('workItemId', value);
                    // Auto-detect type based on selection
                    const isWorkOrder = workOrders?.some(wo => wo.id === value);
                    form.setValue('workItemType', isWorkOrder ? 'work_order' : 'project');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select work order or project" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      Work Orders
                    </div>
                    {workOrders?.map((workOrder) => (
                      <SelectItem key={workOrder.id} value={workOrder.id}>
                        {workOrder.work_order_number} - {workOrder.title}
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {workOrder.status}
                        </Badge>
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      Projects
                    </div>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_number} - {project.name}
                      </SelectItem>
                    ))}
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

              {/* Hours Worked */}
              <div className="space-y-2">
                <Label htmlFor="hours">Hours Worked</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  {...form.register('hours', { valueAsNumber: true })}
                />
                {form.formState.errors.hours && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.hours.message}
                  </p>
                )}
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

            <Button type="submit" disabled={createTimeEntry.isPending || isLoading} className="mt-6">
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
                        {format(new Date(entry.report_date), 'MMM d, yyyy')}
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
    </div>
  );
}
