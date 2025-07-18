
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type EmailRecipientSetting = Tables<'email_recipient_settings'>;
type UserType = 'admin' | 'partner' | 'subcontractor' | 'employee';

export interface RecipientMatrix {
  templateName: string;
  recipients: Record<UserType, boolean>;
  totalRecipients: number;
}

export const useEmailRecipientSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: recipientSettings,
    isLoading,
    error
  } = useQuery({
    queryKey: ['email_recipient_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_recipient_settings')
        .select('*')
        .order('template_name');

      if (error) throw error;
      return data;
    },
  });

  // Transform flat data into matrix format for easier UI rendering
  const recipientMatrix: RecipientMatrix[] = recipientSettings 
    ? Object.entries(
        recipientSettings.reduce((acc, setting) => {
          if (!acc[setting.template_name]) {
            acc[setting.template_name] = {
              templateName: setting.template_name,
              recipients: {} as Record<UserType, boolean>,
              totalRecipients: 0
            };
          }
          acc[setting.template_name].recipients[setting.role as UserType] = setting.receives_email;
          if (setting.receives_email) {
            acc[setting.template_name].totalRecipients++;
          }
          return acc;
        }, {} as Record<string, RecipientMatrix>)
      ).map(([_, matrix]) => matrix)
    : [];

  const updateRecipientSetting = useMutation({
    mutationFn: async ({ 
      templateName, 
      role, 
      receivesEmail 
    }: { 
      templateName: string; 
      role: UserType; 
      receivesEmail: boolean;
    }) => {
      const { data, error } = await supabase
        .from('email_recipient_settings')
        .update({ receives_email: receivesEmail })
        .eq('template_name', templateName)
        .eq('role', role)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ templateName, role, receivesEmail }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['email_recipient_settings'] });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<EmailRecipientSetting[]>(['email_recipient_settings']);

      // Optimistically update
      if (previousSettings) {
        const newSettings = previousSettings.map(setting => 
          setting.template_name === templateName && setting.role === role
            ? { ...setting, receives_email: receivesEmail }
            : setting
        );
        queryClient.setQueryData(['email_recipient_settings'], newSettings);
      }

      return { previousSettings };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousSettings) {
        queryClient.setQueryData(['email_recipient_settings'], context.previousSettings);
      }
      toast({
        title: 'Error',
        description: 'Failed to update recipient setting',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Recipient setting updated successfully',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['email_recipient_settings'] });
    },
  });

  const bulkUpdateRole = useMutation({
    mutationFn: async ({ 
      role, 
      receivesEmail 
    }: { 
      role: UserType; 
      receivesEmail: boolean;
    }) => {
      const { data, error } = await supabase
        .from('email_recipient_settings')
        .update({ receives_email: receivesEmail })
        .eq('role', role)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { role, receivesEmail }) => {
      queryClient.invalidateQueries({ queryKey: ['email_recipient_settings'] });
      toast({
        title: 'Success',
        description: `${receivesEmail ? 'Enabled' : 'Disabled'} all notifications for ${role} role`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update role settings',
        variant: 'destructive',
      });
    },
  });

  return {
    recipientSettings,
    recipientMatrix,
    isLoading,
    error,
    updateRecipientSetting,
    bulkUpdateRole,
  };
};
