import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useMigrationRepair = () => {
  const queryClient = useQueryClient();

  const repairProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      // Get profile details
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_type, email')
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;

      // Determine correct organization based on user_type
      let organizationType: 'internal' | 'partner' | 'subcontractor';
      let role: 'admin' | 'employee' | 'member';

      switch (profile.user_type) {
        case 'admin':
          organizationType = 'internal';
          role = 'admin';
          break;
        case 'employee':
          organizationType = 'internal';
          role = 'employee';
          break;
        case 'partner':
          organizationType = 'partner';
          role = 'member';
          break;
        case 'subcontractor':
          organizationType = 'subcontractor';
          role = 'member';
          break;
        default:
          throw new Error(`Unknown user_type: ${profile.user_type}`);
      }

      // Find or create appropriate organization
      let { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('organization_type', organizationType)
        .limit(1);

      if (orgError) throw orgError;

      if (!organization || organization.length === 0) {
        // Create default organization if none exists
        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert({
            name: `Default ${organizationType.charAt(0).toUpperCase() + organizationType.slice(1)}`,
            contact_email: `admin@${organizationType}.com`,
            organization_type: organizationType,
            initials: organizationType.substring(0, 3).toUpperCase()
          })
          .select('id')
          .single();

        if (createError) throw createError;
        organization = [newOrg];
      }

      // Create organization membership
      const { error: membershipError } = await supabase
        .from('organization_members')
        .insert({
          user_id: profileId,
          organization_id: organization[0].id,
          role: role
        });

      if (membershipError) throw membershipError;

      return { profileId, organizationType, role };
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
          user_type,
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