import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { Plus, FileText, Clock, CheckCircle, TrendingUp, Eye, Building2 } from 'lucide-react';
import { usePartnerWorkOrders, usePartnerWorkOrderStats } from '@/hooks/usePartnerWorkOrders';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';


const PartnerDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: stats, isLoading: statsLoading } = usePartnerWorkOrderStats();
  const { data: recentWorkOrders, isLoading: workOrdersLoading } = usePartnerWorkOrders();
  const { data: userOrganizations, isLoading: orgLoading } = useUserOrganizations();

  // Get last 10 work orders for recent activity
  const recentOrders = recentWorkOrders?.data?.slice(0, 10) || [];
  
  // Get primary organization
  const primaryOrganization = userOrganizations?.[0];
  
  // Check if user's organizations have initials set up for smart numbering
  const hasInitialsConfigured = primaryOrganization?.initials && primaryOrganization.initials.trim() !== '';

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Partner Dashboard</h1>
          <p className="text-muted-foreground">Manage your organization's work orders and track progress</p>
        </div>
        <Button onClick={() => navigate('/partner/work-orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Work Order
        </Button>
      </div>

      {/* Organization Context */}
      {primaryOrganization && (
        <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20 mb-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{primaryOrganization.name}</h2>
            <p className="text-sm text-muted-foreground">
              Organization ID: {primaryOrganization.initials || 'Not configured'} • {primaryOrganization.contact_email}
            </p>
          </div>
        </div>
      )}

      {/* Organization Numbering Status */}
      {!hasInitialsConfigured && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-2">
                <Building2 className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-orange-900">Work Order Numbering</h3>
                <p className="text-sm text-orange-700">
                  Your organization doesn't have initials configured. Work orders will use generic numbering (WO-2025-0001). 
                  Contact your administrator to set up custom numbering with your organization's initials.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Work Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '—' : stats?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Work Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '—' : stats?.active || 0}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '—' : stats?.completedThisMonth || 0}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '—' : stats?.avgCompletionDays ? `${stats.avgCompletionDays}d` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Average days</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Work Orders */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Work Orders</CardTitle>
            <CardDescription>Your latest work order submissions and updates</CardDescription>
          </div>
          <Button variant="outline" onClick={() => navigate('/partner/work-orders')}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {workOrdersLoading ? (
            <div className="text-center py-8">Loading recent work orders...</div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No work orders submitted yet</p>
              <Button onClick={() => navigate('/partner/work-orders/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Submit Your First Work Order
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order #</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((workOrder) => (
                    <TableRow key={workOrder.id}>
                      <TableCell className="font-medium">
                        {workOrder.work_order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{workOrder.store_location}</div>
                          <div className="text-sm text-muted-foreground">
                            {workOrder.city}, {workOrder.state}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {workOrder.trades?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <WorkOrderStatusBadge status={workOrder.status} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(workOrder.date_submitted), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/partner/work-orders/${workOrder.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerDashboard;