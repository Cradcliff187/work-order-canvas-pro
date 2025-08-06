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
      // Handle organization ID vs user ID
      let finalUserId = subcontractorUserId;
      
      if (subcontractorUserId && subcontractorUserId !== "ADMIN_ONLY") {
        // Check if this is an organization ID (UUID format but not a user)
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', subcontractorUserId)
          .single();
          
        if (orgData) {
          // This is an organization ID, get the first active user
          const { data: userData } = await supabase
            .from('organization_members')
            .select('user_id, profiles!left(is_active)')
            .eq('organization_id', subcontractorUserId)
            .eq('profiles.is_active', true)
            .limit(1)
            .single();
            
          finalUserId = userData?.user_id || null;
        }
      }

      const { data, error } = await supabase
        .from('work_order_reports')
        .update({ subcontractor_user_id: finalUserId })
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