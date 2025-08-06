import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SubcontractorAssignmentData {
  reportId: string;
  subcontractorUserId: string | null;
}

export function useSubcontractorAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const assignSubcontractor = useMutation({
    mutationFn: async ({ reportId, subcontractorUserId }: SubcontractorAssignmentData) => {
      const { data, error } = await supabase
        .from('work_order_reports')
        .update({ subcontractor_user_id: subcontractorUserId })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Subcontractor Updated",
        description: variables.subcontractorUserId 
          ? "Subcontractor assignment updated successfully."
          : "Report converted to admin-only.",
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