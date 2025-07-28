import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorkOrderAuditLogs, AuditLogEntry } from "@/hooks/useWorkOrderAuditLogs";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Clock, User, Edit, Plus, Trash2 } from "lucide-react";

interface WorkOrderAuditTrailProps {
  workOrderId: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'INSERT':
      return <Plus className="h-4 w-4" />;
    case 'UPDATE':
      return <Edit className="h-4 w-4" />;
    case 'DELETE':
      return <Trash2 className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'INSERT':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'UPDATE':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'DELETE':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatStatusChange = (oldValues: Record<string, any> | null, newValues: Record<string, any> | null) => {
  const oldStatus = oldValues?.status;
  const newStatus = newValues?.status;
  
  if (oldStatus && newStatus && oldStatus !== newStatus) {
    return (
      <div className="text-sm">
        Status changed from{" "}
        <Badge variant="outline" className="h-5 text-[10px] px-1.5 mx-1">
          {oldStatus}
        </Badge>
        to{" "}
        <Badge variant="outline" className="h-5 text-[10px] px-1.5 mx-1">
          {newStatus}
        </Badge>
      </div>
    );
  }
  
  return null;
};

const formatFieldChanges = (oldValues: Record<string, any> | null, newValues: Record<string, any> | null) => {
  if (!oldValues || !newValues) return null;
  
  const changes: string[] = [];
  const excludeFields = ['updated_at', 'status']; // Status is handled separately
  
  Object.keys(newValues).forEach(key => {
    if (!excludeFields.includes(key) && oldValues[key] !== newValues[key]) {
      changes.push(key.replace(/_/g, ' '));
    }
  });
  
  if (changes.length === 0) return null;
  
  return (
    <div className="text-sm text-muted-foreground">
      Fields updated: {changes.join(', ')}
    </div>
  );
};

const AuditLogItem = ({ entry }: { entry: AuditLogEntry }) => {
  const userName = entry.profiles 
    ? `${entry.profiles.first_name} ${entry.profiles.last_name}` 
    : 'System';
    
  const userEmail = entry.profiles?.email;
  
  return (
    <div className="flex items-start space-x-3 p-4 border-l-2 border-muted">
      <div className="flex-shrink-0 mt-1">
        <div className={`p-2 rounded-full ${getActionColor(entry.action)}`}>
          {getActionIcon(entry.action)}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={`${getActionColor(entry.action)} h-5 text-[10px] px-1.5`}>
              {entry.action}
            </Badge>
            <div className="flex items-center text-sm text-muted-foreground">
              <User className="h-4 w-4 mr-1" />
              <span className="font-medium">{userName}</span>
              {userEmail && (
                <span className="ml-1">({userEmail})</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
          </div>
        </div>
        
        <div className="mt-2 space-y-1">
          {formatStatusChange(entry.old_values, entry.new_values)}
          {formatFieldChanges(entry.old_values, entry.new_values)}
          
          {entry.action === 'INSERT' && (
            <div className="text-sm text-muted-foreground">
              Work order created
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function WorkOrderAuditTrail({ workOrderId }: WorkOrderAuditTrailProps) {
  const { data: auditLogs, isLoading, error } = useWorkOrderAuditLogs(workOrderId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-muted-foreground">
            Failed to load audit trail
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail</CardTitle>
      </CardHeader>
      <CardContent>
        {!auditLogs || auditLogs.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No audit logs found
          </div>
        ) : (
          <div className="space-y-4">
            {auditLogs.map((entry) => (
              <AuditLogItem key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}