import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Save, 
  CalendarIcon,
  Loader2
} from 'lucide-react';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { useTrades, useWorkOrderMutations } from '@/hooks/useWorkOrders';
import { useSubcontractorsByTrade } from '@/hooks/useWorkOrderAssignment';
import { useToast } from '@/hooks/use-toast';
import { WorkOrderBreadcrumb } from '@/components/admin/work-orders/WorkOrderBreadcrumb';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const editWorkOrderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['received', 'assigned', 'in_progress', 'completed', 'cancelled', 'estimate_needed']),
  assigned_to: z.string().optional(),
  trade_id: z.string().min(1, 'Trade is required'),
  due_date: z.string().optional(),
  estimated_completion_date: z.string().optional(),
  estimated_hours: z.string().optional(),
  store_location: z.string().optional(),
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
});

type EditWorkOrderForm = z.infer<typeof editWorkOrderSchema>;

const statusOptions = [
  { value: 'received', label: 'Received' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'estimate_needed', label: 'Estimate Needed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const EditSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10" />
      <Skeleton className="h-8 w-64" />
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default function AdminWorkOrderEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: workOrder, isLoading: isLoadingWorkOrder, error } = useWorkOrderDetail(id!);
  const { data: trades } = useTrades();
  const { updateWorkOrder } = useWorkOrderMutations();

  const form = useForm<EditWorkOrderForm>({
    resolver: zodResolver(editWorkOrderSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'received',
      assigned_to: 'unassigned',
      trade_id: '',
      due_date: '',
      estimated_completion_date: '',
      estimated_hours: '',
      store_location: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
    },
  });

  const watchedTradeId = form.watch('trade_id');
  const watchedStatus = form.watch('status');
  const { data: subcontractors } = useSubcontractorsByTrade(watchedTradeId);

  // Populate form when work order data is loaded
  useEffect(() => {
    if (workOrder) {
      form.reset({
        title: workOrder.title || '',
        description: workOrder.description || '',
        status: workOrder.status,
        assigned_to: workOrder.assigned_to || 'unassigned',
        trade_id: workOrder.trade_id || '',
        due_date: workOrder.due_date || '',
        estimated_completion_date: workOrder.estimated_completion_date || '',
        estimated_hours: workOrder.estimated_hours?.toString() || '',
        store_location: workOrder.store_location || '',
        street_address: workOrder.street_address || '',
        city: workOrder.city || '',
        state: workOrder.state || '',
        zip_code: workOrder.zip_code || '',
      });
    }
  }, [workOrder, form]);

  if (!id) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">Invalid work order ID</p>
            <Button onClick={() => navigate('/admin/work-orders')} className="mt-4">
              Back to Work Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingWorkOrder) {
    return <EditSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-destructive">Error loading work order: {error.message}</p>
            <Button onClick={() => navigate('/admin/work-orders')} variant="outline">
              Back to Work Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">Work order not found</p>
            <Button onClick={() => navigate('/admin/work-orders')} variant="outline">
              Back to Work Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = async (data: EditWorkOrderForm) => {
    try {
      const updates: any = {
        title: data.title,
        description: data.description || null,
        status: data.status,
        trade_id: data.trade_id,
        due_date: data.due_date || null,
        estimated_completion_date: data.estimated_completion_date || null,
        estimated_hours: data.estimated_hours ? Number(data.estimated_hours) : null,
        store_location: data.store_location || null,
        street_address: data.street_address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
      };

      // Handle assignment
      if (data.assigned_to && data.assigned_to !== 'unassigned') {
        updates.assigned_to = data.assigned_to;
        updates.assigned_to_type = 'subcontractor';
        if (!workOrder.date_assigned) {
          updates.date_assigned = new Date().toISOString();
        }
      } else {
        updates.assigned_to = null;
        updates.assigned_to_type = null;
      }

      // Handle completion
      if (data.status === 'completed' && workOrder.status !== 'completed') {
        updates.date_completed = new Date().toISOString();
        updates.completed_at = new Date().toISOString();
      } else if (data.status !== 'completed' && workOrder.status === 'completed') {
        updates.date_completed = null;
        updates.completed_at = null;
      }

      await updateWorkOrder.mutateAsync({ id: workOrder.id, updates });
      
      toast({
        title: 'Work order updated successfully',
        description: 'The work order has been saved with your changes.',
      });
      
      navigate(`/admin/work-orders/${id}`);
    } catch (error) {
      console.error('Error updating work order:', error);
    }
  };

  const handleBackToDetail = () => {
    navigate(`/admin/work-orders/${id}`);
  };

  const showAssignmentFields = ['assigned', 'in_progress', 'completed'].includes(watchedStatus);

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <WorkOrderBreadcrumb />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleBackToDetail}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Edit Work Order {workOrder.work_order_number}
            </h1>
            <p className="text-muted-foreground">Update work order details</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter work order title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the work that needs to be done..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Trade & Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Trade & Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="trade_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trade *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {trades?.map((trade) => (
                            <SelectItem key={trade.id} value={trade.id}>
                              {trade.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showAssignmentFields && (
                  <FormField
                    control={form.control}
                    name="assigned_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Subcontractor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subcontractor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {subcontractors?.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                {sub.first_name} {sub.last_name}
                                
                                {sub.workload !== undefined && ` - ${sub.workload} active jobs`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline & Estimates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
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
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date?.toISOString().split('T')[0] || '')}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_completion_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Completion Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
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
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date?.toISOString().split('T')[0] || '')}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Hours</FormLabel>
                      <FormControl>
                         <Input 
                           type="number" 
                           placeholder="0" 
                           {...field}
                         />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card>
              <CardHeader>
                <CardTitle>Location Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="store_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Store #123, Main Branch" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="street_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleBackToDetail}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateWorkOrder.isPending}>
              {updateWorkOrder.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}