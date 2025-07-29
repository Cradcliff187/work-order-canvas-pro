import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useMigrationRepair = () => {
  const queryClient = useQueryClient();

  const repairProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      // Get profile details to check if already has organization
      const { data: existingMembership, error: membershipError } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', profileId)
        .limit(1);

      if (membershipError) throw membershipError;

      // Skip if already has organization membership
      if (existingMembership && existingMembership.length > 0) {
        return { profileId, skipped: true };
      }

      // Create default organization membership for users without any
      const { data: defaultOrg, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('organization_type', 'internal')
        .limit(1);

      if (orgError) throw orgError;

      if (!defaultOrg || defaultOrg.length === 0) {
        throw new Error('No internal organization found for assignment');
      }

      // Create organization membership with member role as default
      const { error: insertError } = await supabase
        .from('organization_members')
        .insert({
          user_id: profileId,
          organization_id: defaultOrg[0].id,
          role: 'member'
        });

      if (insertError) throw insertError;

      return { profileId, organizationId: defaultOrg[0].id, role: 'member' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-status'] });
      toast.success('Profile repaired successfully');
    },
    onError: (error: Error) => {
      toast.error(`Repair failed: ${error.message}`);
    },
  });

  const syncAllProfilesMutation = useMutation({
    mutationFn: async () => {
      // Get all profiles without organization memberships
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          organization_memberships:organization_members(id)
        `);

      if (error) throw error;

      const profilesNeedingSync = profiles?.filter(
        profile => !profile.organization_memberships || profile.organization_memberships.length === 0
      ) || [];

      let successCount = 0;
      let errorCount = 0;

      for (const profile of profilesNeedingSync) {
        try {
          await repairProfileMutation.mutateAsync(profile.id);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to sync profile ${profile.id}:`, error);
        }
      }

      return { successCount, errorCount, totalProcessed: profilesNeedingSync.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['migration-status'] });
      toast.success(`Sync completed: ${result.successCount} repaired, ${result.errorCount} failed`);
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  return {
    repairProfile: repairProfileMutation.mutate,
    syncAllProfiles: syncAllProfilesMutation.mutate,
    isRepairing: repairProfileMutation.isPending,
    isSyncing: syncAllProfilesMutation.isPending,
  };
};