import React from 'react';
import { DateRange as ReactDayPickerDateRange } from 'react-day-picker';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
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

// Chart colors
const COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  received: '#8b5cf6',
  assigned: '#f59e0b',
  inProgress: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

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

  const handleExportKPIs = () => {
    if (kpiMetrics) {
      exportAnalyticsKPIs(kpiMetrics);
      toast({
        title: 'Export Complete',
        description: 'KPI metrics have been exported to CSV.',
      });
    }
  };

  const handleExportSubcontractors = () => {
    if (chartData?.subcontractorPerformance) {
      exportSubcontractorPerformance(chartData.subcontractorPerformance);
      toast({
        title: 'Export Complete',
        description: 'Subcontractor performance data has been exported to CSV.',
      });
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into work order performance and operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeSelector
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Work Orders"
          value={kpiMetrics?.totalWorkOrders || 0}
          icon={FileText}
          change={kpiMetrics?.monthOverMonth || 0}
          trend={kpiMetrics?.monthOverMonth && kpiMetrics.monthOverMonth > 0 ? 'up' : kpiMetrics?.monthOverMonth && kpiMetrics.monthOverMonth < 0 ? 'down' : 'neutral'}
          isLoading={isLoading}
        />
        <KPICard
          title="Avg Completion Time"
          value={kpiMetrics?.avgCompletionTime ? `${Math.round(kpiMetrics.avgCompletionTime)} hrs` : 'N/A'}
          icon={Clock}
          change={kpiMetrics?.completionTimeTrend || 0}
          trend={kpiMetrics?.completionTimeTrend && kpiMetrics.completionTimeTrend > 0 ? 'up' : kpiMetrics?.completionTimeTrend && kpiMetrics.completionTimeTrend < 0 ? 'down' : 'neutral'}
          isLoading={isLoading}
        />
        <KPICard
          title="First-Time Fix Rate"
          value={kpiMetrics?.firstTimeFixRate ? `${Math.round(kpiMetrics.firstTimeFixRate)}%` : 'N/A'}
          icon={CheckCircle}
          isLoading={isLoading}
        />
        <KPICard
          title="Total Invoice Value"
          value={kpiMetrics?.totalInvoiceValue ? `$${kpiMetrics.totalInvoiceValue.toLocaleString()}` : '$0'}
          icon={DollarSign}
          isLoading={isLoading}
        />
      </div>

      {/* Additional KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Active Subcontractors"
          value={kpiMetrics?.activeSubcontractors || 0}
          icon={Users}
          isLoading={isLoading}
        />
        <KPICard
          title="Customer Satisfaction"
          value={kpiMetrics?.customerSatisfaction ? `${Math.round(kpiMetrics.customerSatisfaction)}%` : 'N/A'}
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <div className="flex items-center gap-2">
          <Button onClick={handleExportKPIs} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Export KPIs
          </Button>
          <Button onClick={handleExportSubcontractors} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Export Subcontractors
          </Button>
        </div>
      </div>

      {/* Charts */}
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
              ) : chartData?.workOrderTrends && chartData.workOrderTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData.workOrderTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="received" 
                      stroke={COLORS.received} 
                      strokeWidth={2}
                      name="Received"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="assigned" 
                      stroke={COLORS.assigned} 
                      strokeWidth={2}
                      name="Assigned"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="inProgress" 
                      stroke={COLORS.inProgress} 
                      strokeWidth={2}
                      name="In Progress"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke={COLORS.completed} 
                      strokeWidth={2}
                      name="Completed"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cancelled" 
                      stroke={COLORS.cancelled} 
                      strokeWidth={2}
                      name="Cancelled"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No data available for the selected date range
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
              ) : chartData?.tradePerformance && chartData.tradePerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData.tradePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tradeName" />
                    <YAxis yAxisId="left" orientation="left" stroke={COLORS.primary} />
                    <YAxis yAxisId="right" orientation="right" stroke={COLORS.success} />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="avgCompletionHours" 
                      fill={COLORS.primary} 
                      name="Avg Completion (hrs)"
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="completedOrders" 
                      fill={COLORS.success} 
                      name="Completed Orders"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No trade performance data available
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
              ) : chartData?.organizationAnalysis && chartData.organizationAnalysis.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData.organizationAnalysis.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="organizationName" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="totalOrders" 
                      fill={COLORS.primary} 
                      name="Total Orders"
                    />
                    <Bar 
                      dataKey="completionRate" 
                      fill={COLORS.success} 
                      name="Completion Rate %"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No organization data available
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
                <div className="h-80 bg-muted animate-pulse rounded"></div>
              ) : chartData?.subcontractorPerformance && chartData.subcontractorPerformance.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={chartData.subcontractorPerformance.slice(0, 6)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar 
                        name="On-Time Rate" 
                        dataKey="onTimeRate" 
                        stroke={COLORS.success} 
                        fill={COLORS.success} 
                        fillOpacity={0.6} 
                      />
                      <Radar 
                        name="Quality Score" 
                        dataKey="qualityScore" 
                        stroke={COLORS.primary} 
                        fill={COLORS.primary} 
                        fillOpacity={0.6} 
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                  
                  {/* Top performers table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left p-2">Subcontractor</th>
                          <th className="text-right p-2">Total Jobs</th>
                          <th className="text-right p-2">Completed</th>
                          <th className="text-right p-2">On-Time %</th>
                          <th className="text-right p-2">Avg Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chartData.subcontractorPerformance.slice(0, 5).map((sub) => (
                          <tr key={sub.id} className="border-b">
                            <td className="p-2">
                              <div>
                                <div className="font-medium">{sub.name}</div>
                                <div className="text-xs text-muted-foreground">{sub.company}</div>
                              </div>
                            </td>
                            <td className="text-right p-2">{sub.totalJobs}</td>
                            <td className="text-right p-2">{sub.completedJobs}</td>
                            <td className="text-right p-2">{Math.round(sub.onTimeRate)}%</td>
                            <td className="text-right p-2">${sub.avgInvoiceAmount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No subcontractor performance data available
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
              ) : chartData?.geographicDistribution && chartData.geographicDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData.geographicDistribution.slice(0, 15)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="city" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="workOrderCount" 
                      fill={COLORS.primary} 
                      name="Work Orders"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No geographic data available
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