import React from 'react';
import { DateRange as ReactDayPickerDateRange } from 'react-day-picker';
import {
  BarChart3,
  Clock,
  DollarSign,
  FileText,
  Users,
  CheckCircle,
  TrendingUp,
  Download,
  RefreshCw,
} from 'lucide-react';

import { useAnalytics, useRefreshAnalytics } from '@/hooks/useAnalytics';
import { KPICard } from '@/components/analytics/KPICard';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { exportAnalyticsKPIs, exportSubcontractorPerformance } from '@/lib/utils/export';

const AdminAnalytics: React.FC = () => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState<ReactDayPickerDateRange | undefined>();
  
  const { kpiMetrics, chartData, isLoading } = useAnalytics(
    (dateRange?.from && dateRange?.to) ? { 
      from: dateRange.from, 
      to: dateRange.to 
    } : { 
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      to: new Date() 
    }
  );

  const { refetch: refreshAnalytics, isFetching: isRefreshing } = useRefreshAnalytics();

  const handleRefresh = async () => {
    try {
      await refreshAnalytics();
      toast({
        title: 'Analytics Refreshed',
        description: 'Analytics data has been updated with the latest information.',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh analytics data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    try {
      if (!kpiMetrics) {
        toast({
          title: 'No data to export',
          description: 'Analytics data is not available yet.',
          variant: 'destructive',
        });
        return;
      }

      exportAnalyticsKPIs(kpiMetrics);
      toast({
        title: 'Export Completed',
        description: 'Your analytics KPI report has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export analytics data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into work order performance and operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        className="justify-start"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Work Orders"
          value={kpiMetrics?.totalWorkOrders || 0}
          change={kpiMetrics?.monthOverMonth}
          icon={FileText}
          format="number"
          isLoading={isLoading}
        />
        <KPICard
          title="Avg Completion Time"
          value={kpiMetrics?.avgCompletionTime || 0}
          change={kpiMetrics?.completionTimeTrend}
          icon={Clock}
          format="hours"
          trend={kpiMetrics?.completionTimeTrend ? (kpiMetrics.completionTimeTrend < 0 ? 'up' : 'down') : 'neutral'}
          isLoading={isLoading}
        />
        <KPICard
          title="First-Time Fix Rate"
          value={kpiMetrics?.firstTimeFixRate || 0}
          icon={CheckCircle}
          format="percentage"
          isLoading={isLoading}
        />
        <KPICard
          title="Total Invoice Value"
          value={kpiMetrics?.totalInvoiceValue || 0}
          icon={DollarSign}
          format="currency"
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KPICard
          title="Active Subcontractors"
          value={kpiMetrics?.activeSubcontractors || 0}
          icon={Users}
          format="number"
          isLoading={isLoading}
        />
        <KPICard
          title="Customer Satisfaction"
          value={kpiMetrics?.customerSatisfaction || 0}
          icon={TrendingUp}
          format="percentage"
          isLoading={isLoading}
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Work Order Trends</TabsTrigger>
          <TabsTrigger value="trades">Trade Performance</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="subcontractors">Subcontractors</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Work Order Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-80 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Work Order Trends Chart
                  <br />
                  <small>Chart implementation coming soon</small>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Trade</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-80 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Trade Performance Chart
                  <br />
                  <small>Chart implementation coming soon</small>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-80 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Organization Analysis Chart
                  <br />
                  <small>Chart implementation coming soon</small>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subcontractors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subcontractor Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {chartData?.subcontractorPerformance?.length ? (
                    <div className="space-y-2">
                      {chartData.subcontractorPerformance.slice(0, 10).map((sub, i) => (
                        <div key={sub.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <div>
                            <div className="font-medium">{sub.name}</div>
                            <div className="text-sm text-muted-foreground">{sub.company}</div>
                          </div>
                          <div className="flex space-x-4 text-sm">
                            <div className="text-center">
                              <div className="font-medium">{sub.totalJobs}</div>
                              <div className="text-muted-foreground">Jobs</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{sub.onTimeRate.toFixed(1)}%</div>
                              <div className="text-muted-foreground">On-time</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{sub.reportApprovalRate.toFixed(1)}%</div>
                              <div className="text-muted-foreground">Approval Rate</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-end mt-4">
                        <Button variant="outline" size="sm" onClick={() => {
                          try {
                            if (!chartData?.subcontractorPerformance || chartData.subcontractorPerformance.length === 0) {
                              toast({
                                title: 'No data to export',
                                description: 'Subcontractor performance data is not available.',
                                variant: 'destructive',
                              });
                              return;
                            }
                            exportSubcontractorPerformance(chartData.subcontractorPerformance);
                            toast({
                              title: 'Export Completed',
                              description: 'Subcontractor performance data has been downloaded.',
                            });
                          } catch (error) {
                            toast({
                              title: 'Export Failed',
                              description: 'Failed to export subcontractor data.',
                              variant: 'destructive',
                            });
                          }
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Export Performance Data
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-muted-foreground">
                      No subcontractor data available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-80 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Geographic Heat Map
                  <br />
                  <small>Map implementation coming soon</small>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalytics;