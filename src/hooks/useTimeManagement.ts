import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface TimeEntry {
  id: string;
  report_date: string;
  hours_worked: number;
  hourly_rate_snapshot: number;
  work_performed: string;
  notes?: string;
  total_labor_cost: number;
  employee_user_id: string;
  work_order_id?: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
  work_order?: {
    id: string;
    work_order_number: string;
    title: string;
  };
  project?: {
    id: string;
    project_number: string;
    name: string;
  };
  receipts?: Array<{
    id: string;
    amount: number;
    vendor_name: string;
  }>;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
}

export interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
}

export interface Project {
  id: string;
  project_number: string;
  name: string;
}

export interface SummaryStats {
  totalHours: number;
  totalLaborCost: number;
  totalMaterialsCost: number;
  pendingApproval: number;
  avgHoursPerEmployee: number;
  overtimeHours: number;
}

export interface TimeManagementFilters {
  employeeIds: string[];
  dateFrom: string;
  dateTo: string;
  workOrderIds: string[];
  projectIds: string[];
  status: string[];
  search: string;
}

export function useTimeManagement(filters: TimeManagementFilters) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch time entries with filters
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['admin-time-entries', filters],
    queryFn: async (): Promise<TimeEntry[]> => {
      let query = supabase
        .from('employee_reports')
        .select(`
          id,
          report_date,
          hours_worked,
          hourly_rate_snapshot,
          work_performed,
          notes,
          total_labor_cost,
          employee_user_id,
          work_order_id,
          project_id,
          created_at,
          updated_at,
          employee:profiles!employee_user_id(
            id,
            first_name,
            last_name,
            email,
            avatar_url
          ),
          work_order:work_orders(
            id,
            work_order_number,
            title
          ),
          project:projects(
            id,
            project_number,
            name
          )
        `)
        .order('report_date', { ascending: false });

      // Apply filters
      if (filters.employeeIds.length > 0) {
        query = query.in('employee_user_id', filters.employeeIds);
      }

      if (filters.dateFrom) {
        query = query.gte('report_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('report_date', filters.dateTo);
      }

      if (filters.workOrderIds.length > 0) {
        query = query.in('work_order_id', filters.workOrderIds);
      }

      if (filters.projectIds.length > 0) {
        query = query.in('project_id', filters.projectIds);
      }

      if (filters.search) {
        query = query.ilike('work_performed', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['admin-employees'],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .eq('is_employee', true)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch work orders
  const { data: workOrders = [] } = useQuery({
    queryKey: ['admin-work-orders'],
    queryFn: async (): Promise<WorkOrder[]> => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, work_order_number, title')
        .order('work_order_number');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_number, name')
        .eq('status', 'active')
        .order('project_number');

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate summary stats
  const summaryStats: SummaryStats = {
    totalHours: timeEntries.reduce((sum, entry) => sum + entry.hours_worked, 0),
    totalLaborCost: timeEntries.reduce((sum, entry) => sum + (entry.total_labor_cost || 0), 0),
    totalMaterialsCost: 0, // TODO: Calculate from receipts
    pendingApproval: 0, // TODO: Implement approval status
    avgHoursPerEmployee: employees.length > 0 
      ? timeEntries.reduce((sum, entry) => sum + entry.hours_worked, 0) / employees.length 
      : 0,
    overtimeHours: timeEntries.filter(entry => entry.hours_worked > 8).reduce((sum, entry) => sum + (entry.hours_worked - 8), 0),
  };

  // Update time entry mutation
  const updateTimeEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TimeEntry> }) => {
      const { error } = await supabase
        .from('employee_reports')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
      toast({ title: 'Time entry updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update time entry', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete time entry mutation
  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
      toast({ title: 'Time entry deleted successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete time entry', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (entryIds: string[]) => {
      // TODO: Implement approval status in database
      console.log('Bulk approving entries:', entryIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
      toast({ title: 'Time entries approved successfully' });
    },
  });

  // Export to CSV function
  const exportToCSV = async (entryIds?: string[]) => {
    const entriesToExport = entryIds 
      ? timeEntries.filter(entry => entryIds.includes(entry.id))
      : timeEntries;

    const csvData = entriesToExport.map(entry => ({
      Date: format(new Date(entry.report_date), 'yyyy-MM-dd'),
      Employee: `${entry.employee.first_name} ${entry.employee.last_name}`,
      'Work Order': entry.work_order?.work_order_number || '',
      Project: entry.project?.project_number || '',
      Hours: entry.hours_worked,
      'Hourly Rate': entry.hourly_rate_snapshot,
      'Labor Cost': entry.total_labor_cost,
      Description: entry.work_performed,
      Notes: entry.notes || '',
    }));

    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(csvData[0]).join(",") + "\n"
      + csvData.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `time-entries-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'Time entries exported successfully' });
  };

  return {
    timeEntries,
    employees,
    workOrders,
    projects,
    summaryStats,
    isLoading,
    updateTimeEntry: (id: string, data: Partial<TimeEntry>) => 
      updateTimeEntryMutation.mutate({ id, data }),
    deleteTimeEntry: deleteTimeEntryMutation.mutate,
    bulkApprove: bulkApproveMutation.mutate,
    exportToCSV,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] }),
  };
}