import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Database, TrendingUp, RefreshCw } from 'lucide-react';
import { useDatabasePerformance } from '@/hooks/useDatabasePerformance';

export const DatabasePerformanceTab: React.FC = () => {
  const { data, isLoading, error, refetch } = useDatabasePerformance();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Database Performance
            </CardTitle>
            <CardDescription>
              Monitor database performance metrics and table sizes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading performance metrics...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Database Performance
            </CardTitle>
            <CardDescription>
              Monitor database performance metrics and table sizes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-destructive">Failed to load performance metrics</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTableName = (tableName: string) => {
    return tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getGrowthVariant = (color: string) => {
    switch (color) {
      case 'green': return 'secondary';
      case 'yellow': return 'default';
      case 'red': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Database Performance</h3>
          <p className="text-muted-foreground">Monitor table sizes and growth metrics</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Records Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalRecords.toLocaleString()}</div>
            <div className="space-y-2 mt-4">
              {data?.tableCounts.slice(0, 4).map((table) => (
                <div key={table.table_name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{formatTableName(table.table_name)}</span>
                  <span className="font-medium">{table.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Growth Metrics Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              7-Day Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.growthMetrics.slice(0, 4).map((metric) => (
                <div key={metric.table_name} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{formatTableName(metric.table_name)}</span>
                    <Badge variant={getGrowthVariant(metric.growth_color)}>
                      {metric.growth_rate.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress 
                    value={Math.min(metric.growth_rate, 100)} 
                    className={`h-2 ${
                      metric.growth_color === 'green' ? '[&>div]:bg-green-500' :
                      metric.growth_color === 'yellow' ? '[&>div]:bg-yellow-500' :
                      '[&>div]:bg-red-500'
                    }`}
                  />
                  <div className="text-xs text-muted-foreground">
                    +{metric.recent_count} of {metric.total_count} total
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table Size Overview Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              Largest Tables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.largestTables.map((table, index) => {
                const percentage = data.totalRecords > 0 ? (table.count / data.totalRecords) * 100 : 0;
                return (
                  <div key={table.table_name} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        #{index + 1} {formatTableName(table.table_name)}
                      </span>
                      <span className="font-medium">{table.count.toLocaleString()}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}% of total data
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Table Details</CardTitle>
          <CardDescription>
            Complete breakdown of all database tables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Table Name</th>
                  <th className="text-left py-2 px-4">Total Records</th>
                  <th className="text-left py-2 px-4">7-Day Growth</th>
                  <th className="text-left py-2 px-4">New Records</th>
                  <th className="text-left py-2 px-4">Percentage of Total</th>
                </tr>
              </thead>
              <tbody>
                {data?.tableCounts.map((table) => {
                  const growth = data.growthMetrics.find(g => g.table_name === table.table_name);
                  const percentage = data.totalRecords > 0 ? (table.count / data.totalRecords) * 100 : 0;
                  
                  return (
                    <tr key={table.table_name} className="border-b">
                      <td className="py-2 px-4 font-medium">{formatTableName(table.table_name)}</td>
                      <td className="py-2 px-4">{table.count.toLocaleString()}</td>
                      <td className="py-2 px-4">
                        <Badge variant={getGrowthVariant(growth?.growth_color || 'green')}>
                          {growth?.growth_rate.toFixed(1) || '0.0'}%
                        </Badge>
                      </td>
                      <td className="py-2 px-4">{growth?.recent_count || 0}</td>
                      <td className="py-2 px-4">{percentage.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};