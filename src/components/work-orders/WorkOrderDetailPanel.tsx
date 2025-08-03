import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Building, 
  Wrench, 
  User, 
  Calendar, 
  FileText,
  Phone,
  Mail,
  Edit,
  Eye,
  ExternalLink
} from 'lucide-react';
import { WorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { format } from 'date-fns';
import { formatAddressMultiline, hasAddress, generateMapUrl } from '@/lib/utils/addressUtils';
import { cn } from '@/lib/utils';

interface WorkOrderDetailPanelProps {
  workOrder: WorkOrderDetail;
  onEdit?: () => void;
  onViewFull?: () => void;
  showActionButtons?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'received': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function WorkOrderDetailPanel({ 
  workOrder, 
  onEdit, 
  onViewFull,
  showActionButtons = true 
}: WorkOrderDetailPanelProps) {
  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy • h:mm a');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{workOrder.work_order_number}</h2>
          <Badge className={cn("text-xs", getStatusColor(workOrder.status))}>
            {workOrder.status.replace('_', ' ')}
          </Badge>
        </div>
        <h3 className="text-sm font-medium text-muted-foreground">{workOrder.title}</h3>
      </div>

      {/* Quick Actions */}
      {showActionButtons && (
        <div className="flex gap-2">
          {onViewFull && (
            <Button variant="outline" size="sm" onClick={onViewFull} className="flex-1">
              <Eye className="h-3 w-3 mr-1" />
              View Full
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      )}

      <Separator />

      {/* Work Order Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {workOrder.description && (
            <div>
              <label className="font-medium text-muted-foreground">Description</label>
              <p className="text-foreground line-clamp-3">{workOrder.description}</p>
            </div>
          )}
          <div>
            <label className="font-medium text-muted-foreground">Work Order #</label>
            <p className="font-mono text-foreground">{workOrder.work_order_number}</p>
          </div>
        </CardContent>
      </Card>

      {/* Organization & Location */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building className="h-4 w-4" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <label className="font-medium text-muted-foreground">Organization</label>
            <p className="font-medium text-foreground">{workOrder.organizations?.name || 'N/A'}</p>
            {workOrder.organizations?.contact_email && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Mail className="h-2 w-2" />
                {workOrder.organizations.contact_email}
              </div>
            )}
          </div>
          
          <Separator />
          
          <div>
            <div className="flex items-center justify-between">
              <label className="font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="h-2 w-2" />
                Location
              </label>
              {generateMapUrl(workOrder) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(generateMapUrl(workOrder)!, '_blank')}
                  className="h-6 px-2"
                >
                  <ExternalLink className="h-2 w-2" />
                </Button>
              )}
            </div>
            {workOrder.store_location && (
              <p className="font-medium text-foreground">{workOrder.store_location}</p>
            )}
            {hasAddress(workOrder) && (
              <div className="text-muted-foreground">
                {formatAddressMultiline(workOrder).map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trade */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Trade
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          <p className="font-medium text-foreground">{workOrder.trades?.name || 'N/A'}</p>
          {workOrder.trades?.description && (
            <p className="text-muted-foreground">{workOrder.trades.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Assignment */}
      {workOrder.work_order_assignments && workOrder.work_order_assignments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Assigned To
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {workOrder.work_order_assignments.map((assignment) => (
              <div key={assignment.id} className="border rounded p-2">
                <p className="font-medium text-foreground">
                  {assignment.assigned_organization?.name || 
                   (assignment.profiles ? `${assignment.profiles.first_name} ${assignment.profiles.last_name}` : 'No assignee')}
                </p>
                <Badge variant={assignment.assignment_type === 'lead' ? 'default' : 'outline'} className="text-[10px] h-4">
                  {assignment.assignment_type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div>
            <label className="font-medium text-muted-foreground">Submitted</label>
            <p className="text-foreground">{formatDateTime(workOrder.date_submitted)}</p>
            {workOrder.created_user && (
              <p className="text-muted-foreground">
                by {workOrder.created_user.first_name} {workOrder.created_user.last_name}
              </p>
            )}
          </div>
          {workOrder.date_assigned && (
            <div>
              <label className="font-medium text-muted-foreground">Assigned</label>
              <p className="text-foreground">{formatDateTime(workOrder.date_assigned)}</p>
            </div>
          )}
          {workOrder.estimated_completion_date && (
            <div>
              <label className="font-medium text-muted-foreground">Est. Completion</label>
              <p className="text-foreground">{formatDate(workOrder.estimated_completion_date)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports Summary */}
      {workOrder.work_order_reports && workOrder.work_order_reports.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports ({workOrder.work_order_reports.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {workOrder.work_order_reports.slice(0, 3).map((report) => (
              <div key={report.id} className="border rounded p-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">Report #{report.id.slice(-6)}</p>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {report.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {format(new Date(report.submitted_at), 'MMM dd, yyyy')}
                </p>
              </div>
            ))}
            {workOrder.work_order_reports.length > 3 && (
              <p className="text-muted-foreground">+{workOrder.work_order_reports.length - 3} more reports</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}