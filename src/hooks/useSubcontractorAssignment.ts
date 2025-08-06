import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SubcontractorAssignmentData {
  reportId: string;
  subcontractorUserId: string | null; // Can be organization ID or "ADMIN_ONLY"
}

export function useSubcontractorAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const assignSubcontractor = useMutation({
    mutationFn: async ({ reportId, subcontractorUserId }: SubcontractorAssignmentData) => {
      // Determine if this is an organization assignment or admin-only
      const isAdminOnly = subcontractorUserId === "ADMIN_ONLY";
      const organizationId = isAdminOnly ? null : subcontractorUserId;

      const { data, error } = await supabase
        .from('work_order_reports')
        .update({ 
          subcontractor_organization_id: organizationId,
          subcontractor_user_id: null // Clear user assignment since we're using org-based now
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Assignment Updated",
        description: variables.subcontractorUserId === "ADMIN_ONLY"
          ? "Report converted to admin-only."
          : "Organization assignment updated successfully.",
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['admin-report-detail', variables.reportId] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to update subcontractor assignment.",
        variant: "destructive",
      });
    },
  });

  return {
    assignSubcontractor,
    isAssigning: assignSubcontractor.isPending,
  };
}