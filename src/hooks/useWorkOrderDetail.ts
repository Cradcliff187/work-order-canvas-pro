import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryPerformance } from './useQueryPerformance';
import { Database } from '@/integrations/supabase/types';

type WorkOrderDetail = Database['public']['Tables']['work_orders']['Row'] & {
  organizations: { 
    name: string; 
    contact_email: string; 
    contact_phone: string | null;
    address: string | null;
  } | null;
  trades: { 
    name: string; 
    description: string | null;
  } | null;
  created_user: { 
    first_name: string; 
    last_name: string;
    email: string;
  } | null;
  work_order_reports: Array<{
    id: string;
    status: string;
    submitted_at: string;
    work_performed: string;
    hours_worked: number | null;
    subcontractor_user: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      organization_members: Array<{
        role: string;
        organizations: {
          id: string;
          name: string;
          organization_type: string;
        } | null;
      }>;
    } | null;
    subcontractor_organization: {
      id: string;
      name: string;
      initials: string;
    } | null;
    submitted_by: {
      first_name: string;
      last_name: string;
      email: string;
      organization_members: Array<{
        role: string;
        organizations: {
          id: string;
          name: string;
          organization_type: string;
        } | null;
      }>;
    } | null;
  }>;
  work_order_attachments: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number | null;
    uploaded_at: string;
    is_internal: boolean | null;
    uploaded_by_user_id: string;
    uploaded_by_user: {
      first_name: string;
      last_name: string;
    };
  }>;
  work_order_assignments?: Array<{
    id: string;
    assigned_to: string;
    assigned_organization_id: string | null;
    assignment_type: string;
    notes: string | null;
    assigned_at: string;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
    } | null;
    assigned_organization: {
      name: string;
      organization_type: string;
    } | null;
  }>;
  location_contact_name?: string | null;
  location_contact_phone?: string | null;
  location_contact_email?: string | null;
};

export type { WorkOrderDetail };

export function useWorkOrderDetail(id: string) {
  if (import.meta.env?.DEV && id) {
    console.log('🔍 useWorkOrderDetail called with ID:', id);
  }
  const queryClient = useQueryClient();
  
  // Stabilize query key
  const queryKey = useMemo(() => ['work-order-detail', id], [id]);
  
  const query = useQuery({
    queryKey,
    enabled: !!id && id !== '' && id !== 'undefined',
    queryFn: async () => {
      if (!id || id === '' || id === 'undefined') throw new Error('Work order ID is required');

      // Main work order query (one-to-one relationships only)
      const { data: workOrderData, error: workOrderError } = await supabase
        .from('work_orders')
        .select(`
          *,
          organizations!organization_id(
            name,
            contact_email,
            contact_phone,
            address
          ),
          trades!trade_id(
            name,
            description
          ),
          created_user:profiles!created_by(
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (workOrderError) {
        console.error('❌ Work order query error:', workOrderError);
        throw workOrderError;
      }
      if (!workOrderData) return null;

      // Separate queries for one-to-many relationships
      const [reportsResult, attachmentsResult, assignmentsResult] = await Promise.all([
        // Work order reports
        supabase
          .from('work_order_reports')
          .select(`
            id,
            status,
            submitted_at,
            work_performed,
            hours_worked,
            subcontractor_user:profiles!subcontractor_user_id(
              first_name,
              last_name,
              email,
              phone,
              organization_members(
                role,
                organizations(
                  id,
                  name,
                  organization_type
                )
              )
            ),
            subcontractor_organization:organizations!subcontractor_organization_id(
              id,
              name,
              initials
            ),
            submitted_by:profiles!submitted_by_user_id(
              first_name,
              last_name,
              email,
              organization_members(
                role,
                organizations(
                  id,
                  name,
                  organization_type
                )
              )
            )
          `)
          .eq('work_order_id', id),

        // Work order attachments
        supabase
          .from('work_order_attachments')
          .select(`
            id,
            file_name,
            file_url,
            file_type,
            file_size,
            uploaded_at,
            is_internal,
            uploaded_by_user_id,
            uploaded_by_user:profiles!uploaded_by_user_id(
              first_name,
              last_name
            )
          `)
          .eq('work_order_id', id),

        // Work order assignments
        supabase
          .from('work_order_assignments')
          .select(`
            id,
            assigned_to,
            assigned_organization_id,
            assignment_type,
            notes,
            assigned_at,
            profiles!work_order_assignments_assigned_to_fkey(
              first_name,
              last_name,
              email
            ),
            assigned_organization:organizations!assigned_organization_id(
              name,
              organization_type
            )
          `)
          .eq('work_order_id', id)
      ]);

      // Relationship queries executed

      // Check for errors in the relationship queries
      if (reportsResult.error) {
        console.error('❌ Reports query error:', reportsResult.error);
        throw reportsResult.error;
      }
      if (attachmentsResult.error) {
        console.error('❌ Attachments query error:', attachmentsResult.error);
        throw attachmentsResult.error;
      }
      if (assignmentsResult.error) {
        console.error('❌ Assignments query error:', assignmentsResult.error);
        throw assignmentsResult.error;
      }

      // Get location contact information if available
      let locationContact = null;
      if (workOrderData.partner_location_number && workOrderData.organization_id) {
        const { data: locationData } = await supabase
          .from("partner_locations")
          .select("contact_name, contact_phone, contact_email")
          .eq("organization_id", workOrderData.organization_id)
          .eq("location_number", workOrderData.partner_location_number)
          .maybeSingle();
        
        locationContact = locationData;
      }

      // Combine all data maintaining the original structure
      return {
        ...workOrderData,
        work_order_reports: reportsResult.data || [],
        work_order_attachments: attachmentsResult.data || [],
        work_order_assignments: assignmentsResult.data || [],
        location_contact_name: locationContact?.contact_name,
        location_contact_phone: locationContact?.contact_phone,
        location_contact_email: locationContact?.contact_email,
      };
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: (failureCount, error: any) => {
      if (error?.code === 'PGRST116' || error?.message?.includes('permission')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Track performance
  useQueryPerformance(queryKey, query.isLoading, query.error, query.data);

  // Real-time subscription for this specific work order
  useEffect(() => {
    if (!id || !query.data) return;

    const channel = supabase
      .channel(`work-order-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'work_orders',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('Work order detail updated via realtime:', payload);
          
          // Refetch this specific work order detail
          queryClient.invalidateQueries({
            queryKey: ['work-order-detail', id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient, query.data]);

  return query;
}