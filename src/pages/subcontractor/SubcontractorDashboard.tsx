
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Eye, 
  Plus,
  ClipboardList
} from 'lucide-react';
import { useSubcontractorWorkOrders } from '@/hooks/useSubcontractorWorkOrders';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { StandardDashboardStats, StatCard } from '@/components/dashboard/StandardDashboardStats';

import { format } from 'date-fns';

const SubcontractorDashboard = () => {
  const navigate = useNavigate();
  const { assignedWorkOrders, reports, dashboardStats } = useSubcontractorWorkOrders();

  // Get recent work orders (last 5)
  const recentWorkOrders = assignedWorkOrders.data?.slice(0, 5) || [];

  // Map stats data to StatCard format
  const statsData: StatCard[] = [
    {
      icon: FileText,
      label: "Available Work Orders",
      value: assignedWorkOrders.data?.length || 0,
      description: "Assigned to you"
    },
    {
      icon: Clock,
      label: "Active Work Orders",
      value: assignedWorkOrders.data?.filter(wo => wo.status === 'assigned' || wo.status === 'in_progress').length || 0,
      description: "In progress"
    },
    {
      icon: CheckCircle,
      label: "Completed This Month",
      value: dashboardStats.data?.completedThisMonth || 0,
      description: "This month"
    },
    {
      icon: TrendingUp,
      label: "Reports Submitted",
      value: reports.data?.length || 0,
      description: "All time"
    }
  ];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subcontractor Dashboard</h1>
        <p className="text-muted-foreground">Manage your assigned work orders and submit reports</p>
      </div>


      {/* Summary Cards */}
      <StandardDashboardStats stats={statsData} loading={assignedWorkOrders.isLoading} className="mb-8" />

      {/* Recent Work Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Work Orders</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/subcontractor/work-orders')}
          >
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {assignedWorkOrders.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : recentWorkOrders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No work orders assigned yet"
              description="Work orders will appear here once they're assigned to you by your team."
              action={{
                label: "View All Work Orders",
                onClick: () => navigate('/subcontractor/work-orders'),
                icon: Eye
              }}
              variant="card"
            />
          ) : (
            <div className="space-y-4">
              {recentWorkOrders.map((workOrder) => (
                <div 
                  key={workOrder.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{workOrder.work_order_number}</span>
                      <WorkOrderStatusBadge status={workOrder.status} />
                    </div>
                    <h4 className="font-medium mb-1">{workOrder.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {workOrder.store_location} • {workOrder.city}, {workOrder.state}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted: {format(new Date(workOrder.date_submitted), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/subcontractor/work-orders/${workOrder.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubcontractorDashboard;
