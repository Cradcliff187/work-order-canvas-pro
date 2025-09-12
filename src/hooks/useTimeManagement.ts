import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { calculateTotalWeeklyOvertimeHours } from '@/utils/overtimeCalculations';

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
  approval_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  materials_cost?: number;
  created_at: string;
  updated_at: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    is_overtime_eligible?: boolean;
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
  page: number;
  limit: number;
}

export function useTimeManagement(filters: TimeManagementFilters) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch time entries with pagination and filters
  const { data: timeEntriesData, isLoading } = useQuery({
    queryKey: ['admin-time-entries', filters],
    queryFn: async (): Promise<{ entries: TimeEntry[]; total: number }> => {
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
          approval_status,
          approved_by,
          approved_at,
          rejection_reason,
          created_at,
          updated_at,
          employee:profiles!employee_user_id(
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            is_overtime_eligible
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

      // Get total count - handle search differently
      let totalCount = 0;
      
      if (filters.search) {
        // For search, we'll get the count from the search function results
        // This will be handled in the search branch below
      } else {
        // Normal count query for non-search requests
        let countQuery = supabase
          .from('employee_reports')
          .select('*', { count: 'exact', head: true });

        // Apply same filters for count
        if (filters.employeeIds.length > 0) {
          countQuery = countQuery.in('employee_user_id', filters.employeeIds);
        }
        if (filters.dateFrom) {
          countQuery = countQuery.gte('report_date', filters.dateFrom);
        }
        if (filters.dateTo) {
          countQuery = countQuery.lte('report_date', filters.dateTo);
        }
        if (filters.workOrderIds.length > 0) {
          countQuery = countQuery.in('work_order_id', filters.workOrderIds);
        }
        if (filters.projectIds.length > 0) {
          countQuery = countQuery.in('project_id', filters.projectIds);
        }
        if (filters.status.length > 0) {
          countQuery = countQuery.in('approval_status', filters.status as Array<'pending' | 'approved' | 'rejected' | 'flagged'>);
        }

        const { count } = await countQuery;
        totalCount = count || 0;
      }

      // Apply filters to main query
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

      if (filters.status.length > 0) {
        query = query.in('approval_status', filters.status as Array<'pending' | 'approved' | 'rejected' | 'flagged'>);
      }

      // Apply pagination
      const offset = (filters.page - 1) * filters.limit;

      // Use full-text search function if search term provided
      if (filters.search) {
        // Build filters object for search function
        const searchFilters = {
          employee_ids: filters.employeeIds.length > 0 ? filters.employeeIds : null,
          work_order_ids: filters.workOrderIds.length > 0 ? filters.workOrderIds : null,
          project_ids: filters.projectIds.length > 0 ? filters.projectIds : null,
          status_filter: filters.status.length > 0 ? filters.status : null,
          date_from: filters.dateFrom || null,
          date_to: filters.dateTo || null,
          limit_count: filters.limit,
          offset_count: offset
        };

        const { data: searchData, error: searchError } = await supabase
          .rpc('search_employee_reports', {
            search_query: filters.search,
            filters: searchFilters
          });

        if (searchError) throw searchError;

        // Calculate materials cost for search results
        const entriesWithMaterials = await Promise.all(
          (searchData || []).map(async (entry: any) => {
            const { data: materialsData } = await supabase
              .from('receipt_time_entries')
              .select('allocated_amount')
              .eq('time_entry_id', entry.id);

            const materials_cost = materialsData?.reduce(
              (sum, allocation) => sum + allocation.allocated_amount, 
              0
            ) || 0;

            return { ...entry, materials_cost };
          })
        );

        // For search, get total count by running search without pagination
        const { data: countData } = await supabase
          .rpc('search_employee_reports', {
            search_query: filters.search,
            filters: { ...searchFilters, limit_count: null, offset_count: 0 }
          });

        return { entries: entriesWithMaterials, total: countData?.length || 0 };
      }
      query = query.range(offset, offset + filters.limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      // Calculate materials cost for each time entry
      const entriesWithMaterials = await Promise.all(
        (data || []).map(async (entry) => {
          const { data: materialsData } = await supabase
            .from('receipt_time_entries')
            .select('allocated_amount')
            .eq('time_entry_id', entry.id);

          const materials_cost = materialsData?.reduce(
            (sum, allocation) => sum + allocation.allocated_amount, 
            0
          ) || 0;

          return { ...entry, materials_cost };
        })
      );

      return { entries: entriesWithMaterials, total: totalCount || 0 };
    },
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('time-entries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_reports'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Extract data from paginated response
  const timeEntries = timeEntriesData?.entries || [];
  const totalEntries = timeEntriesData?.total || 0;

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

  // Calculate summary stats using daily overtime aggregation
  const summaryStats: SummaryStats = {
    totalHours: timeEntries.reduce((sum, entry) => sum + entry.hours_worked, 0),
    totalLaborCost: timeEntries.reduce((sum, entry) => sum + (entry.total_labor_cost || 0), 0),
    totalMaterialsCost: timeEntries.reduce((sum, entry) => sum + (entry.materials_cost || 0), 0),
    pendingApproval: timeEntries.filter(entry => entry.approval_status === 'pending').length,
    avgHoursPerEmployee: employees.length > 0 
      ? timeEntries.reduce((sum, entry) => sum + entry.hours_worked, 0) / employees.length 
      : 0,
    overtimeHours: calculateTotalWeeklyOvertimeHours(timeEntries),
  };

  // Update time entry mutation
  const updateTimeEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TimeEntry> }) => {
      // Sanitize payload to only include columns that exist on employee_reports
      const allowedKeys = [
        'report_date',
        'hours_worked',
        'hourly_rate_snapshot',
        'work_performed',
        'notes',
        'work_order_id',
        'project_id',
        'approval_status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'is_overtime',
        'clock_in_time',
        'clock_out_time',
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
      queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
      toast({ title: 'Time entry updated successfully' });
    },
    onError: (error: any) => {
      const friendly = error?.code === 'PGRST116' || /payload|unexpected|column/i.test(error?.message || '')
        ? 'Some fields were not allowed. Please try again.'
        : error?.message;
      toast({ 
        title: 'Failed to update time entry', 
        description: friendly,
        variant: 'destructive' 
      });
    },
  });

  // Delete time entry mutation with cascading delete
  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete related receipt allocations
      const { error: receiptError } = await supabase
        .from('receipt_time_entries')
        .delete()
        .eq('time_entry_id', id);

      if (receiptError) throw receiptError;


      // Then delete the time entry
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
    onError: (error: any) => {
      console.error('Failed to delete time entry', error);
      toast({ 
        title: 'Failed to delete time entry', 
        description: error?.message || 'An error occurred while deleting the time entry',
        variant: 'destructive' 
      });
    },
  });

  // Bulk delete time entries mutation
  const bulkDeleteTimeEntriesMutation = useMutation({
    mutationFn: async (entryIds: string[]) => {
      // First delete all related receipt allocations
      const { error: receiptError } = await supabase
        .from('receipt_time_entries')
        .delete()
        .in('time_entry_id', entryIds);

      if (receiptError) throw receiptError;


      // Then delete all time entries
      const { error } = await supabase
        .from('employee_reports')
        .delete()
        .in('id', entryIds);

      if (error) throw error;
    },
    onSuccess: (_, entryIds) => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
      toast({ title: `${entryIds.length} time entries deleted successfully` });
    },
    onError: (error: any) => {
      console.error('Failed to bulk delete time entries', error);
      toast({ 
        title: 'Failed to delete time entries', 
        description: error?.message || 'An error occurred while deleting the time entries',
        variant: 'destructive' 
      });
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (entryIds: string[]) => {
      const { error } = await supabase
        .from('employee_reports')
        .update({ 
          approval_status: 'approved',
          approved_at: new Date().toISOString()
        })
        .in('id', entryIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
      toast({ title: 'Time entries approved successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to approve time entries', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: async ({ entryIds, reason }: { entryIds: string[]; reason: string }) => {
      const { error } = await supabase
        .from('employee_reports')
        .update({ 
          approval_status: 'rejected',
          rejection_reason: reason
        })
        .in('id', entryIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] });
      toast({ title: 'Time entries rejected' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to reject time entries', 
        description: error.message,
        variant: 'destructive' 
      });
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
      'Materials Cost': entry.materials_cost || 0,
      'Total Cost': (entry.total_labor_cost || 0) + (entry.materials_cost || 0),
      'Approval Status': entry.approval_status,
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
    totalEntries,
    employees,
    workOrders,
    projects,
    summaryStats,
    isLoading,
    updateTimeEntry: (id: string, data: Partial<TimeEntry>) => 
      updateTimeEntryMutation.mutateAsync({ id, data }),
    deleteTimeEntry: (id: string) => deleteTimeEntryMutation.mutateAsync(id),
    bulkDeleteTimeEntries: (entryIds: string[]) => bulkDeleteTimeEntriesMutation.mutateAsync(entryIds),
    bulkApprove: (entryIds: string[]) => bulkApproveMutation.mutateAsync(entryIds),
    bulkReject: (entryIds: string[], reason: string) => 
      bulkRejectMutation.mutateAsync({ entryIds, reason }),
    exportToCSV,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['admin-time-entries'] }),
  };
}