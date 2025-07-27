
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, FileText, Clock, CheckCircle, TrendingUp, Eye, Building2, ClipboardList } from 'lucide-react';
import { usePartnerWorkOrders, usePartnerWorkOrderStats } from '@/hooks/usePartnerWorkOrders';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';
import { useAuth } from '@/contexts/AuthContext';
import { OrganizationValidationAlert } from '@/components/OrganizationValidationAlert';
import { OrganizationBadge } from '@/components/OrganizationBadge';
import { StandardDashboardStats, StatCard } from '@/components/dashboard/StandardDashboardStats';
import { MobileOrganizationSelector } from '@/components/layout/MobileOrganizationSelector';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, differenceInDays } from 'date-fns';

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const { data: stats, isLoading: statsLoading } = usePartnerWorkOrderStats();
  const { data: recentWorkOrders, isLoading: workOrdersLoading } = usePartnerWorkOrders();
  const { data: userOrganizations, isLoading: orgLoading } = useUserOrganizations();

  // Get last 10 work orders for recent activity
  const recentOrders = recentWorkOrders?.data?.slice(0, 10) || [];
  
  // Get primary organization
  const primaryOrganization = userOrganizations?.[0];
  
  // Check if user's organizations have initials set up for smart numbering
  const hasInitialsConfigured = primaryOrganization?.initials && primaryOrganization.initials.trim() !== '';

  // Map stats data to StatCard format
  const statsData: StatCard[] = [
    {
      icon: FileText,
      label: "Total Work Orders",
      value: stats?.total || 0,
      description: "All time"
    },
    {
      icon: Clock,
      label: "Active Work Orders",
      value: stats?.active || 0,
      description: "In progress"
    },
    {
      icon: CheckCircle,
      label: "Completed This Month",
      value: stats?.completedThisMonth || 0,
      description: "This month"
    },
    {
      icon: TrendingUp,
      label: "Avg. Completion Time",
      value: stats?.avgCompletionDays ? `${stats.avgCompletionDays}d` : 'N/A',
      description: "Average days"
    }
  ];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Partner Dashboard</h1>
          <p className="text-muted-foreground">Manage your organization's work orders and track progress</p>
        </div>
        {isMobile ? (
          <div className="fixed bottom-20 right-4 z-50">
            <Button 
              onClick={() => navigate('/partner/work-orders/new')}
              className="h-14 w-14 rounded-full shadow-lg border border-primary/20 active:scale-95 active:bg-primary/80 transition-all duration-200"
              size="icon"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        ) : (
          <Button 
            onClick={() => navigate('/partner/work-orders/new')}
            className="shadow-sm border border-primary/20 px-6 py-3 active:bg-primary/80 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
        )}
      </div>

      {/* Organization Validation Alert */}
      <OrganizationValidationAlert className="mb-6" />

      {/* Organization Context */}
      {primaryOrganization && userOrganizations && (
        <>
          {isMobile ? (
            <MobileOrganizationSelector
              organizations={userOrganizations}
              currentOrganization={primaryOrganization}
              className="mb-4"
            />
          ) : (
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20 mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold">{primaryOrganization.name}</h2>
                  <OrganizationBadge 
                    organization={{ 
                      name: primaryOrganization.name, 
                      organization_type: 'partner' 
                    }} 
                    size="sm"
                    showIcon={false}
                    showType={false}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Organization ID: {primaryOrganization.initials || 'Not configured'} • {primaryOrganization.contact_email}
                </p>
              </div>
            </div>
          )}
        </>
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
      <StandardDashboardStats stats={statsData} loading={statsLoading} className="mb-8" />

      {/* Recent Work Orders */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {workOrdersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex gap-4">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No work orders submitted yet"
              description="Get started by submitting your first work order to track and manage your organization's maintenance requests."
              action={{
                label: "Submit Your First Work Order",
                onClick: () => navigate('/partner/work-orders/new'),
                icon: Plus
              }}
              variant="full"
            />
          ) : (
            <div className="relative overflow-x-auto">
              {/* Scroll fade hint for mobile */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none sm:hidden" />
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order #</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Days Old</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((workOrder) => (
                    <TableRow 
                      key={workOrder.id}
                      className="min-h-[60px] border-b border-gray-100 cursor-pointer active:bg-gray-50 transition-colors sm:min-h-auto sm:active:bg-inherit sm:cursor-default"
                      onClick={() => navigate(`/partner/work-orders/${workOrder.id}`)}
                    >
                      <TableCell className="font-medium py-4">
                        {workOrder.work_order_number}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                          <div className="font-medium">{workOrder.store_location}</div>
                          <div className="text-sm text-muted-foreground">
                            {workOrder.city}, {workOrder.state}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center">
                          <span className="font-medium sm:font-normal">
                            {workOrder.trades?.name || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <WorkOrderStatusBadge 
                          status={workOrder.status} 
                          className="sm:px-2 sm:py-1"
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-muted-foreground">
                          {differenceInDays(new Date(), new Date(workOrder.date_submitted))} days
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        {format(new Date(workOrder.date_submitted), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/partner/work-orders/${workOrder.id}`);
                          }}
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
