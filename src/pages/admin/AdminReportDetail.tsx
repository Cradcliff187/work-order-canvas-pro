import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ExternalLink,
  Trash,
  RotateCcw
} from 'lucide-react';
import { useAdminReportDetail } from '@/hooks/useAdminReportDetail';
import { useAdminReportMutations } from '@/hooks/useAdminReportMutations';
import { useSubcontractorAssignment } from '@/hooks/useSubcontractorAssignment';
import { useSubcontractorOrganizations } from '@/hooks/useSubcontractorOrganizations';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReportFileManager } from '@/components/ReportFileManager';
import { ReportStatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function AdminReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reviewNotes, setReviewNotes] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState({
    work_performed: '',
    materials_used: '',
    hours_worked: 0,
    notes: ''
  });

  // Check if we should start in edit mode
  useEffect(() => {
    const shouldEdit = searchParams.get('edit') === 'true';
    setIsEditMode(shouldEdit);
  }, [searchParams]);

  // Validate ID format and prevent literal ":id" from being used
  const isValidId = id && id !== ':id' && id.length > 8;
  
  console.log('[AdminReportDetail] Route ID:', id, 'Valid:', isValidId);
  
  const { data: report, isLoading, error, refetch } = useAdminReportDetail(isValidId ? id! : '');

  // Initialize edit data when report loads
  useEffect(() => {
    if (report) {
      setEditedData({
        work_performed: report.work_performed || '',
        materials_used: report.materials_used || '',
        hours_worked: report.hours_worked || 0,
        notes: report.notes || ''
      });
    }
  }, [report]);
  const { reviewReport, deleteReport, updateReport } = useAdminReportMutations();
  const { assignSubcontractor, isAssigning } = useSubcontractorAssignment();
  const { data: subcontractorOrganizations } = useSubcontractorOrganizations();


  const handleDownloadPDF = async () => {
    if (!id || !isValidId) return;
    
    setIsGeneratingPDF(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
        body: { reportId: id }
      });
      
      if (error) {
        console.error('PDF generation error:', error);
        toast({
          title: "PDF Generation Failed",
          description: "There was an error generating the PDF. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      if (data.success && data.pdfUrl) {
        // Open PDF in new tab
        window.open(data.pdfUrl, '_blank');
        toast({
          title: "PDF Generated Successfully",
          description: "The PDF has been generated and opened in a new tab.",
        });
      } else {
        throw new Error(data.message || 'PDF generation failed');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "PDF Generation Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
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

  const handleDeleteConfirm = () => {
    if (!id || !isValidId) return;
    deleteReport.mutate(id, {
      onSuccess: () => navigate('/admin/reports')
    });
    setDeleteDialogOpen(false);
  };

  const handleSaveReport = () => {
    if (!id || !isValidId || !editedData.work_performed.trim()) return;
    updateReport.mutate({
      reportId: id,
      work_performed: editedData.work_performed,
      materials_used: editedData.materials_used || undefined,
      hours_worked: editedData.hours_worked || undefined,
      notes: editedData.notes || undefined
    }, {
      onSuccess: () => {
        setIsEditMode(false);
      }
    });
  };

  const handleCancelEdit = () => {
    if (report) {
      setEditedData({
        work_performed: report.work_performed || '',
        materials_used: report.materials_used || '',
        hours_worked: report.hours_worked || 0,
        notes: report.notes || ''
      });
    }
    setIsEditMode(false);
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
              <p className="text-destructive">We couldn't load report details. Please try again.</p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={() => refetch()} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => navigate('/admin/reports')} variant="ghost">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Reports
                </Button>
              </div>
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
          >
            <Download className="w-4 h-4 mr-2" />
            {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          </Button>
          {isEditMode ? (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancelEdit}
                disabled={updateReport.isPending}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleSaveReport}
                disabled={updateReport.isPending || !editedData.work_performed.trim()}
              >
                {updateReport.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete Report
            </Button>
          )}
          <ReportStatusBadge status={report.status} size="sm" showIcon />
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
                <Label htmlFor="work_performed" className="text-sm font-medium text-muted-foreground">
                  Work Performed *
                </Label>
                {isEditMode ? (
                  <Textarea
                    id="work_performed"
                    value={editedData.work_performed}
                    onChange={(e) => setEditedData(prev => ({ ...prev, work_performed: e.target.value }))}
                    className="mt-1"
                    rows={4}
                    required
                  />
                ) : (
                  <p className="mt-1 whitespace-pre-wrap">{report.work_performed}</p>
                )}
              </div>

              <div>
                <Label htmlFor="materials_used" className="text-sm font-medium text-muted-foreground">
                  Materials Used
                </Label>
                {isEditMode ? (
                  <Textarea
                    id="materials_used"
                    value={editedData.materials_used}
                    onChange={(e) => setEditedData(prev => ({ ...prev, materials_used: e.target.value }))}
                    className="mt-1"
                    rows={3}
                  />
                ) : (
                  <p className="mt-1 whitespace-pre-wrap">{report.materials_used || 'N/A'}</p>
                )}
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">
                  Additional Notes
                </Label>
                {isEditMode ? (
                  <Textarea
                    id="notes"
                    value={editedData.notes}
                    onChange={(e) => setEditedData(prev => ({ ...prev, notes: e.target.value }))}
                    className="mt-1"
                    rows={3}
                  />
                ) : (
                  <p className="mt-1 whitespace-pre-wrap">{report.notes || 'N/A'}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hours_worked" className="text-sm font-medium text-muted-foreground">
                    Hours Worked
                  </Label>
                  {isEditMode ? (
                    <Input
                      id="hours_worked"
                      type="number"
                      value={editedData.hours_worked}
                      onChange={(e) => setEditedData(prev => ({ ...prev, hours_worked: parseFloat(e.target.value) || 0 }))}
                      className="mt-1"
                      min="0"
                      step="0.5"
                    />
                  ) : (
                    <p className="font-medium">{report.hours_worked || 'N/A'}</p>
                  )}
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
                Subcontractor Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Assignment Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Change Assignment</label>
                <Select
                  value={report.subcontractor_organization_id || "ADMIN_ONLY"}
                  onValueChange={(value) => {
                    assignSubcontractor.mutate({
                      reportId: report.id,
                      subcontractorUserId: value
                    });
                  }}
                  disabled={isAssigning}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {report.subcontractor_organization ? (
                        `🏢 ${report.subcontractor_organization.name}`
                      ) : (
                        "📝 Admin-only report"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN_ONLY">
                      📝 Admin-only report
                    </SelectItem>
                    {subcontractorOrganizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        🏢 {org.name} ({org.active_user_count} employee{org.active_user_count !== 1 ? 's' : ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isAssigning ? "Updating..." : "Change who this report is attributed to"}
                </p>
              </div>

              <Separator />

              {/* Current Assignment Display */}
              {report.subcontractor_organization ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Assignment</label>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {report.subcontractor_organization.initials}
                        </span>
                      </div>
                      <span className="font-medium">
                        {report.subcontractor_organization.name}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Admin-only report</p>
                  <p className="text-xs text-muted-foreground">No organization assigned</p>
                </div>
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

        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={workOrder?.work_order_number ? `${workOrder.work_order_number} - ${workOrder.title || 'Work Order'}` : 'Report'}
        itemType="report"
        isLoading={deleteReport.isPending}
      />
    </div>
  );
}
