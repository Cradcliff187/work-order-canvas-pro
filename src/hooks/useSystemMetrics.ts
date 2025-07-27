import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmailQueueStats } from './useEmailQueueStats';

export interface SystemMetric {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  status: 'healthy' | 'warning' | 'critical';
  description?: string;
}

export interface SystemMetrics {
  activeUsers: SystemMetric;
  organizations: SystemMetric;
  workOrders: SystemMetric;
  emailQueue: SystemMetric;
  messagesHealth: SystemMetric;
}

export const useSystemMetrics = () => {
  const { stats: emailStats, isLoading: emailLoading } = useEmailQueueStats();

  const { data: metrics, isLoading: metricsLoading, error } = useQuery({
    queryKey: ['system_metrics'],
    queryFn: async (): Promise<SystemMetrics> => {
      // Fetch user metrics
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, created_at, is_active')
        .eq('is_active', true);

      if (usersError) throw usersError;

      const totalUsers = users?.length || 0;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const newUsersThisWeek = users?.filter(u => new Date(u.created_at) >= weekAgo).length || 0;
      const weeklyChange = newUsersThisWeek > 0 ? `+${newUsersThisWeek}` : '0';

      // Fetch organization metrics
      const { data: organizations, error: orgsError } = await supabase
        .from('organizations')
        .select('id, is_active')
        .eq('is_active', true);

      if (orgsError) throw orgsError;

      const totalOrgs = organizations?.length || 0;

      // Check for organization issues by looking for users without organizations
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('user_id');

      if (userOrgsError) throw userOrgsError;

      const usersWithOrgs = new Set(userOrgs?.map(uo => uo.user_id) || []);
      const usersWithoutOrgs = users?.filter(u => !usersWithOrgs.has(u.id)).length || 0;

      // Fetch work order metrics
      const { data: workOrders, error: workOrdersError } = await supabase
        .from('work_orders')
        .select('status');

      if (workOrdersError) throw workOrdersError;

      const totalWorkOrders = workOrders?.length || 0;
      const completedWorkOrders = workOrders?.filter(wo => wo.status === 'completed').length || 0;
      const completionRate = totalWorkOrders > 0 ? Math.round((completedWorkOrders / totalWorkOrders) * 100) : 0;

      // Calculate email delivery rate
      const emailDeliveryRate = emailStats ? 
        emailStats.total_emails > 0 ? 
          Math.round((emailStats.sent_emails / emailStats.total_emails) * 100) : 100
        : 0;

      // Fetch messaging metrics
      const { data: todayMessages, error: todayMessagesError } = await supabase
        .from('work_order_messages')
        .select('id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (todayMessagesError) throw todayMessagesError;

      const { data: weekMessages, error: weekMessagesError } = await supabase
        .from('work_order_messages')
        .select('id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (weekMessagesError) throw weekMessagesError;

      const todayMessageCount = todayMessages?.length || 0;
      const weekMessageCount = weekMessages?.length || 0;
      const dailyAverage = weekMessageCount / 7;
      const messageChangePercent = dailyAverage > 0 ? Math.round(((todayMessageCount - dailyAverage) / dailyAverage) * 100) : 0;
      
      // Determine message health status
      let messageStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (messageChangePercent >= 100) {
        messageStatus = 'critical';
      } else if (messageChangePercent >= 50) {
        messageStatus = 'warning';
      }

      const messageChange = messageChangePercent > 0 ? 
        `+${messageChangePercent}% from avg` : 
        messageChangePercent < 0 ? 
          `${messageChangePercent}% from avg` : 
          'At average';

      return {
        activeUsers: {
          label: 'Active Users',
          value: totalUsers,
          change: weeklyChange,
          changeType: newUsersThisWeek > 0 ? 'positive' : 'neutral',
          status: totalUsers > 0 ? 'healthy' : 'warning',
          description: 'Active user accounts'
        },
        organizations: {
          label: 'Organizations',
          value: totalOrgs,
          change: usersWithoutOrgs > 0 ? `${usersWithoutOrgs} issues` : 'No issues',
          changeType: usersWithoutOrgs > 0 ? 'negative' : 'positive',
          status: usersWithoutOrgs === 0 ? 'healthy' : usersWithoutOrgs < 5 ? 'warning' : 'critical',
          description: 'Partner & subcontractor organizations'
        },
        workOrders: {
          label: 'Work Orders',
          value: totalWorkOrders,
          change: `${completionRate}% complete`,
          changeType: completionRate >= 80 ? 'positive' : completionRate >= 50 ? 'neutral' : 'negative',
          status: completionRate >= 80 ? 'healthy' : completionRate >= 50 ? 'warning' : 'critical',
          description: 'Total work orders in system'
        },
        emailQueue: {
          label: 'Email Queue',
          value: emailStats?.total_emails || 0,
          change: `${emailDeliveryRate}% delivered`,
          changeType: emailDeliveryRate >= 90 ? 'positive' : emailDeliveryRate >= 70 ? 'neutral' : 'negative',
          status: emailDeliveryRate >= 90 ? 'healthy' : emailDeliveryRate >= 70 ? 'warning' : 'critical',
          description: 'Email delivery performance'
        },
        messagesHealth: {
          label: 'Messages Today',
          value: todayMessageCount,
          change: messageChange,
          changeType: messageChangePercent <= 0 ? 'neutral' : messageChangePercent < 50 ? 'positive' : 'negative',
          status: messageStatus,
          description: 'Work order messaging activity'
        }
      };
    },
    refetchInterval: 60000, // 1 minute
  });

  return {
    metrics,
    isLoading: metricsLoading || emailLoading,
    error
  };
};