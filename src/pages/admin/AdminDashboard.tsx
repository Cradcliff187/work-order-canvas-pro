
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorkOrderStats } from "@/hooks/useWorkOrderStats";
import { useEmailSystemHealth } from "@/hooks/useEmailSystemHealth";
import { EmailSystemActions } from "@/components/admin/EmailSystemActions";
import { SimpleEmailTest } from "@/components/admin/SimpleEmailTest";
import { 
  ClipboardList, 
  Users, 
  Building2, 
  CheckCircle2, 
  AlertTriangle,
  Mail,
  MailCheck,
  MailX,
  Clock
} from "lucide-react";

const AdminDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useWorkOrderStats();
  const { 
    healthData, 
    isLoading: healthLoading, 
    testEmailSystem, 
    createTestWorkOrder, 
    refreshHealth,
    isTestRunning,
    lastTestResult
  } = useEmailSystemHealth();

  if (statsLoading || healthLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-8 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Badge variant="outline" className="text-sm">
          Last updated: {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Work Orders</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.totalWorkOrders || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Pending Work Orders</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.pendingWorkOrders || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting assignment
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Active Users</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.activeUsers || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              All user types
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Organizations</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.totalOrganizations || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Partners & Subcontractors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email System Health
          </CardTitle>
          <CardDescription>
            Monitor email system status and delivery metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4 mb-6">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthStatusColor(healthData?.smtp_status || 'unknown')}`}>
                {healthData?.smtp_status === 'healthy' ? (
                  <MailCheck className="h-8 w-8 mx-auto mb-2" />
                ) : (
                  <MailX className="h-8 w-8 mx-auto mb-2" />
                )}
                {healthData?.smtp_status || 'Unknown'}
              </div>
              <div className="text-sm text-muted-foreground">SMTP Status</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{healthData?.emails_sent_today || 0}</div>
              <div className="text-sm text-muted-foreground">Emails Today</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{healthData?.successful_deliveries || 0}</div>
              <div className="text-sm text-muted-foreground">Delivered</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{healthData?.failed_deliveries || 0}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>

          {healthData?.recent_errors && healthData.recent_errors.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Recent Errors
              </h4>
              <div className="space-y-2">
                {healthData.recent_errors.slice(0, 3).map((error: any, index: number) => (
                  <div key={index} className="text-sm p-2 bg-destructive/10 rounded">
                    <div className="font-medium">{error.error_type}</div>
                    <div className="text-muted-foreground">{error.error_message}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(error.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Testing Tools */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EmailSystemActions 
          onTestEmailSystem={testEmailSystem}
          onCreateTestWorkOrder={createTestWorkOrder}
          onRefreshHealth={refreshHealth}
          isTestRunning={isTestRunning}
          lastTestResult={lastTestResult}
        />
        <SimpleEmailTest />
      </div>
    </div>
  );
};

export default AdminDashboard;
