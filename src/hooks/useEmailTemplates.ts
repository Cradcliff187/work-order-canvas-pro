import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type EmailTemplate = Tables<'email_templates'>;
type EmailTemplateInsert = TablesInsert<'email_templates'>;
type EmailTemplateUpdate = TablesUpdate<'email_templates'>;

export const useEmailTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: templates,
    isLoading,
    error
  } = useQuery({
    queryKey: ['email_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_name');

      if (error) throw error;
      return data;
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: EmailTemplateInsert) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast({
        title: 'Success',
        description: 'Email template created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create email template',
        variant: 'destructive',
      });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: EmailTemplateUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast({
        title: 'Success',
        description: 'Email template updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update email template',
        variant: 'destructive',
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast({
        title: 'Success',
        description: `Template ${data.is_active ? 'activated' : 'deactivated'}`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update template status',
        variant: 'destructive',
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast({
        title: 'Success',
        description: 'Email template deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete email template',
        variant: 'destructive',
      });
    },
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    toggleActive,
    deleteTemplate,
  };
};