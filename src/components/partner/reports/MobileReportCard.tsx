import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ReportStatusBadge } from '@/components/ui/status-badge';
import { useNavigate } from 'react-router-dom';

interface MobileReportCardProps {
  report: any;
  onTap?: () => void;
  showQuickActions?: boolean;
}

export function MobileReportCard({ 
  report, 
  onTap,
  showQuickActions = true 
}: MobileReportCardProps) {
  const navigate = useNavigate();

  const handleViewReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/partner/reports/${report.id}`);
  };

  return (
    <Card 
      className="transition-all duration-200 border-border cursor-pointer hover:shadow-md hover:border-primary/20 active:scale-[0.98]"
      onClick={onTap}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">
                {report.work_orders?.work_order_number || 'N/A'}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {report.work_orders?.title || 'No title'}
              </p>
            </div>
            <div className="flex-shrink-0">
              <ReportStatusBadge status={report.status} size="sm" showIcon />
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>{report.hours_worked ? `${report.hours_worked}h` : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(report.submitted_at), 'MMM dd')}</span>
            </div>
          </div>

          {/* Work Performed Preview */}
          {report.work_performed && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {report.work_performed}
            </p>
          )}

          {/* Actions */}
          {showQuickActions && (
            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewReport}
                className="w-full min-h-[44px]"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}