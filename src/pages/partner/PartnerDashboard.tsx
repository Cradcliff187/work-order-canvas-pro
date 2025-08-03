
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Clock, CheckCircle, TrendingUp, Building2 } from 'lucide-react';
import { usePartnerWorkOrderStats } from '@/hooks/usePartnerWorkOrders';
import { usePartnerSubcontractorActivityFeed } from '@/hooks/usePartnerSubcontractorActivityFeed';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';
import { useAuth } from '@/contexts/AuthContext';
// Organization-based access control handled by RLS
import { OrganizationBadge } from '@/components/OrganizationBadge';
import { StandardDashboardStats, StatCard } from '@/components/dashboard/StandardDashboardStats';
import { DashboardActivityFeed } from '@/components/dashboard/DashboardActivityFeed';
import { MobileOrganizationSelector } from '@/components/layout/MobileOrganizationSelector';
import { useIsMobile } from '@/hooks/use-mobile';


const PartnerDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const { data: stats, isLoading: statsLoading } = usePartnerWorkOrderStats();
  const { data: userOrganizations, isLoading: orgLoading } = useUserOrganizations();
  const { activities, isLoading: activitiesLoading, error: activitiesError } = usePartnerSubcontractorActivityFeed('partner');
  
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

      {/* Organization access validated via RLS */}

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

      {/* Activity Feed */}
      <DashboardActivityFeed 
        activities={activities}
        isLoading={activitiesLoading}
        error={activitiesError}
        role="partner"
      />
    </div>
  );
};

export default PartnerDashboard;
