
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { usePartnerSubcontractorActivityFeed } from '@/hooks/usePartnerSubcontractorActivityFeed';

import { StandardDashboardStats, StatCard } from '@/components/dashboard/StandardDashboardStats';
import { DashboardActivityFeed } from '@/components/dashboard/DashboardActivityFeed';
import { OrganizationActivityCard } from '@/components/mobile/OrganizationActivityCard';
import { OrganizationMembersCard } from '@/components/mobile/OrganizationMembersCard';
import { useOrganizationTeamData } from '@/hooks/useOrganizationTeamData';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEnhancedPermissions } from '@/hooks/useEnhancedPermissions';


const SubcontractorDashboard = () => {
  const navigate = useNavigate();
  const { organizationMembers, organizationActivity, isLoading: teamDataLoading } = useOrganizationTeamData();
  const isMobile = useIsMobile();
  const permissions = useEnhancedPermissions();
  const { activities, isLoading: activitiesLoading, error: activitiesError, refetch: refetchActivities } = usePartnerSubcontractorActivityFeed('subcontractor');

  // Get organization IDs for queries
  const organizationIds = React.useMemo(() => {
    return permissions.user?.userOrganizations?.map(org => org.organization_id) || [];
  }, [permissions.user?.userOrganizations]);

  // Fetch assigned work orders
  const { data: assignedWorkOrders = [] } = useQuery({
    queryKey: ['subcontractor-assigned-work-orders', organizationIds],
    queryFn: async () => {
      if (organizationIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .in('assigned_organization_id', organizationIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: organizationIds.length > 0,
    staleTime: 30 * 1000,
  });

  // Fetch reports
  const { data: reports = [] } = useQuery({
    queryKey: ['subcontractor-reports', permissions.user?.id],
    queryFn: async () => {
      if (!permissions.user?.id) return [];
      
      const { data, error } = await supabase
        .from('work_order_reports')
        .select('*')
        .eq('subcontractor_user_id', permissions.user.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!permissions.user?.id,
    staleTime: 30 * 1000,
  });

  // Calculate dashboard stats
  const dashboardStats = React.useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const completedThisMonth = assignedWorkOrders.filter(wo => 
      wo.status === 'completed' && new Date(wo.updated_at) >= startOfMonth
    ).length;

    return { completedThisMonth };
  }, [assignedWorkOrders]);
  
  // Refetch activities when component mounts or when user returns to dashboard
  React.useEffect(() => {
    const handleFocus = () => {
      console.log('Subcontractor dashboard focused - refetching activities');
      refetchActivities();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchActivities]);

  // Map stats data to StatCard format - Individual metrics only
  const statsData: StatCard[] = [
    {
      icon: FileText,
      label: "My Assigned Work Orders",
      value: assignedWorkOrders.length || 0,
      description: "Assigned to me"
    },
    {
      icon: Clock,
      label: "My Active Work",
      value: assignedWorkOrders.filter(wo => wo.status === 'assigned' || wo.status === 'in_progress').length || 0,
      description: "In progress"
    },
    {
      icon: CheckCircle,
      label: "My Completed This Month",
      value: dashboardStats.completedThisMonth || 0,
      description: "This month"
    },
    {
      icon: TrendingUp,
      label: "My Reports Submitted",
      value: reports.length || 0,
      description: "All time"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Subcontractor Dashboard</h1>
        <p className="text-muted-foreground">Manage your assigned work orders and submit reports</p>
      </div>

      {/* Summary Cards - 2x2 Grid for Desktop */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {statsData.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <stat.icon className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm font-medium text-muted-foreground truncate">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.description}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Organization Team Context - Mobile Only */}
      {isMobile && (
        <div className="grid grid-cols-1 gap-4 mb-8">
          {!teamDataLoading && organizationActivity.length > 0 && (
            <OrganizationActivityCard activities={organizationActivity} />
          )}
          {!teamDataLoading && organizationMembers.length > 1 && (
            <OrganizationMembersCard 
              members={organizationMembers}
              currentUserId={permissions.user?.id}
            />
          )}
        </div>
      )}

      {/* Activity Feed */}
      <DashboardActivityFeed 
        activities={activities}
        isLoading={activitiesLoading}
        error={activitiesError}
        role="subcontractor"
      />
    </div>
  );
};

export default SubcontractorDashboard;
