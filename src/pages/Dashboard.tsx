import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ClipboardList, 
  Users, 
  Building2, 
  Clock, 
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

const Dashboard = () => {
  const { profile } = useAuth();

  const stats = [
    {
      title: 'Active Work Orders',
      value: '12',
      description: '+2 from last week',
      icon: ClipboardList,
      color: 'text-primary'
    },
    {
      title: 'Total Projects',
      value: '8',
      description: '+1 new project',
      icon: Building2,
      color: 'text-success'
    },
    {
      title: 'Team Members',
      value: '24',
      description: 'Across all projects',
      icon: Users,
      color: 'text-warning'
    },
    {
      title: 'Pending Tasks',
      value: '5',
      description: 'Require attention',
      icon: Clock,
      color: 'text-destructive'
    }
  ];

  const recentWorkOrders = [
    {
      id: '1',
      title: 'Install HVAC System - Building A',
      project: 'Downtown Office Complex',
      status: 'in_progress',
      priority: 'high',
      assignee: 'Mike Johnson',
      dueDate: '2024-01-15'
    },
    {
      id: '2',
      title: 'Electrical Rough-in - Floor 3',
      project: 'Residential Tower',
      status: 'pending',
      priority: 'medium',
      assignee: 'Sarah Davis',
      dueDate: '2024-01-18'
    },
    {
      id: '3',
      title: 'Drywall Installation',
      project: 'Medical Center Expansion',
      status: 'completed',
      priority: 'low',
      assignee: 'Tom Wilson',
      dueDate: '2024-01-12'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-primary text-primary-foreground">In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4 text-warning" />;
      case 'low':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return null;
    }
  };

  const canCreateWorkOrders = profile?.user_type && ['admin', 'partner'].includes(profile.user_type);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.first_name}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your construction projects and work orders.
          </p>
        </div>
        {canCreateWorkOrders && (
          <Button className="shadow-lg">
            <Plus className="mr-2 h-4 w-4" />
            New Work Order
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Work Orders */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Work Orders</CardTitle>
          <CardDescription>
            Latest work orders across your projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentWorkOrders.map((workOrder) => (
              <div
                key={workOrder.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  {getPriorityIcon(workOrder.priority)}
                  <div>
                    <h4 className="font-medium">{workOrder.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {workOrder.project} • Assigned to {workOrder.assignee}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">Due {workOrder.dueDate}</p>
                    {getStatusBadge(workOrder.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full">
              View All Work Orders
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;