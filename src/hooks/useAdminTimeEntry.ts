import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  hourly_billable_rate: number | null;
  hourly_cost_rate: number | null;
}

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  status: string;
  store_location?: string;
}

interface Project {
  id: string;
  project_number: string;
  name: string;
  status: string;
  location_address?: string;
}

interface TimeEntryData {
  employee_user_id: string;
  work_order_id?: string;
  project_id?: string;
  report_date: string;
  hours_worked: number;
  work_performed: string;
  hourly_rate_snapshot: number;
  notes?: string;
  clock_in_time: string;
  clock_out_time: string;
  is_retroactive: boolean;
  approval_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  receipt_attachments?: {
    receipt_id: string;
    allocated_amount: number;
  }[];
}

interface TimeEntry {
  id: string;
  report_date: string;
  hours_worked: number;
  total_labor_cost: number | null;
  work_performed: string;
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  work_order?: {
    work_order_number: string;
    title: string;
  };
  project?: {
    project_number: string;
    name: string;
  };
}

export function useAdminTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch internal employees
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['admin-time-entry-employees'],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          hourly_billable_rate,
          hourly_cost_rate,
          organization_members!inner(
            organization:organizations!inner(
              organization_type
            )
          )
        `)
        .eq('organization_members.organizations.organization_type', 'internal')
        .eq('is_employee', true)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch active internal work orders
  const { data: workOrders, isLoading: workOrdersLoading } = useQuery({
    queryKey: ['admin-time-entry-work-orders'],
    queryFn: async (): Promise<WorkOrder[]> => {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id,
          work_order_number,
          title,
          status,
          store_location,
          assigned_organization:organizations!assigned_organization_id(
            organization_type
          )
        `)
        .eq('assigned_organization.organization_type', 'internal')
        .in('status', ['assigned', 'in_progress', 'completed'])
        .order('work_order_number', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch internal projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['admin-time-entry-projects'],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          project_number,
          name,
          status,
          location_address
        `)
        .in('status', ['planning', 'active', 'on_hold'])
        .order('project_number', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent time entries
  const { data: recentEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ['admin-time-entry-recent'],
    queryFn: async (): Promise<TimeEntry[]> => {
      const { data, error } = await supabase
        .from('employee_reports')
        .select(`
          id,
          report_date,
          hours_worked,
          total_labor_cost,
          work_performed,
          employee:profiles!employee_user_id(
            first_name,
            last_name,
            email
          ),
          work_order:work_orders!work_order_id(
            work_order_number,
            title
          ),
          project:projects!project_id(
            project_number,
            name
          )
        `)
        .order('report_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch employee receipts for selection
  const { data: employeeReceipts, isLoading: receiptsLoading } = useQuery({
    queryKey: ['admin-employee-receipts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          id,
          vendor_name,
          amount,
          receipt_date,
          description,
          receipt_image_url,
          employee_user_id,
          receipt_work_orders (
            allocated_amount
          )
        `)
        .order('receipt_date', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
  });

  // Create time entry mutation
  const createTimeEntry = useMutation({
    mutationFn: async (data: TimeEntryData) => {
      // Extract receipt_attachments from data since it's not part of employee_reports table
      const { receipt_attachments, ...timeEntryData } = data;
      
      // Insert the employee report and capture the returned ID
      const { data: reportData, error } = await supabase
        .from('employee_reports')
        .insert([timeEntryData])
        .select()
        .single();
      
      if (error) throw error;

      // Link selected receipts to the work order (not time entry)
      if (receipt_attachments?.length > 0 && reportData.work_order_id) {
        const receiptLinks = receipt_attachments.map(attachment => ({
          receipt_id: attachment.receipt_id,
          work_order_id: reportData.work_order_id,
          allocated_amount: attachment.allocated_amount
        }));
        
        const { error: linkError } = await supabase
          .from('receipt_work_orders')
          .insert(receiptLinks);
          
        if (linkError) throw linkError;
      }
      return reportData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-entry-recent'] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-entry-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-entry-projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-employee-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
      toast({
        title: "Success",
        description: "Time entry added successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Time entry creation error:', error);
      toast({
        title: "Error",
        description: `Failed to add time entry: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update time entry mutation
  const updateTimeEntry = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Omit<TimeEntryData, 'receipt_attachments'>>) => {
      // Sanitize payload to only include columns that exist on employee_reports
      const allowedKeys = [
        'employee_user_id',
        'work_order_id',
        'project_id',
        'report_date',
        'hours_worked',
        'work_performed',
        'hourly_rate_snapshot',
        'notes',
        'clock_in_time',
        'clock_out_time',
        'is_retroactive',
        'approval_status',
        'is_overtime',
      ] as const;

      const payload: Record<string, any> = {};
      for (const key of allowedKeys) {
        if (key in (data as any)) {
          payload[key] = (data as any)[key];
        }
      }

      const { error } = await supabase
        .from('employee_reports')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-entry-recent'] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-entry-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-entry-projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
      toast({
        title: "Success",
        description: "Time entry updated successfully",
      });
    },
    onError: (error: any) => {
      const friendly = error?.code === 'PGRST116' || /payload|unexpected|column/i.test(error?.message || '')
        ? 'Some fields were not allowed. Please try again.'
        : error?.message;
      toast({
        title: "Error",
        description: `Failed to update time entry: ${friendly}`,
        variant: "destructive",
      });
    },
  });

  // Delete time entry mutation
  const deleteTimeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-entry-recent'] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-entry-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-entry-projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
      toast({
        title: "Success",
        description: "Time entry deleted successfully",
      });
    },
    onError: (error: any) => {
      let description = error?.message;
      if (error?.code === '23503' || /foreign key|constraint/i.test(description || '')) {
        description = 'This time entry is linked to other records (e.g., receipt allocations or invoices). Remove those links first.';
      }
      toast({
        title: "Error",
        description: `Failed to delete time entry: ${description}`,
        variant: "destructive",
      });
    },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-time-entry-employees'] });
    queryClient.invalidateQueries({ queryKey: ['admin-time-entry-work-orders'] });
    queryClient.invalidateQueries({ queryKey: ['admin-time-entry-projects'] });
    queryClient.invalidateQueries({ queryKey: ['admin-time-entry-recent'] });
  };

  return {
    employees,
    workOrders,
    projects,
    recentEntries,
    employeeReceipts,
    isLoading: employeesLoading || workOrdersLoading || projectsLoading || entriesLoading || receiptsLoading,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    refetch,
  };
}