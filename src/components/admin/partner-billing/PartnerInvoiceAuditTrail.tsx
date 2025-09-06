import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePartnerInvoiceAuditLogs, PartnerInvoiceAuditLog } from "@/hooks/usePartnerInvoiceAuditLogs";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Clock, User, Edit, Plus, Trash2, FileText, Mail, CreditCard } from "lucide-react";

interface PartnerInvoiceAuditTrailProps {
  invoiceId: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'created':
      return <Plus className="h-4 w-4" />;
    case 'updated':
    case 'status_changed':
      return <Edit className="h-4 w-4" />;
    case 'deleted':
      return <Trash2 className="h-4 w-4" />;
    case 'pdf_generated':
      return <FileText className="h-4 w-4" />;
    case 'email_sent':
      return <Mail className="h-4 w-4" />;
    case 'payment_received':
      return <CreditCard className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'created':
      return 'bg-success/10 text-success border-success/20';
    case 'updated':
    case 'status_changed':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'deleted':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'pdf_generated':
      return 'bg-accent/10 text-accent-foreground border-accent/20';
    case 'email_sent':
      return 'bg-info/10 text-info border-info/20';
    case 'payment_received':
      return 'bg-success/10 text-success border-success/20';
    default:
      return 'bg-muted text-muted-foreground border-muted';
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case 'created': return 'Created';
    case 'updated': return 'Updated';
    case 'status_changed': return 'Status Changed';
    case 'deleted': return 'Deleted';
    case 'pdf_generated': return 'PDF Generated';
    case 'email_sent': return 'Email Sent';
    case 'payment_received': return 'Payment Received';
    default: return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
      const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      changes.push(displayName);
    }
  });
  
  if (changes.length === 0) return null;
  
  return (
    <div className="text-sm text-muted-foreground">
      Fields updated: {changes.join(', ')}
    </div>
  );
};

const AuditLogItem = ({ entry }: { entry: PartnerInvoiceAuditLog }) => {
  const userName = entry.profiles 
    ? `${entry.profiles.first_name} ${entry.profiles.last_name}` 
    : 'System';
    
  const userEmail = entry.profiles?.email;
  
  return (
    <div className="flex items-start space-x-3 p-4 border-l-2 border-muted">
      <div className="flex-shrink-0 mt-1">
        <div className={`p-2 rounded-full ${getActionColor(entry.action_type)}`}>
          {getActionIcon(entry.action_type)}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={`${getActionColor(entry.action_type)} h-5 text-[10px] px-1.5`}>
              {getActionLabel(entry.action_type)}
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
          
          {entry.action_type === 'created' && (
            <div className="text-sm text-muted-foreground">
              Partner invoice created
            </div>
          )}
          
          {entry.action_type === 'pdf_generated' && (
            <div className="text-sm text-muted-foreground">
              PDF document generated and saved
            </div>
          )}
          
          {entry.action_type === 'email_sent' && (
            <div className="text-sm text-muted-foreground">
              Invoice email sent to partner organization
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function PartnerInvoiceAuditTrail({ invoiceId }: PartnerInvoiceAuditTrailProps) {
  const { data: auditLogs, isLoading, error } = usePartnerInvoiceAuditLogs(invoiceId);

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