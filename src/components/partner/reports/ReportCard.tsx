
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  Building,
  Calendar,
  Timer
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ReportStatusBadge } from '@/components/ui/status-badge';

interface ReportCardProps {
  report: any;
}

export function ReportCard({ report }: ReportCardProps) {
  const navigate = useNavigate();


  const workOrder = report.work_orders;
  const subcontractor = report.subcontractor;

  return (
    <Card className="h-full card-hover">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">
              {workOrder?.work_order_number || 'N/A'}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {workOrder?.title || 'No title'}
            </p>
          </div>
          <ReportStatusBadge status={report.status} showIcon />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Subcontractor Info */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="font-medium text-sm">
              {subcontractor ? `${subcontractor.first_name} ${subcontractor.last_name}` : 'N/A'}
            </div>
            {(subcontractor as any)?.organization_members?.[0]?.organization?.name && (
              <div className="text-xs text-muted-foreground">
                {(subcontractor as any).organization_members[0].organization.name}
              </div>
            )}
          </div>
        </div>

        {/* Hours Worked */}
        {report.hours_worked && (
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{report.hours_worked}h worked</span>
          </div>
        )}

        {/* Location */}
        {workOrder?.store_location && (
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{workOrder.store_location}</span>
          </div>
        )}

        {/* Dates */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="text-muted-foreground">Submitted: </span>
              {format(new Date(report.submitted_at), 'MMM dd, yyyy')}
            </div>
          </div>
          
          {report.reviewed_at && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="text-muted-foreground">Reviewed: </span>
                {format(new Date(report.reviewed_at), 'MMM dd, yyyy')}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/partner/reports/${report.id}`)}
          className="w-full"
        >
          <Eye className="w-4 h-4 mr-2" />
          View Report
        </Button>
      </CardContent>
    </Card>
  );
}
