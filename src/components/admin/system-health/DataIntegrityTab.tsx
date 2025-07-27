import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { useDataIntegrity } from '@/hooks/useDataIntegrity';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  RefreshCw, 
  Eye, 
  Wrench, 
  AlertTriangle,
  CheckCircle,
  Download 
} from 'lucide-react';

export const DataIntegrityTab: React.FC = () => {
  const { result, isLoading, error, refetch } = useDataIntegrity();
  const { toast } = useToast();

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const handleViewDetails = (issue: any) => {
    if (!issue.details || issue.details.length === 0) {
      toast({
        title: "No Details Available",
        description: "No detailed records found for this issue.",
      });
      return;
    }

    // Create a simple alert showing the details
    const detailsText = issue.details.map((detail: any, index: number) => {
      if (issue.type === 'orphaned_work_orders') {
        return `${index + 1}. Work Order: ${detail.work_order_number || detail.id} (Org ID: ${detail.organization_id})`;
      } else if (issue.type === 'orphaned_reports') {
        return `${index + 1}. Report ID: ${detail.id} (Work Order ID: ${detail.work_order_id})`;
      } else if (issue.type === 'missing_reports') {
        return `${index + 1}. Work Order: ${detail.work_order_number || detail.id} (Status: ${detail.status})`;
      } else if (issue.type === 'missing_profiles') {
        return `${index + 1}. User ID: ${detail.user_id} (Email: ${detail.email})`;
      }
      return `${index + 1}. ${JSON.stringify(detail)}`;
    }).join('\n');

    alert(`${issue.label} Details:\n\n${detailsText}`);
  };

  const handleFixIssue = (issueType: string) => {
    toast({
      title: 'Fix Issue',
      description: `Auto-fix for ${issueType} coming soon`,
    });
  };

  const exportResults = () => {
    if (!result?.issues) return;

    const csvContent = [
      ['Issue Type', 'Count', 'Severity', 'Description'].join(','),
      ...result.issues.map(issue => [
        issue.label,
        issue.count.toString(),
        issue.severity,
        issue.description
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-integrity-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Integrity
            </CardTitle>
            <CardDescription>
              Monitor data consistency and integrity across the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
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
              <Database className="h-5 w-5" />
              Data Integrity
            </CardTitle>
            <CardDescription>
              Monitor data consistency and integrity across the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">Error Loading Data</h3>
              <p className="text-muted-foreground mb-4">
                Failed to load data integrity checks
              </p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const issues = result?.issues || [];
  const totalIssues = result?.totalIssues || 0;
  const healthScore = result?.healthScore || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Integrity
          </CardTitle>
          <CardDescription>
            Monitor data consistency and integrity across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getHealthScoreColor(healthScore)}`}>
                  {healthScore}%
                </div>
                <div className="text-sm text-muted-foreground">Health Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {totalIssues}
                </div>
                <div className="text-sm text-muted-foreground">Total Issues</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                onClick={exportResults}
                size="sm"
                disabled={issues.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {issues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-success mb-4" />
              <h3 className="text-lg font-medium mb-2">Data Integrity Healthy</h3>
              <p className="text-muted-foreground">
                No data integrity issues detected in the system
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue Type</TableHead>
                    <TableHead className="w-20">Count</TableHead>
                    <TableHead className="w-24">Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.length === 0 ? (
                    <EmptyTableState 
                      title="No issues found"
                      description="Data integrity checks passed successfully"
                      colSpan={5}
                    />
                  ) : (
                    issues.map((issue) => (
                      <TableRow key={issue.type}>
                        <TableCell className="font-medium">
                          {issue.label}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {issue.count}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityVariant(issue.severity)}>
                            {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {issue.description}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(issue)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFixIssue(issue.type)}
                            >
                              <Wrench className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};