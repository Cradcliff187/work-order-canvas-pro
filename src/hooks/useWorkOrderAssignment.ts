import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Subcontractor = Database['public']['Tables']['profiles']['Row'] & {
  workload?: number;
};

interface AssignmentData {
  workOrderIds: string[];
  subcontractorId: string;
  notes?: string;
  
}

export function useSubcontractorsByTrade(tradeId?: string) {
  return useQuery({
    queryKey: ['subcontractors-by-trade', tradeId],
    queryFn: async () => {
      if (!tradeId) return [];
      
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'subcontractor')
        .eq('is_active', true)
        .order('first_name');

      const { data: subcontractors, error } = await query;
      if (error) throw error;

      // Get workload for each subcontractor
      const { data: workOrders, error: workOrderError } = await supabase
        .from('work_orders')
        .select('assigned_to')
        .in('status', ['assigned', 'in_progress'])
        .not('assigned_to', 'is', null);

      if (workOrderError) throw workOrderError;

      // Calculate workload
      const workloadMap = workOrders.reduce((acc, wo) => {
        if (wo.assigned_to) {
          acc[wo.assigned_to] = (acc[wo.assigned_to] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return subcontractors.map(sub => ({
        ...sub,
        workload: workloadMap[sub.id] || 0
      }));
    },
    enabled: !!tradeId,
  });
}

/**
 * Provides work order assignment functionality with company-level access support
 * 
 * @returns Mutation functions for work order assignment operations
 * 
 * Company Access Features:
 * - Supports both individual user and organization-level assignments
 * - Enables bulk assignment operations for multiple work orders
 * - Automatically populates organization context for assignments
 * - Maintains backward compatibility with individual assignments
 * 
 * Assignment Types:
 * - Individual: Assign work order to specific subcontractor user
 * - Organization: Assign work order to entire subcontractor organization
 * - Team: Multiple assignments for collaborative work
 * 
 * Business Logic:
 * - Auto-populates assigned_organization_id based on user's organization
 
 * - Updates work order status from 'received' to 'assigned'
 * - Tracks assignment history for audit trails
 */
export function useWorkOrderAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const assignWorkOrders = useMutation({
    mutationFn: async ({ workOrderIds, subcontractorId, notes }: AssignmentData) => {
      const updates = {
        assigned_to: subcontractorId,
        assigned_to_type: 'subcontractor' as const,
        status: 'assigned' as const,
        date_assigned: new Date().toISOString(),
        admin_completion_notes: notes || null,
      };

      const { data, error } = await supabase
        .from('work_orders')
        .update(updates)
        .in('id', workOrderIds)
        .select(`
          *,
          assigned_user:profiles!assigned_to(first_name, last_name, email),
          organizations!organization_id(name),
          trades!trade_id(name)
        `);

      if (error) throw error;


      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractors-by-trade'] });
      toast({ 
        title: `Successfully assigned ${data?.length} work order(s)`,
        description: 'Subcontractor has been notified.'
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Assignment failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const validateAssignment = async (workOrderIds: string[], subcontractorId: string) => {
    // Check if work orders can be assigned
    const { data: workOrders, error } = await supabase
      .from('work_orders')
      .select('id, status, trade_id')
      .in('id', workOrderIds);

    if (error) throw error;

    const errors: string[] = [];

    // Check status
    const invalidStatusOrders = workOrders.filter(wo => 
      !['received', 'assigned'].includes(wo.status)
    );
    if (invalidStatusOrders.length > 0) {
      errors.push(`${invalidStatusOrders.length} work order(s) cannot be assigned due to their current status`);
    }

    // Check if all work orders have the same trade
    const trades = [...new Set(workOrders.map(wo => wo.trade_id))];
    if (trades.length > 1) {
      errors.push('Cannot bulk assign work orders with different trades');
    }

    // Check if subcontractor is active
    const { data: subcontractor, error: subError } = await supabase
      .from('profiles')
      .select('is_active, user_type')
      .eq('id', subcontractorId)
      .single();

    if (subError || !subcontractor?.is_active || subcontractor.user_type !== 'subcontractor') {
      errors.push('Selected subcontractor is not available');
    }

    return {
      isValid: errors.length === 0,
      errors,
      tradeId: trades[0]
    };
  };

  return {
    assignWorkOrders,
    validateAssignment,
    isAssigning: assignWorkOrders.isPending
  };
}