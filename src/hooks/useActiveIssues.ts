import { useQuery } from '@tanstack/react-query';
import { useDataIntegrity } from './useDataIntegrity';
import { useEmailQueueStats } from './useEmailQueueStats';
import { useDatabasePerformance } from './useDatabasePerformance';
import { useMessagingHealth } from './useMessagingHealth';
import { supabase } from '@/integrations/supabase/client';

export interface SystemIssue {
  id: string;
  type: 'organization' | 'data_integrity' | 'email' | 'performance' | 'messaging';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  source: string;
  count?: number;
  timestamp: Date;
  isAutoFixable: boolean;
  fixFunction?: () => Promise<void>;
  viewDetailsFunction?: () => void;
}

export const useActiveIssues = () => {
  const dataIntegrity = useDataIntegrity();
  const emailStats = useEmailQueueStats();
  const dbPerformance = useDatabasePerformance();
  const messagingHealth = useMessagingHealth();

  const { data: organizationIssues, isLoading: orgLoading } = useQuery({
    queryKey: ['organization_issues'],
    queryFn: async () => {
      const issues = [];

      try {
        // Get users without organizations (excluding admins)
        const { data: usersWithoutOrgs, error: noOrgsError } = await supabase
          .from('profiles')
          .select(`
            id,
            email,
            first_name,
            last_name,
            user_type,
            user_organizations!left(organization_id)
          `)
          .neq('user_type', 'admin')
          .is('user_organizations.organization_id', null);

        if (noOrgsError) throw noOrgsError;

        const noOrgCount = usersWithoutOrgs?.length || 0;
        if (noOrgCount > 0) {
          issues.push({
            type: 'no_organization',
            count: noOrgCount,
            severity: noOrgCount > 5 ? 'critical' : noOrgCount > 2 ? 'high' : 'medium'
          });
        }

        // Get users with multiple organizations
        const { data: userOrgCounts, error: multiOrgsError } = await supabase
          .from('user_organizations')
          .select('user_id');

        if (multiOrgsError) throw multiOrgsError;

        const orgCountMap = userOrgCounts?.reduce((acc, { user_id }) => {
          acc[user_id] = (acc[user_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const multiOrgCount = Object.values(orgCountMap).filter(count => count > 1).length;
        if (multiOrgCount > 0) {
          issues.push({
            type: 'multiple_organizations',
            count: multiOrgCount,
            severity: multiOrgCount > 10 ? 'high' : 'medium'
          });
        }

      } catch (error) {
        console.error('Error fetching organization issues:', error);
        throw error;
      }

      return issues;
    },
    refetchInterval: 300000, // 5 minutes
  });

  const { data: allIssues, isLoading: issuesLoading } = useQuery({
    queryKey: ['active_issues'],
    queryFn: async (): Promise<SystemIssue[]> => {
      const issues: SystemIssue[] = [];
      const now = new Date();

      // Data Integrity Issues
      if (dataIntegrity.result?.issues) {
        dataIntegrity.result.issues.forEach((issue, index) => {
          issues.push({
            id: `data_integrity_${issue.type}`,
            type: 'data_integrity',
            severity: issue.severity,
            title: issue.label,
            description: issue.description,
            source: 'Data Integrity',
            count: issue.count,
            timestamp: now,
            isAutoFixable: false, // Data integrity issues typically need manual review
          });
        });
      }

      // Email Issues
      if (emailStats.stats) {
        const { failed_emails, pending_emails } = emailStats.stats;
        
        if (failed_emails > 0) {
          issues.push({
            id: 'email_failed',
            type: 'email',
            severity: failed_emails > 10 ? 'critical' : failed_emails > 5 ? 'high' : 'medium',
            title: 'Failed Email Deliveries',
            description: `${failed_emails} emails failed to send and need attention`,
            source: 'Email System',
            count: failed_emails,
            timestamp: now,
            isAutoFixable: true,
            fixFunction: async () => {
              emailStats.retryFailedEmails();
            },
          });
        }

        if (pending_emails > 50) {
          issues.push({
            id: 'email_pending',
            type: 'email',
            severity: pending_emails > 100 ? 'high' : 'medium',
            title: 'High Email Queue Backlog',
            description: `${pending_emails} emails pending in queue - processing may be delayed`,
            source: 'Email System',
            count: pending_emails,
            timestamp: now,
            isAutoFixable: true,
            fixFunction: async () => {
              emailStats.processQueue();
            },
          });
        }
      }

      // Performance Issues
      if (dbPerformance.data?.growthMetrics) {
        const highGrowthTables = dbPerformance.data.growthMetrics.filter(
          metric => metric.growth_color === 'red'
        );

        if (highGrowthTables.length > 0) {
          issues.push({
            id: 'performance_growth',
            type: 'performance',
            severity: 'medium',
            title: 'High Database Growth Rate',
            description: `${highGrowthTables.length} tables showing unusually high growth rates`,
            source: 'Database Performance',
            count: highGrowthTables.length,
            timestamp: now,
            isAutoFixable: false,
          });
        }
      }

      // Messaging Issues
      if (messagingHealth.data) {
        const { queueStatus, realtimeHealth } = messagingHealth.data;
        
        if (queueStatus.failedMessages > 0) {
          issues.push({
            id: 'messaging_failed',
            type: 'messaging',
            severity: queueStatus.failedMessages > 5 ? 'high' : 'medium',
            title: 'Failed Message Deliveries',
            description: `${queueStatus.failedMessages} messages failed to deliver`,
            source: 'Messaging System',
            count: queueStatus.failedMessages,
            timestamp: now,
            isAutoFixable: false,
          });
        }

        if (realtimeHealth.connectionQuality !== 'excellent') {
          issues.push({
            id: 'messaging_connection',
            type: 'messaging',
            severity: realtimeHealth.connectionQuality === 'poor' ? 'high' : 'medium',
            title: 'Real-time Connection Issues',
            description: `Real-time messaging connection quality is ${realtimeHealth.connectionQuality}`,
            source: 'Messaging System',
            timestamp: now,
            isAutoFixable: false,
          });
        }

        if (queueStatus.offlineQueueSize > 10) {
          issues.push({
            id: 'messaging_offline_queue',
            type: 'messaging',
            severity: queueStatus.offlineQueueSize > 50 ? 'high' : 'medium',
            title: 'Large Offline Message Queue',
            description: `${queueStatus.offlineQueueSize} messages queued for offline users`,
            source: 'Messaging System',
            count: queueStatus.offlineQueueSize,
            timestamp: now,
            isAutoFixable: false,
          });
        }
      }

      // Organization Issues
      if (organizationIssues) {
        organizationIssues.forEach((orgIssue: any) => {
          const titles = {
            no_organization: 'Users Without Organizations',
            multiple_organizations: 'Users With Multiple Organizations'
          };

          const descriptions = {
            no_organization: 'Users that need to be assigned to an organization',
            multiple_organizations: 'Users assigned to multiple organizations - may cause access issues'
          };

          issues.push({
            id: `organization_${orgIssue.type}`,
            type: 'organization',
            severity: orgIssue.severity,
            title: titles[orgIssue.type as keyof typeof titles] || 'Organization Issue',
            description: descriptions[orgIssue.type as keyof typeof descriptions] || 'Organization assignment issue',
            source: 'Organization Health',
            count: orgIssue.count,
            timestamp: now,
            isAutoFixable: orgIssue.type === 'no_organization',
          });
        });
      }

      // Sort by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    },
    enabled: !dataIntegrity.isLoading && !emailStats.isLoading && !dbPerformance.isLoading && !messagingHealth.isLoading && !orgLoading,
    refetchInterval: 60000, // 1 minute
  });

  const autoFixableIssues = allIssues?.filter(issue => issue.isAutoFixable) || [];

  const fixAllAutoFixableIssues = async () => {
    const fixPromises = autoFixableIssues
      .filter(issue => issue.fixFunction)
      .map(issue => issue.fixFunction!());

    try {
      await Promise.all(fixPromises);
    } catch (error) {
      console.error('Error fixing issues:', error);
      throw error;
    }
  };

  return {
    issues: allIssues || [],
    isLoading: issuesLoading || dataIntegrity.isLoading || emailStats.isLoading || dbPerformance.isLoading || messagingHealth.isLoading || orgLoading,
    error: dataIntegrity.error || emailStats.error || dbPerformance.error || messagingHealth.error,
    autoFixableIssues,
    fixAllAutoFixableIssues,
    refetch: () => {
      dataIntegrity.refetch();
      emailStats.refetch();
      dbPerformance.refetch();
      messagingHealth.refetch();
    },
  };
};