import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, RotateCcw, Trash2, Mail, Clock, Filter, TrendingDown, Info, RefreshCw } from 'lucide-react';
import { TableActionsDropdown, type TableAction } from '@/components/ui/table-actions-dropdown';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface FailedEmail {
  id: string;
  template_name: string;
  record_id: string;
  record_type: string;
  status: string;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  context_data: any;
}

export function EmailFailedManager() {
  const queryClient = useQueryClient();
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emailToDelete, setEmailToDelete] = useState<FailedEmail | null>(null);
  const [templateFilter, setTemplateFilter] = useState<string>('all');

  // Query for failed emails
  const {
    data: failedEmails,
    isLoading,
    error
  } = useQuery({
    queryKey: ['failed_emails'],
    queryFn: async (): Promise<FailedEmail[]> => {
      const { data, error } = await supabase
        .from('email_queue')
        .select('*')
        .gte('retry_count', 3)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: async (emailIds: string[]) => {
      const { error } = await supabase
        .from('email_queue')
        .update({ 
          retry_count: 0, 
          status: 'pending',
          error_message: null,
          next_retry_at: null
        })
        .in('id', emailIds);

      if (error) throw error;
    },
    onSuccess: (_, emailIds) => {
      queryClient.invalidateQueries({ queryKey: ['failed_emails'] });
      queryClient.invalidateQueries({ queryKey: ['email_queue_stats'] });
      setSelectedEmails([]);
      toast({
        title: "Emails Retried",
        description: `Successfully reset ${emailIds.length} email(s) for retry.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Retry Failed",
        description: error.message || "Failed to retry emails",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (emailIds: string[]) => {
      const { error } = await supabase
        .from('email_queue')
        .delete()
        .in('id', emailIds);

      if (error) throw error;
    },
    onSuccess: (_, emailIds) => {
      queryClient.invalidateQueries({ queryKey: ['failed_emails'] });
      queryClient.invalidateQueries({ queryKey: ['email_queue_stats'] });
      setSelectedEmails([]);
      setEmailToDelete(null);
      toast({
        title: "Emails Deleted",
        description: `Successfully deleted ${emailIds.length} email(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete emails",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(filteredEmails?.map(email => email.id) || []);
    } else {
      setSelectedEmails([]);
    }
  };

  const handleSelectEmail = (emailId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmails(prev => [...prev, emailId]);
    } else {
      setSelectedEmails(prev => prev.filter(id => id !== emailId));
    }
  };

  const handleRetrySelected = () => {
    if (selectedEmails.length > 0) {
      retryMutation.mutate(selectedEmails);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedEmails.length > 0) {
      deleteMutation.mutate(selectedEmails);
    }
  };

  const handleRetryAll = () => {
    if (failedEmails && failedEmails.length > 0) {
      retryMutation.mutate(failedEmails.map(email => email.id));
    }
  };

  const getRecipientEmail = (contextData: any): string => {
    return contextData?.recipient_email || contextData?.email || 'Unknown';
  };

  const truncateText = (text: string | null, maxLength: number = 50): string => {
    if (!text) return 'No error message';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Analyze failed emails for insights
  const emailInsights = useMemo(() => {
    if (!failedEmails) return null;

    // Group by template
    const templateGroups = failedEmails.reduce((acc, email) => {
      acc[email.template_name] = (acc[email.template_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analyze error patterns
    const errorPatterns = failedEmails.reduce((acc, email) => {
      if (email.error_message) {
        const simpleError = email.error_message.split(':')[0].trim();
        acc[simpleError] = (acc[simpleError] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Find domain patterns
    const domainPatterns = failedEmails.reduce((acc, email) => {
      const recipient = getRecipientEmail(email.context_data);
      const domain = recipient.includes('@') ? recipient.split('@')[1] : 'unknown';
      if (domain !== 'unknown') {
        acc[domain] = (acc[domain] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const mostCommonError = Object.entries(errorPatterns).sort(([,a], [,b]) => b - a)[0];
    const mostCommonDomain = Object.entries(domainPatterns).sort(([,a], [,b]) => b - a)[0];

    return {
      templateGroups,
      errorPatterns,
      domainPatterns,
      mostCommonError,
      mostCommonDomain,
      totalTemplates: Object.keys(templateGroups).length
    };
  }, [failedEmails]);

  // Filter emails by template
  const filteredEmails = useMemo(() => {
    if (!failedEmails) return [];
    if (templateFilter === 'all') return failedEmails;
    return failedEmails.filter(email => email.template_name === templateFilter);
  }, [failedEmails, templateFilter]);

  const getRowActions = (email: FailedEmail): TableAction[] => [
    {
      label: 'Retry',
      icon: RotateCcw,
      onClick: () => retryMutation.mutate([email.id]),
      show: true,
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: () => setEmailToDelete(email),
      variant: 'destructive',
      show: true,
    },
  ];

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Failed Email Management
          </CardTitle>
          <CardDescription>
            Failed to load failed emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Error loading failed emails: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Failed Email Management
                {failedEmails && failedEmails.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {failedEmails.length} failed
                  </Badge>
                )}
              </CardTitle>
            </div>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['failed_emails'] })} 
              variant="outline" 
              size="sm" 
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <CardDescription>
            Manage emails that have failed permanently (retry count ≥ 3)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : !failedEmails || failedEmails.length === 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <EmptyTableState
                  title="No failed emails"
                  description="All emails are processing successfully"
                  colSpan={6}
                  icon={Mail}
                />
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-4">
              {/* Pattern Detection Insights */}
              {emailInsights && (
                <Card className="bg-muted/20">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 font-medium">
                          <TrendingDown className="h-3 w-3 text-destructive" />
                          Most Common Error
                        </div>
                        <div className="text-muted-foreground">
                          {emailInsights.mostCommonError ? (
                            <>
                              <div className="font-medium">{emailInsights.mostCommonError[0]}</div>
                              <div className="text-xs">({emailInsights.mostCommonError[1]} emails)</div>
                            </>
                          ) : (
                            'No patterns detected'
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 font-medium">
                          <Mail className="h-3 w-3 text-destructive" />
                          Domain Pattern
                        </div>
                        <div className="text-muted-foreground">
                          {emailInsights.mostCommonDomain ? (
                            <>
                              <div className="font-medium">@{emailInsights.mostCommonDomain[0]}</div>
                              <div className="text-xs">({emailInsights.mostCommonDomain[1]} emails)</div>
                            </>
                          ) : (
                            'No patterns detected'
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 font-medium">
                          <Filter className="h-3 w-3 text-destructive" />
                          Template Distribution
                        </div>
                        <div className="text-muted-foreground">
                          <div className="font-medium">{emailInsights.totalTemplates} templates</div>
                          <div className="text-xs">affected by failures</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Filters and Bulk Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedEmails.length === filteredEmails.length && filteredEmails.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all emails"
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedEmails.length} of {filteredEmails.length} selected
                    </span>
                  </div>
                  
                  {/* Template Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={templateFilter} onValueChange={setTemplateFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Templates</SelectItem>
                        {emailInsights && Object.entries(emailInsights.templateGroups).map(([template, count]) => (
                          <SelectItem key={template} value={template}>
                            {template} ({count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedEmails.length > 0 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRetrySelected}
                        disabled={retryMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry Selected
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDeleteSelected}
                        disabled={deleteMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete Selected
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetryAll}
                    disabled={retryMutation.isPending || !failedEmails || failedEmails.length === 0}
                    className="flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry All
                  </Button>
                </div>
              </div>

              {/* Failed Emails Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEmails.length === filteredEmails.length && filteredEmails.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all emails"
                      />
                    </TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Error Message</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEmails.includes(email.id)}
                          onCheckedChange={(checked) => 
                            handleSelectEmail(email.id, checked as boolean)
                          }
                          aria-label={`Select email ${email.template_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{email.template_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {email.record_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {getRecipientEmail(email.context_data)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm" title={email.error_message || 'No error message'}>
                          {truncateText(email.error_message)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                          <span className="text-sm font-medium">{email.retry_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TableActionsDropdown
                          actions={getRowActions(email)}
                          itemName={email.template_name}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!emailToDelete}
        onOpenChange={(open) => !open && setEmailToDelete(null)}
        onConfirm={() => emailToDelete && deleteMutation.mutate([emailToDelete.id])}
        itemName={emailToDelete?.template_name || ''}
        itemType="failed email"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}