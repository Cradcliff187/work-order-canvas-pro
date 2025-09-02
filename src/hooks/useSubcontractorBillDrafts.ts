import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCallback, useEffect, useRef } from 'react';

export interface SubcontractorBillDraftData {
  external_invoice_number?: string;
  total_amount?: number;
  work_orders: Array<{
    work_order_id: string;
    amount: number;
    selected: boolean;
  }>;
  notes?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: number;
}

export interface SubcontractorBillDraft {
  id: string;
  external_invoice_number?: string;
  total_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  submitted_by: string;
  work_orders?: Array<{
    work_order_id: string;
    amount: number;
  }>;
}

export const useSubcontractorBillDrafts = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Get user's draft bills
  const { data: drafts = [], isLoading: isLoadingDrafts } = useQuery({
    queryKey: ['subcontractor-bill-drafts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('subcontractor_bills')
        .select(`
          id,
          external_invoice_number,
          total_amount,
          created_at,
          updated_at,
          submitted_by,
          subcontractor_bill_work_orders (
            work_order_id,
            amount
          )
        `)
        .eq('status', 'draft')
        .eq('submitted_by', profile.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(bill => ({
        id: bill.id,
        external_invoice_number: bill.external_invoice_number,
        total_amount: bill.total_amount,
        created_at: bill.created_at,
        updated_at: bill.updated_at,
        submitted_by: bill.submitted_by,
        work_orders: bill.subcontractor_bill_work_orders || []
      })) as SubcontractorBillDraft[];
    },
  });

  // Get draft count for navigation
  const draftCount = drafts.length;

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async ({ draftData, isManual = false }: { draftData: SubcontractorBillDraftData, isManual?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Create or update draft bill
      const { data: bill, error: billError } = await supabase
        .from('subcontractor_bills')
        .insert({
          external_invoice_number: draftData.external_invoice_number || null,
          total_amount: draftData.total_amount || null,
          status: 'draft',
          submitted_by: profile.id,
          internal_invoice_number: '', // Empty for drafts
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (billError) throw billError;

      // Save selected work orders
      const selectedWorkOrders = draftData.work_orders
        .filter(wo => wo.selected && wo.amount > 0)
        .map(wo => ({
          subcontractor_bill_id: bill.id,
          work_order_id: wo.work_order_id,
          amount: wo.amount,
          description: draftData.notes || null
        }));

      if (selectedWorkOrders.length > 0) {
        const { error: workOrderError } = await supabase
          .from('subcontractor_bill_work_orders')
          .insert(selectedWorkOrders);

        if (workOrderError) throw workOrderError;
      }

      return { ...bill, isManual };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bill-drafts'] });
      if (data.isManual) {
        toast({
          title: 'Draft Saved',
          description: 'Bill draft saved successfully',
        });
      }
    },
    onError: (error) => {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to save draft. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update draft mutation
  const updateDraftMutation = useMutation({
    mutationFn: async ({ draftId, draftData, isManual = false }: { 
      draftId: string, 
      draftData: SubcontractorBillDraftData, 
      isManual?: boolean 
    }) => {
      // Update draft bill
      const { error: billError } = await supabase
        .from('subcontractor_bills')
        .update({
          external_invoice_number: draftData.external_invoice_number || null,
          total_amount: draftData.total_amount || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .eq('status', 'draft');

      if (billError) throw billError;

      // Delete existing work order relationships
      await supabase
        .from('subcontractor_bill_work_orders')
        .delete()
        .eq('subcontractor_bill_id', draftId);

      // Add updated work order relationships
      const selectedWorkOrders = draftData.work_orders
        .filter(wo => wo.selected && wo.amount > 0)
        .map(wo => ({
          subcontractor_bill_id: draftId,
          work_order_id: wo.work_order_id,
          amount: wo.amount,
          description: draftData.notes || null
        }));

      if (selectedWorkOrders.length > 0) {
        const { error: workOrderError } = await supabase
          .from('subcontractor_bill_work_orders')
          .insert(selectedWorkOrders);

        if (workOrderError) throw workOrderError;
      }

      return { draftId, isManual };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bill-drafts'] });
      if (data.isManual) {
        toast({
          title: 'Draft Updated',
          description: 'Bill draft updated successfully',
        });
      }
    },
    onError: (error) => {
      console.error('Error updating draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to update draft. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from('subcontractor_bills')
        .delete()
        .eq('id', draftId)
        .eq('status', 'draft');

      if (error) throw error;
      return draftId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bill-drafts'] });
      toast({
        title: 'Draft Deleted',
        description: 'Bill draft deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Error deleting draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete draft. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Convert draft to submission
  const convertDraftToSubmission = useMutation({
    mutationFn: async (draftId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data: userOrg } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', profile.id)
        .single();

      if (!userOrg) throw new Error('User organization not found');

      // Update draft to submitted status
      const { data: bill, error: updateError } = await supabase
        .from('subcontractor_bills')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: profile.id,
          subcontractor_organization_id: userOrg.organization_id,
        })
        .eq('id', draftId)
        .eq('status', 'draft')
        .select('id, internal_invoice_number')
        .single();

      if (updateError) throw updateError;

      return bill;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bill-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bills'] });
      toast({
        title: 'Bill Submitted',
        description: `Bill ${data.internal_invoice_number} has been submitted successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error submitting bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit bill. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Auto-save functionality
  const autoSave = useCallback((draftId: string | null, draftData: SubcontractorBillDraftData) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      if (draftId) {
        updateDraftMutation.mutate({ draftId, draftData, isManual: false });
      } else {
        // Only auto-save if there's meaningful data
        const hasData = draftData.external_invoice_number || 
                       draftData.work_orders.some(wo => wo.selected) || 
                       draftData.notes;
        
        if (hasData) {
          saveDraftMutation.mutate({ draftData, isManual: false });
        }
      }
    }, 2 * 60 * 1000); // 2 minutes
  }, [saveDraftMutation, updateDraftMutation]);

  // Clear auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    drafts,
    draftCount,
    isLoadingDrafts,
    saveDraft: (draftData: SubcontractorBillDraftData) => saveDraftMutation.mutate({ draftData, isManual: true }),
    updateDraft: (draftId: string, draftData: SubcontractorBillDraftData) => 
      updateDraftMutation.mutate({ draftId, draftData, isManual: true }),
    deleteDraft: deleteDraftMutation.mutate,
    convertDraftToSubmission: convertDraftToSubmission.mutate,
    autoSave,
    isSaving: saveDraftMutation.isPending || updateDraftMutation.isPending,
    isDeleting: deleteDraftMutation.isPending,
    isSubmitting: convertDraftToSubmission.isPending,
  };
};