import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuditLogs } from '@/hooks/useAuditLogs';

interface AuditLogDisplayProps {
  timeEntryId: string;
}

export function AuditLogDisplay({ timeEntryId }: AuditLogDisplayProps) {
  const { data: auditLogs, isLoading } = useAuditLogs(timeEntryId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading audit log...</div>
        </CardContent>
      </Card>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No changes recorded yet.</div>
        </CardContent>
      </Card>
    );
  }

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'created':
        return 'default';
      case 'approval_status_changed':
        return 'secondary';
      case 'updated':
        return 'outline';
      case 'deleted':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created':
        return 'Created';
      case 'approval_status_changed':
        return 'Status Changed';
      case 'updated':
        return 'Updated';
      case 'deleted':
        return 'Deleted';
      default:
        return action;
    }
  };

  const renderValueChange = (oldValues: any, newValues: any, key: string) => {
    const oldVal = oldValues?.[key];
    const newVal = newValues?.[key];
    
    if (oldVal === newVal) return null;
    
    return (
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">{key}:</span>{' '}
        {oldVal !== undefined && (
          <span className="line-through text-red-600">{String(oldVal)}</span>
        )}
        {oldVal !== undefined && newVal !== undefined && ' → '}
        {newVal !== undefined && (
          <span className="text-green-600">{String(newVal)}</span>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="border-l-2 border-muted pl-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={getActionBadgeVariant(log.action)}>
                    {getActionLabel(log.action)}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
                
                {log.user && (
                  <div className="text-xs text-muted-foreground mb-1">
                    by {log.user.first_name} {log.user.last_name}
                  </div>
                )}

                {log.action === 'approval_status_changed' && log.old_values && log.new_values && (
                  <div className="space-y-1">
                    {renderValueChange(log.old_values, log.new_values, 'approval_status')}
                    {log.new_values.rejection_reason && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Reason:</span> {log.new_values.rejection_reason}
                      </div>
                    )}
                  </div>
                )}

                {log.action === 'updated' && log.old_values && log.new_values && (
                  <div className="space-y-1">
                    {Object.keys(log.new_values).map((key) => 
                      renderValueChange(log.old_values, log.new_values, key)
                    ).filter(Boolean)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}