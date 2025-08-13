import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export interface WorkOrderSummary {
  id: string;
  work_order_number: string | null;
  title: string;
  organization_name: string | null;
  store_location: string | null;
  due_date: string | null;
  date_submitted: string;
  priority: 'low' | 'standard' | 'high' | 'urgent';
}

export interface PipelineStage {
  stageName: string;
  totalCount: number;
  recentCount: number; // last 24 hours
  overdueCount: number; // past due_date
  workOrders: WorkOrderSummary[]; // limit 5
}

export interface WorkOrderPipelineData {
  new: PipelineStage;
  assigned: PipelineStage;
  inProgress: PipelineStage;
  awaitingReports: PipelineStage;
  completed: PipelineStage;
}

export function useWorkOrderPipeline() {
  const { user } = useAuth();
  const { profile, primaryRole, partnerMemberships, subcontractorMemberships } = useUserProfile();

  return useQuery({
    queryKey: ['work-order-pipeline'],
    queryFn: async (): Promise<WorkOrderPipelineData> => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Build base query with role-based filtering
      let baseQuery = supabase
        .from('work_orders')
        .select(`
          id,
          work_order_number,
          title,
          status,
          store_location,
          due_date,
          date_submitted,
          priority,
          organization_id,
          assigned_organization_id,
          organizations:organizations!work_orders_organization_id_fkey(name)
        `);

      // Apply role-based filtering
      if (primaryRole === 'admin' || primaryRole === 'employee') {
        // Admin and employees can see all work orders
      } else if (primaryRole === 'partner') {
        // Partners can only see their organization's work orders
        const userOrgIds = partnerMemberships?.map(org => org.organization_id) || [];
        if (userOrgIds.length > 0) {
          baseQuery = baseQuery.in('organization_id', userOrgIds);
        } else {
          // If no organizations, return empty result
          return createEmptyPipeline();
        }
      } else if (primaryRole === 'subcontractor') {
        // Subcontractors can only see work orders assigned to their organizations
        const userOrgIds = subcontractorMemberships?.map(org => org.organization_id) || [];
        if (userOrgIds.length > 0) {
          baseQuery = baseQuery.in('assigned_organization_id', userOrgIds);
        } else {
          // If no organizations, return empty result
          return createEmptyPipeline();
        }
      } else {
        // Unknown role, return empty result
        return createEmptyPipeline();
      }

      const { data: workOrders, error } = await baseQuery;

      if (error) {
        console.error('Error fetching work orders:', error);
        throw error;
      }

      // Get work order reports for awaiting reports stage
      const { data: reports } = await supabase
        .from('work_order_reports')
        .select('work_order_id, status')
        .in('status', ['submitted', 'approved']);

      const approvedReports = new Set(
        reports?.filter(r => r.status === 'approved').map(r => r.work_order_id) || []
      );

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Process work orders into pipeline stages
      const processedOrders = (workOrders || []).map((wo: any) => ({
        id: wo.id,
        work_order_number: wo.work_order_number,
        title: wo.title,
        organization_name: wo.organizations?.name || null,
        store_location: wo.store_location,
        due_date: wo.due_date,
        date_submitted: wo.date_submitted,
        priority: wo.priority || 'standard',
        status: wo.status,
        isRecent: new Date(wo.date_submitted) > yesterday,
        isOverdue: wo.due_date ? new Date(wo.due_date) < now : false,
        hasApprovedReport: approvedReports.has(wo.id)
      }));

      return {
        new: createStageData('New', processedOrders, (wo) => wo.status === 'received'),
        assigned: createStageData('Assigned', processedOrders, (wo) => wo.status === 'assigned'),
        inProgress: createStageData('In Progress', processedOrders, (wo) => wo.status === 'in_progress' && wo.hasApprovedReport),
        awaitingReports: createStageData('Awaiting Reports', processedOrders, (wo) => wo.status === 'in_progress' && !wo.hasApprovedReport),
        completed: createStageData('Completed', processedOrders, (wo) => wo.status === 'completed')
      };
    },
    enabled: !!user && !!profile,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
    refetchOnWindowFocus: false,
  });
}

function createStageData(
  stageName: string, 
  workOrders: any[], 
  filter: (wo: any) => boolean
): PipelineStage {
  const stageOrders = workOrders.filter(filter);
  
  return {
    stageName,
    totalCount: stageOrders.length,
    recentCount: stageOrders.filter(wo => wo.isRecent).length,
    overdueCount: stageOrders.filter(wo => wo.isOverdue).length,
    workOrders: stageOrders
      .slice(0, 5)
      .map(wo => ({
        id: wo.id,
        work_order_number: wo.work_order_number,
        title: wo.title,
        organization_name: wo.organization_name,
        store_location: wo.store_location,
        due_date: wo.due_date,
        date_submitted: wo.date_submitted,
        priority: wo.priority
      }))
  };
}

function createEmptyPipeline(): WorkOrderPipelineData {
  const emptyStage = (stageName: string): PipelineStage => ({
    stageName,
    totalCount: 0,
    recentCount: 0,
    overdueCount: 0,
    workOrders: []
  });

  return {
    new: emptyStage('New'),
    assigned: emptyStage('Assigned'),
    inProgress: emptyStage('In Progress'),
    awaitingReports: emptyStage('Awaiting Reports'),
    completed: emptyStage('Completed')
  };
}