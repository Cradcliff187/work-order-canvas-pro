import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailQueueStatus } from '@/components/admin/EmailQueueStatus';
import { EmailFailedManager } from '@/components/admin/EmailFailedManager';
import { OrganizationHealthTab } from '@/components/admin/system-health/OrganizationHealthTab';
import { DataIntegrityTab } from '@/components/admin/system-health/DataIntegrityTab';
import { DatabasePerformanceTab } from '@/components/admin/system-health/DatabasePerformanceTab';
import { MessagingSystemTab } from '@/components/admin/system-health/MessagingSystemTab';
import { ActiveIssuesTab } from '@/components/admin/system-health/ActiveIssuesTab';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import { StandardDashboardStats } from '@/components/dashboard/StandardDashboardStats';
import { 
  Users,
  Building2,
  ClipboardList,
  Mail,
  MessageSquare
} from 'lucide-react';

const SystemHealthCheck = () => {
  const { metrics, isLoading: metricsLoading } = useSystemMetrics();

  const getMetricStats = () => {
    if (!metrics) return [];

    return [
      {
        icon: Users,
        label: metrics.activeUsers.label,
        value: metrics.activeUsers.value,
        description: metrics.activeUsers.change,
        variant: (metrics.activeUsers.status === 'healthy' ? 'success' : 
               metrics.activeUsers.status === 'warning' ? 'warning' : 'destructive') as 'default' | 'warning' | 'success' | 'destructive'
      },
      {
        icon: Building2,
        label: metrics.organizations.label,
        value: metrics.organizations.value,
        description: metrics.organizations.change,
        variant: (metrics.organizations.status === 'healthy' ? 'success' : 
               metrics.organizations.status === 'warning' ? 'warning' : 'destructive') as 'default' | 'warning' | 'success' | 'destructive'
      },
      {
        icon: ClipboardList,
        label: metrics.workOrders.label,
        value: metrics.workOrders.value,
        description: metrics.workOrders.change,
        variant: (metrics.workOrders.status === 'healthy' ? 'success' : 
               metrics.workOrders.status === 'warning' ? 'warning' : 'destructive') as 'default' | 'warning' | 'success' | 'destructive'
      },
      {
        icon: Mail,
        label: metrics.emailQueue.label,
        value: metrics.emailQueue.value,
        description: metrics.emailQueue.change,
        variant: (metrics.emailQueue.status === 'healthy' ? 'success' : 
               metrics.emailQueue.status === 'warning' ? 'warning' : 'destructive') as 'default' | 'warning' | 'success' | 'destructive'
      },
      {
        icon: MessageSquare,
        label: metrics.messagesHealth.label,
        value: metrics.messagesHealth.value,
        description: metrics.messagesHealth.change,
        variant: (metrics.messagesHealth.status === 'healthy' ? 'success' : 
               metrics.messagesHealth.status === 'warning' ? 'warning' : 'destructive') as 'default' | 'warning' | 'success' | 'destructive'
      }
    ];
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">System Health</h1>
        <p className="text-muted-foreground">Technical monitoring and system status</p>
      </div>

      {/* System Metrics Overview */}
      <div className="mb-8">
        <StandardDashboardStats 
          stats={getMetricStats()} 
          loading={metricsLoading}
          className="mb-6"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="organization">Organization & Users</TabsTrigger>
          <TabsTrigger value="data-integrity">Data Integrity</TabsTrigger>
          <TabsTrigger value="database-performance">Database Performance</TabsTrigger>
          <TabsTrigger value="messaging-system">Messaging System</TabsTrigger>
          <TabsTrigger value="active-issues">Active Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Email Queue Automation */}
          <Card>
            <CardHeader>
              <CardTitle>Email Queue Automation</CardTitle>
              <CardDescription>
                Monitor email queue status and automated processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailQueueStatus />
            </CardContent>
          </Card>

          {/* Failed Email Management */}
          <div>
            <EmailFailedManager />
          </div>
        </TabsContent>

        <TabsContent value="organization">
          <OrganizationHealthTab />
        </TabsContent>

        <TabsContent value="data-integrity">
          <DataIntegrityTab />
        </TabsContent>

        <TabsContent value="database-performance">
          <DatabasePerformanceTab />
        </TabsContent>

        <TabsContent value="messaging-system">
          <MessagingSystemTab />
        </TabsContent>

        <TabsContent value="active-issues">
          <ActiveIssuesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemHealthCheck;