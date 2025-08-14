import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Building, 
  Wrench, 
  Calendar, 
  FileText,
  Edit,
  Eye,
  ExternalLink,
  Clock,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { formatAddressMultiline, hasAddress, generateMapUrl } from '@/lib/utils/addressUtils';
import { WorkOrderStatusBadge } from '@/components/ui/status-badge';

interface ReportDetailPanelProps {
  report: any;
  onViewFull?: () => void;
  showActionButtons?: boolean;
}

export function ReportDetailPanel({ 
  report, 
  onViewFull,
  showActionButtons = true 
}: ReportDetailPanelProps) {
  const workOrder = report?.work_orders;
  
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
          <h2 className="text-lg font-semibold">{workOrder?.work_order_number}</h2>
          <Badge 
            variant={report.status === 'approved' ? 'default' : 
                    report.status === 'rejected' ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            {report.status}
          </Badge>
        </div>
        <h3 className="text-sm font-medium text-muted-foreground">{workOrder?.title}</h3>
      </div>

      {/* Quick Actions */}
      {showActionButtons && (
        <div className="flex gap-2">
          {onViewFull && (
            <Button variant="outline" size="sm" onClick={onViewFull} className="flex-1">
              <Eye className="h-3 w-3 mr-1" />
              View Full Report
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
            Work Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <label className="font-medium text-muted-foreground">Work Order #</label>
            <p className="font-mono text-foreground">{workOrder?.work_order_number}</p>
          </div>
          <div>
            <label className="font-medium text-muted-foreground">Status</label>
            <div className="mt-1">
              <WorkOrderStatusBadge status={workOrder?.status} size="sm" />
            </div>
          </div>
          {workOrder?.description && (
            <div>
              <label className="font-medium text-muted-foreground">Description</label>
              <p className="text-foreground line-clamp-3">{workOrder.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization & Location */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building className="h-4 w-4" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <label className="font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="h-2 w-2" />
                Store Location
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
            {workOrder?.store_location && (
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
          <p className="font-medium text-foreground">{workOrder?.trades?.name || 'N/A'}</p>
          {workOrder?.trades?.description && (
            <p className="text-muted-foreground">{workOrder.trades.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Report Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Report Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {report.work_performed && (
            <div>
              <label className="font-medium text-muted-foreground">Work Performed</label>
              <p className="text-foreground line-clamp-3">{report.work_performed}</p>
            </div>
          )}
          
          {report.hours_worked && (
            <div>
              <label className="font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-2 w-2" />
                Hours
              </label>
              <p className="font-medium text-foreground">{report.hours_worked}h</p>
            </div>
          )}

          {report.materials_used && (
            <div>
              <label className="font-medium text-muted-foreground">Materials</label>
              <p className="text-foreground line-clamp-2">{report.materials_used}</p>
            </div>
          )}
        </CardContent>
      </Card>

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
            <p className="text-foreground">{formatDateTime(report.submitted_at)}</p>
          </div>
          
          {report.reviewed_at && (
            <div>
              <label className="font-medium text-muted-foreground">Reviewed</label>
              <p className="text-foreground">{formatDateTime(report.reviewed_at)}</p>
              {report.reviewed_by && (
                <p className="text-muted-foreground">
                  by {report.reviewed_by.first_name} {report.reviewed_by.last_name}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attachments */}
      {report.work_order_attachments && report.work_order_attachments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Attachments ({report.work_order_attachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {report.work_order_attachments.slice(0, 3).map((attachment: any) => (
              <div key={attachment.id} className="border rounded p-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground truncate">{attachment.file_name}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(attachment.file_url, '_blank')}
                    className="h-6 px-2"
                  >
                    <ExternalLink className="h-2 w-2" />
                  </Button>
                </div>
              </div>
            ))}
            {report.work_order_attachments.length > 3 && (
              <p className="text-muted-foreground">+{report.work_order_attachments.length - 3} more attachments</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}