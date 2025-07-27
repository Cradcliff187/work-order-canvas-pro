import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useActiveIssues } from '@/hooks/useActiveIssues';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Wrench,
  Eye,
  Clock,
  Database,
  Mail,
  MessageSquare,
  Users,
  TrendingUp
} from 'lucide-react';

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'destructive';
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'secondary';
  }
};

const getSourceIcon = (source: string) => {
  switch (source.toLowerCase()) {
    case 'data integrity':
      return Database;
    case 'email system':
      return Mail;
    case 'messaging system':
      return MessageSquare;
    case 'organization health':
      return Users;
    case 'database performance':
      return TrendingUp;
    default:
      return AlertTriangle;
  }
};

const formatTimestamp = (timestamp: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp);
};

export const ActiveIssuesTab: React.FC = () => {
  const { issues, isLoading, error, autoFixableIssues, fixAllAutoFixableIssues, refetch } = useActiveIssues();
  const { toast } = useToast();
  const [isFixingAll, setIsFixingAll] = useState(false);

  const handleFixAll = async () => {
    setIsFixingAll(true);
    try {
      await fixAllAutoFixableIssues();
      toast({
        title: "Issues Fixed",
        description: `${autoFixableIssues.length} auto-fixable issues have been resolved`,
      });
      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fix Failed",
        description: "Failed to fix some issues. Please try again.",
      });
    } finally {
      setIsFixingAll(false);
    }
  };

  const handleFixSingle = async (issue: any) => {
    if (!issue.fixFunction) return;
    
    try {
      await issue.fixFunction();
      toast({
        title: "Issue Fixed",
        description: `${issue.title} has been resolved`,
      });
      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fix Failed",
        description: `Failed to fix: ${issue.title}`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Issues
            </CardTitle>
            <CardDescription>
              Track and manage active system issues and alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
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
              <AlertTriangle className="h-5 w-5" />
              Active Issues
            </CardTitle>
            <CardDescription>
              Track and manage active system issues and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-destructive mb-4">Failed to load system issues</p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Issues
                {issues.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {issues.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Track and manage active system issues and alerts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {autoFixableIssues.length > 0 && (
                <Button 
                  onClick={handleFixAll} 
                  variant="default" 
                  size="sm"
                  disabled={isFixingAll}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  {isFixingAll ? 'Fixing...' : `Fix All (${autoFixableIssues.length})`}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-green-600 mb-2">All Systems Healthy</h3>
              <p className="text-muted-foreground">
                No active issues detected across all system components
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => {
                  const SourceIcon = getSourceIcon(issue.source);
                  return (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{issue.title}</p>
                          <p className="text-sm text-muted-foreground">{issue.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <SourceIcon className="h-4 w-4" />
                          <span className="text-sm">{issue.source}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(issue.severity) as any}>
                          {issue.severity.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {issue.count && (
                          <Badge variant="outline">
                            {issue.count}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(issue.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {issue.isAutoFixable && issue.fixFunction && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFixSingle(issue)}
                            >
                              <Wrench className="h-3 w-3 mr-1" />
                              Fix
                            </Button>
                          )}
                          {issue.viewDetailsFunction && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={issue.viewDetailsFunction}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};