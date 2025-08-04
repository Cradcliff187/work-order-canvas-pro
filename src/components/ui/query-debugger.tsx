import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { getQueryMetrics, getSlowQueries, clearQueryMetrics } from '@/hooks/useQueryPerformance';

export function QueryDebugger() {
  const [refreshKey, setRefreshKey] = useState(0);
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const metrics = getQueryMetrics();
  const slowQueries = getSlowQueries(1000);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      loading: 'secondary',
      success: 'default',
      error: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const handleClearMetrics = () => {
    clearQueryMetrics();
    setRefreshKey(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-[500px] overflow-auto z-50 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Query Performance</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearMetrics}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent key={refreshKey}>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All ({metrics.length})</TabsTrigger>
            <TabsTrigger value="slow">
              Slow ({slowQueries.length})
              {slowQueries.length > 0 && (
                <AlertTriangle className="h-3 w-3 ml-1 text-orange-500" />
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-2 max-h-80 overflow-auto">
            {metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No queries tracked yet
              </p>
            ) : (
              metrics.slice(-10).reverse().map((metric, index) => (
                <div key={index} className="flex items-start gap-2 p-2 border rounded text-xs">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(metric.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {JSON.stringify(metric.queryKey)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(metric.status)}
                      <span className="text-muted-foreground">
                        {formatDuration(metric.duration)}
                      </span>
                    </div>
                    {metric.error && (
                      <div className="text-red-600 text-xs mt-1 truncate">
                        {metric.error.message}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="slow" className="space-y-2 max-h-80 overflow-auto">
            {slowQueries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No slow queries detected
              </p>
            ) : (
              slowQueries.map((metric, index) => (
                <div key={index} className="flex items-start gap-2 p-2 border rounded text-xs border-orange-200">
                  <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {JSON.stringify(metric.queryKey)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(metric.status)}
                      <span className="text-orange-600 font-medium">
                        {formatDuration(metric.duration)}
                      </span>
                    </div>
                    {metric.error && (
                      <div className="text-red-600 text-xs mt-1 truncate">
                        {metric.error.message}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}