
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
import { useSubcontractorWorkOrders } from '@/hooks/useSubcontractorWorkOrders';
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
  const { assignedWorkOrders, reports, dashboardStats } = useSubcontractorWorkOrders();
  const { organizationMembers, organizationActivity, isLoading: teamDataLoading } = useOrganizationTeamData();
  const isMobile = useIsMobile();
  const permissions = useEnhancedPermissions();
  const { activities, isLoading: activitiesLoading, error: activitiesError, refetch: refetchActivities } = usePartnerSubcontractorActivityFeed('subcontractor');
  
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
      value: assignedWorkOrders.data?.length || 0,
      description: "Assigned to me"
    },
    {
      icon: Clock,
      label: "My Active Work",
      value: assignedWorkOrders.data?.filter(wo => wo.status === 'assigned' || wo.status === 'in_progress').length || 0,
      description: "In progress"
    },
    {
      icon: CheckCircle,
      label: "My Completed This Month",
      value: dashboardStats.data?.completedThisMonth || 0,
      description: "This month"
    },
    {
      icon: TrendingUp,
      label: "My Reports Submitted",
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
