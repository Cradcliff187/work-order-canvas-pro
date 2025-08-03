import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface ActivityItem {
  id: string;
  type: 'message' | 'status_change' | 'assignment' | 'report_submitted' | 'report_approved';
  work_order_id: string;
  work_order_number: string;
  work_order_title: string;
  location: string;
  timestamp: string;
  title: string;
  description: string;
  actionUrl: string;
  isUnread?: boolean;
  sender_name?: string;
  old_status?: string;
  new_status?: string;
  message_preview?: string;
}

export function usePartnerSubcontractorActivityFeed(role: 'partner' | 'subcontractor') {
  const { profile, isPartner, isSubcontractor } = useUserProfile();
  const queryClient = useQueryClient();

  const fetchActivities = async (): Promise<ActivityItem[]> => {
    if (!profile?.id) return [];

    const activities: ActivityItem[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14); // Last 14 days

    try {
      // Get accessible work order IDs first based on role
      let workOrderIds: string[] = [];
      
      if (role === 'partner' && isPartner()) {
        // Partners see work orders from their organizations
        const { data: partnerWorkOrders } = await supabase
          .from('work_orders')
          .select('id')
          .gte('created_at', cutoffDate.toISOString())
          .in('organization_id', [
            // Get partner organization IDs
            ...(await supabase
              .from('organization_members')
              .select('organization_id')
              .eq('user_id', profile.id)
              .then(({ data }) => data?.map(om => om.organization_id) || []))
          ]);
        
        workOrderIds = partnerWorkOrders?.map(wo => wo.id) || [];
      } else if (role === 'subcontractor' && isSubcontractor()) {
        // Subcontractors see assigned work orders
        const { data: subcontractorWorkOrders } = await supabase
          .from('work_orders')
          .select('id')
          .gte('created_at', cutoffDate.toISOString())
          .not('assigned_organization_id', 'is', null)
          .in('assigned_organization_id', [
            // Get subcontractor organization IDs
            ...(await supabase
              .from('organization_members')
              .select('organization_id')
              .eq('user_id', profile.id)
              .then(({ data }) => data?.map(om => om.organization_id) || []))
          ]);
        
        workOrderIds = subcontractorWorkOrders?.map(wo => wo.id) || [];
      }

      if (workOrderIds.length === 0) return [];

      // Fetch work order details for URL building
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select('id, work_order_number, title, store_location, city, state')
        .in('id', workOrderIds);

      const workOrderMap = new Map(workOrders?.map(wo => [wo.id, wo]) || []);

      // 1. Fetch messages (role-specific visibility)
      const messageVisibility = role === 'partner' ? false : true; // Partners see public (false), Subcontractors see internal (true)
      
      const { data: messages } = await supabase
        .from('work_order_messages')
        .select(`
          id,
          work_order_id,
          message,
          is_internal,
          created_at,
          sender_id,
          profiles:sender_id (first_name, last_name)
        `)
        .in('work_order_id', workOrderIds)
        .eq('is_internal', messageVisibility)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      // Get unread message counts
      const { data: unreadCounts } = await supabase.rpc('get_unread_message_counts');
      const unreadMap = new Map(unreadCounts?.map(uc => [uc.work_order_id, uc.unread_count]) || []);

      messages?.forEach(message => {
        const workOrder = workOrderMap.get(message.work_order_id);
        if (!workOrder) return;

        const isUnread = (unreadMap.get(message.work_order_id) || 0) > 0;
        const senderName = message.profiles 
          ? `${message.profiles.first_name} ${message.profiles.last_name}`
          : 'Unknown User';

        activities.push({
          id: `message-${message.id}`,
          type: 'message',
          work_order_id: message.work_order_id,
          work_order_number: workOrder.work_order_number,
          work_order_title: workOrder.title,
          location: `${workOrder.store_location}, ${workOrder.city}`,
          timestamp: message.created_at,
          title: `New ${messageVisibility ? 'internal' : 'public'} message`,
          description: `${senderName}: ${message.message.substring(0, 100)}${message.message.length > 100 ? '...' : ''}`,
          actionUrl: `/${role}/work-orders/${message.work_order_id}?tab=messages`,
          isUnread,
          sender_name: senderName,
          message_preview: message.message.substring(0, 200)
        });
      });

      // 2. Fetch status changes from audit logs
      const { data: statusChanges } = await supabase
        .from('audit_logs')
        .select(`
          id,
          record_id,
          old_values,
          new_values,
          created_at,
          user_id,
          profiles:user_id (first_name, last_name)
        `)
        .eq('table_name', 'work_orders')
        .in('record_id', workOrderIds)
        .gte('created_at', cutoffDate.toISOString())
        .not('old_values->status', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      statusChanges?.forEach(change => {
        const workOrder = workOrderMap.get(change.record_id);
        if (!workOrder) return;

        const oldStatus = typeof change.old_values === 'object' && change.old_values && 'status' in change.old_values ? String(change.old_values.status) : null;
        const newStatus = typeof change.new_values === 'object' && change.new_values && 'status' in change.new_values ? String(change.new_values.status) : null;
        
        if (oldStatus && newStatus && oldStatus !== newStatus) {
          const changerName = change.profiles 
            ? `${(change.profiles as any).first_name} ${(change.profiles as any).last_name}`
            : 'System';

          activities.push({
            id: `status-${change.id}`,
            type: 'status_change',
            work_order_id: change.record_id,
            work_order_number: workOrder.work_order_number,
            work_order_title: workOrder.title,
            location: `${workOrder.store_location}, ${workOrder.city}`,
            timestamp: change.created_at,
            title: `Status changed: ${oldStatus} → ${newStatus}`,
            description: `${changerName} changed status from ${oldStatus} to ${newStatus}`,
            actionUrl: `/${role}/work-orders/${change.record_id}`,
            old_status: oldStatus,
            new_status: newStatus
          });
        }
      });

      // 3. Fetch assignments (for subcontractors)
      if (role === 'subcontractor') {
        const { data: assignments } = await supabase
          .from('work_order_assignments')
          .select(`
            id,
            work_order_id,
            assigned_at,
            assigned_by
          `)
          .in('work_order_id', workOrderIds)
          .eq('assigned_to', profile.id)
          .gte('assigned_at', cutoffDate.toISOString())
          .order('assigned_at', { ascending: false })
          .limit(10);

        // Get assigner details separately
        const assignerIds = assignments?.map(a => a.assigned_by).filter(Boolean) || [];
        const { data: assignerProfiles } = assignerIds.length > 0 
          ? await supabase
              .from('profiles')
              .select('id, first_name, last_name')
              .in('id', assignerIds)
          : { data: [] };
        
        const assignerMap = new Map<string, any>();
        assignerProfiles?.forEach(p => assignerMap.set(p.id, p));

        assignments?.forEach(assignment => {
          const workOrder = workOrderMap.get(assignment.work_order_id);
          if (!workOrder) return;

          const assignerProfile = assignerMap.get(assignment.assigned_by);
          const assignerName = assignerProfile 
            ? `${assignerProfile.first_name} ${assignerProfile.last_name}`
            : 'System';

          activities.push({
            id: `assignment-${assignment.id}`,
            type: 'assignment',
            work_order_id: assignment.work_order_id,
            work_order_number: workOrder.work_order_number,
            work_order_title: workOrder.title,
            location: `${workOrder.store_location}, ${workOrder.city}`,
            timestamp: assignment.assigned_at,
            title: 'New work order assigned',
            description: `${assignerName} assigned this work order to you`,
            actionUrl: `/${role}/work-orders/${assignment.work_order_id}`
          });
        });
      }

      // 4. Fetch reports (role-specific visibility)
      if (role === 'partner' || role === 'subcontractor') {
        let reportsQuery = supabase
          .from('work_order_reports')
          .select(`
            id,
            work_order_id,
            submitted_at,
            reviewed_at,
            status,
            subcontractor_user_id
          `)
          .in('work_order_id', workOrderIds)
          .gte('submitted_at', cutoffDate.toISOString())
          .order('submitted_at', { ascending: false })
          .limit(10);

        // Role-specific filtering
        if (role === 'partner') {
          // Partners only see approved reports
          reportsQuery = reportsQuery.eq('status', 'approved');
        } else if (role === 'subcontractor') {
          // Subcontractors see all their own reports
          reportsQuery = reportsQuery.eq('subcontractor_user_id', profile.id);
        }

        const { data: reports } = await reportsQuery;

        // Get submitter details separately
        const submitterIds = reports?.map(r => r.subcontractor_user_id).filter(Boolean) || [];
        const { data: submitterProfiles } = submitterIds.length > 0 
          ? await supabase
              .from('profiles')
              .select('id, first_name, last_name')
              .in('id', submitterIds)
          : { data: [] };
        
        const submitterMap = new Map<string, any>();
        submitterProfiles?.forEach(p => submitterMap.set(p.id, p));

        reports?.forEach(report => {
          const workOrder = workOrderMap.get(report.work_order_id);
          if (!workOrder) return;

          const submitterProfile = submitterMap.get(report.subcontractor_user_id);
          const submitterName = submitterProfile 
            ? `${submitterProfile.first_name} ${submitterProfile.last_name}`
            : 'Subcontractor';

          if (role === 'subcontractor') {
            // For subcontractors, show submission activity
            activities.push({
              id: `report-${report.id}`,
              type: 'report_submitted',
              work_order_id: report.work_order_id,
              work_order_number: workOrder.work_order_number,
              work_order_title: workOrder.title,
              location: `${workOrder.store_location}, ${workOrder.city}`,
              timestamp: report.submitted_at,
              title: 'Report submitted',
              description: 'You submitted a work report',
              actionUrl: `/${role}/work-orders/${report.work_order_id}`
            });

            // Add approval activity if approved and reviewed_at is different
            if (report.status === 'approved' && report.reviewed_at && report.reviewed_at !== report.submitted_at) {
              activities.push({
                id: `report-approved-${report.id}`,
                type: 'report_approved',
                work_order_id: report.work_order_id,
                work_order_number: workOrder.work_order_number,
                work_order_title: workOrder.title,
                location: `${workOrder.store_location}, ${workOrder.city}`,
                timestamp: report.reviewed_at,
                title: 'Report approved',
                description: 'Your report was approved',
                actionUrl: `/${role}/work-orders/${report.work_order_id}`
              });
            }
          } else if (role === 'partner') {
            // For partners, only show approved reports
            activities.push({
              id: `report-approved-${report.id}`,
              type: 'report_approved',
              work_order_id: report.work_order_id,
              work_order_number: workOrder.work_order_number,
              work_order_title: workOrder.title,
              location: `${workOrder.store_location}, ${workOrder.city}`,
              timestamp: report.reviewed_at || report.submitted_at,
              title: 'Report approved',
              description: `${submitterName} had their report approved`,
              actionUrl: `/${role}/work-orders/${report.work_order_id}`
            });
          }
        });
      }

      // Sort all activities by timestamp (newest first) and limit to 50
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);

    } catch (error) {
      console.error('Error fetching activity feed:', error);
      return [];
    }
  };

  const query = useQuery({
    queryKey: ['partner-subcontractor-activity-feed', role, profile?.id],
    queryFn: fetchActivities,
    enabled: !!profile?.id && ((role === 'partner' && isPartner()) || (role === 'subcontractor' && isSubcontractor())),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set up real-time subscriptions
  useEffect(() => {
    if (!profile?.id) return;

    const channels = [
      // Messages
      supabase
        .channel('activity-messages')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'work_order_messages'
        }, () => {
          queryClient.invalidateQueries({
            queryKey: ['partner-subcontractor-activity-feed', role, profile.id]
          });
        }),

      // Audit logs for status changes
      supabase
        .channel('activity-audit')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'audit_logs'
        }, () => {
          queryClient.invalidateQueries({
            queryKey: ['partner-subcontractor-activity-feed', role, profile.id]
          });
        }),

      // Assignments
      supabase
        .channel('activity-assignments')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'work_order_assignments'
        }, () => {
          queryClient.invalidateQueries({
            queryKey: ['partner-subcontractor-activity-feed', role, profile.id]
          });
        }),

      // Reports
      supabase
        .channel('activity-reports')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'work_order_reports'
        }, () => {
          queryClient.invalidateQueries({
            queryKey: ['partner-subcontractor-activity-feed', role, profile.id]
          });
        })
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [profile?.id, role, queryClient]);

  return {
    activities: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
}