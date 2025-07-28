import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  FileText, 
  Calendar,
  DollarSign,
  Image,
  Download,
  ExternalLink
} from 'lucide-react';
import { useAdminReportDetail } from '@/hooks/useAdminReportDetail';
import { useAdminReportMutations } from '@/hooks/useAdminReportMutations';
import { ReportFileManager } from '@/components/ReportFileManager';
import { format } from 'date-fns';

export default function AdminReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reviewNotes, setReviewNotes] = useState('');
  
  // Validate ID format and prevent literal ":id" from being used
  const isValidId = id && id !== ':id' && id.length > 8;
  
  console.log('[AdminReportDetail] Route ID:', id, 'Valid:', isValidId);
  
  const { data: report, isLoading, error } = useAdminReportDetail(isValidId ? id! : '');
  const { reviewReport } = useAdminReportMutations();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary" className="h-5 text-[10px] px-1.5"><Clock className="w-3 h-3 mr-1" />Submitted</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="h-5 text-[10px] px-1.5">Reviewed</Badge>;
      case 'approved':
        return <Badge variant="default" className="h-5 text-[10px] px-1.5"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="h-5 text-[10px] px-1.5"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline" className="h-5 text-[10px] px-1.5">{status}</Badge>;
    }
  };

  const handleReview = (status: 'approved' | 'rejected') => {
    if (!id || !isValidId) return;
    reviewReport.mutate({ 
      reportId: id, 
      status, 
      reviewNotes: reviewNotes.trim() || undefined 
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isValidId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">Invalid report ID. Please select a report from the list.</p>
              <Button onClick={() => navigate('/admin/reports')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">Error loading report details</p>
              {error && (
                <p className="text-sm text-red-600">Error: {error.message}</p>
              )}
              <Button onClick={() => navigate('/admin/reports')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubmitted = report.status === 'submitted';
  const workOrder = report.work_orders;
  const subcontractor = report.subcontractor;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/reports')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Report for {workOrder?.work_order_number || 'N/A'}
            </h1>
            <p className="text-muted-foreground">
              Submitted by {subcontractor ? `${subcontractor.first_name} ${subcontractor.last_name}` : 'Unknown'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(report.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Work Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Work Order Number</label>
                  <p className="font-medium">{workOrder?.work_order_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Organization</label>
                  <p className="font-medium">{workOrder?.organizations?.name || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Title</label>
                  <p className="font-medium">{workOrder?.title || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Trade</label>
                  <p className="font-medium">{workOrder?.trades?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="font-medium">{workOrder?.store_location || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Details */}
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Work Performed</label>
                <p className="mt-1 whitespace-pre-wrap">{report.work_performed}</p>
              </div>

              {report.materials_used && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Materials Used</label>
                  <p className="mt-1 whitespace-pre-wrap">{report.materials_used}</p>
                </div>
              )}

              {report.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Additional Notes</label>
                  <p className="mt-1 whitespace-pre-wrap">{report.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Hours Worked</label>
                  <p className="font-medium">{report.hours_worked || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Manager */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Files & Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportFileManager
                reportId={report.id}
                workOrderId={report.work_order_id}
                existingAttachments={report.work_order_attachments || []}
                canUpload={true}
                canDelete={true}
              />
            </CardContent>
          </Card>

          {/* Review Section - Only show if submitted */}
          {isSubmitted && (
            <Card>
              <CardHeader>
                <CardTitle>Review Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Review Notes (Optional)</label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add any notes about your review decision..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleReview('approved')}
                    disabled={reviewReport.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReview('rejected')}
                    disabled={reviewReport.isPending}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Review Notes */}
          {report.review_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Review Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{report.review_notes}</p>
                {report.reviewed_by && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Reviewed by {report.reviewed_by.first_name} {report.reviewed_by.last_name}
                    {report.reviewed_at && ` on ${format(new Date(report.reviewed_at), 'MMM dd, yyyy')}`}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subcontractor Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Subcontractor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {subcontractor && (
                <>
                  <div>
                    <p className="font-medium">
                      {subcontractor.first_name} {subcontractor.last_name}
                    </p>
                  </div>
                  {subcontractor.email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-sm">{subcontractor.email}</p>
                    </div>
                  )}
                  {subcontractor.phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="text-sm">{subcontractor.phone}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Report Submitted</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(report.submitted_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              
              {report.reviewed_at && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Report Reviewed</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(report.reviewed_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Work Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.hours_worked && (
                <div className="flex justify-between">
                  <span className="text-sm">Hours Worked</span>
                  <span className="font-medium">{report.hours_worked}h</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm">Status</span>
                <span className="font-medium">{report.status.charAt(0).toUpperCase() + report.status.slice(1)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
