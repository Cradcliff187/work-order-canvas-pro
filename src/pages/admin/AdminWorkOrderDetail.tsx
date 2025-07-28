import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Edit, 
  MapPin, 
  Building, 
  Wrench, 
  User, 
  Calendar, 
  FileText, 
  Paperclip,
  DollarSign,
  Clock,
  Phone,
  Mail,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Eye,
  MessageCircle
} from 'lucide-react';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { useWorkOrderAssignments } from '@/hooks/useWorkOrderAssignments';
import { WorkOrderBreadcrumb } from '@/components/admin/work-orders/WorkOrderBreadcrumb';
import { StatusActionButtons } from '@/components/admin/work-orders/StatusActionButtons';
import { StatusProgressIndicator } from '@/components/admin/work-orders/StatusProgressIndicator';
import { WorkOrderAuditTrail } from '@/components/admin/work-orders/WorkOrderAuditTrail';
import { WorkOrderMessages } from '@/components/work-orders/WorkOrderMessages';
import { MessageErrorBoundary } from '@/components/work-orders/MessageErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { formatAddressMultiline, hasAddress, generateMapUrl } from '@/lib/utils/addressUtils';
import { formatFileSize } from '@/utils/imageCompression';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

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

const getReportStatusColor = (status: string) => {
  switch (status) {
    case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'reviewed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'approved': return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getFileIcon = (fileType: string, fileName: string) => {
  if (fileType === 'photo' || fileName.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)) {
    return <ImageIcon className="w-4 h-4" />;
  }
  return <FileText className="w-4 h-4" />;
};

const getFileTypeColor = (fileType: string) => {
  switch (fileType) {
    case 'photo':
      return 'bg-blue-100 text-blue-800';
    case 'document':
      return 'bg-green-100 text-green-800';
    case 'invoice':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const DetailSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default function AdminWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: workOrder, isLoading, error, refetch } = useWorkOrderDetail(id!);
  const { data: assignments = [], isLoading: isLoadingAssignments, refetch: refetchAssignments } = useWorkOrderAssignments(id);

  if (!id) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">Invalid work order ID</p>
            <Button onClick={() => navigate('/admin/work-orders')} className="mt-4">
              Back to Work Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-destructive">Error loading work order: {error.message}</p>
            <Button onClick={() => navigate('/admin/work-orders')} variant="outline">
              Back to Work Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">Work order not found</p>
            <Button onClick={() => navigate('/admin/work-orders')} variant="outline">
              Back to Work Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy • h:mm a');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <WorkOrderBreadcrumb />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/admin/work-orders')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Work Order {workOrder.work_order_number}
            </h1>
            <p className="text-muted-foreground">{workOrder.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={`${getStatusColor(workOrder.status)} h-5 text-[10px] px-1.5`}>
            {workOrder.status.replace('_', ' ')}
          </Badge>
          {/* Show Submit Report button if assigned to subcontractor and no reports exist */}
          {assignments.length > 0 && 
           workOrder.status !== 'completed' && 
           (!workOrder.work_order_reports || workOrder.work_order_reports.length === 0) && (
            <Button 
              variant="outline"
              onClick={() => navigate(`/admin/work-orders/${id}/submit-report`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Submit Report
            </Button>
          )}
          <Button onClick={() => navigate(`/admin/work-orders/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Work Order
          </Button>
        </div>
      </div>

      {/* Status Progress & Quick Actions */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Status Progress</h3>
            <StatusProgressIndicator currentStatus={workOrder.status} />
          </div>
          <Separator />
          <StatusActionButtons 
            workOrder={workOrder}
            hasAssignments={assignments.length > 0}
            onUpdate={() => {
              refetch();
              refetchAssignments();
            }}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Work Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Title</label>
              <p className="font-medium">{workOrder.title}</p>
            </div>
            {workOrder.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm">{workOrder.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Work Order #</label>
                <p className="font-mono">{workOrder.work_order_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={`${getStatusColor(workOrder.status)} h-5 text-[10px] px-1.5`}>
                    {workOrder.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization & Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Organization & Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Organization</label>
              <p className="font-medium">{workOrder.organizations?.name || 'N/A'}</p>
              {workOrder.organizations?.contact_email && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Mail className="h-3 w-3" />
                  {workOrder.organizations.contact_email}
                </div>
              )}
              {workOrder.organizations?.contact_phone && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {workOrder.organizations.contact_phone}
                </div>
              )}
            </div>
            
            <Separator />
            
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location
                </label>
                {generateMapUrl(workOrder) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(generateMapUrl(workOrder)!, '_blank')}
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    Directions
                  </Button>
                )}
              </div>
              {workOrder.store_location && (
                <p className="font-medium">{workOrder.store_location}</p>
              )}
              {workOrder.partner_location_number && (
                <p className="text-sm text-muted-foreground">Loc: {workOrder.partner_location_number}</p>
              )}
              {hasAddress(workOrder) && (
                <div className="text-sm text-muted-foreground">
                  {formatAddressMultiline(workOrder).map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              )}
              {workOrder.location_contact_name && (
                <div className="text-sm text-muted-foreground mt-1">
                  Site Contact: {workOrder.location_contact_name}
                  {workOrder.location_contact_phone && ` • ${workOrder.location_contact_phone}`}
                  {workOrder.location_contact_email && ` • ${workOrder.location_contact_email}`}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Partner References */}
        {(workOrder.partner_po_number || workOrder.partner_location_number) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Partner References
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workOrder.partner_po_number && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">PO Number</label>
                  <p className="font-medium">{workOrder.partner_po_number}</p>
                </div>
              )}
              {workOrder.partner_location_number && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location Number</label>
                  <p className="font-medium">{workOrder.partner_location_number}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Trade & Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Trade & Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Trade</label>
              <p className="font-medium">{workOrder.trades?.name || 'N/A'}</p>
              {workOrder.trades?.description && (
                <p className="text-sm text-muted-foreground">{workOrder.trades.description}</p>
              )}
            </div>
            
            <Separator />
            
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                Assigned To
              </label>
              {isLoadingAssignments ? (
                <p className="text-muted-foreground">Loading assignments...</p>
              ) : assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">
                          {(() => {
                            const isPlaceholder = assignment.notes?.includes('no active users - placeholder assignment');
                            
                            if (isPlaceholder && assignment.assigned_organization) {
                              return assignment.assigned_organization.name;
                            } else if (assignment.assignee.user_type === 'subcontractor' && assignment.assigned_organization) {
                              return assignment.assigned_organization.name;
                            } else {
                              return `${assignment.assignee.first_name} ${assignment.assignee.last_name}`;
                            }
                          })()}
                        </p>
                        <Badge variant={assignment.assignment_type === 'lead' ? 'default' : 'outline'}>
                          {assignment.assignment_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Mail className="h-3 w-3" />
                        {assignment.assignee.email}
                      </div>
                      {assignment.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">{assignment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Unassigned</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="font-medium text-muted-foreground">Created</label>
                <p>{formatDateTime(workOrder.date_submitted)}</p>
                {workOrder.created_user && (
                  <p className="text-xs text-muted-foreground">
                    by {workOrder.created_user.first_name} {workOrder.created_user.last_name}
                  </p>
                )}
              </div>
              
              <div>
                <label className="font-medium text-muted-foreground">Assigned</label>
                <p>{formatDateTime(workOrder.date_assigned)}</p>
              </div>
              
              <div>
                <label className="font-medium text-muted-foreground">Due Date</label>
                <p>{formatDate(workOrder.due_date)}</p>
              </div>
              
              <div>
                <label className="font-medium text-muted-foreground">Completed</label>
                <p>{formatDateTime(workOrder.date_completed)}</p>
              </div>
            </div>

            {(workOrder.estimated_hours || workOrder.actual_hours) && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {workOrder.estimated_hours && (
                    <div>
                      <label className="font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Estimated Hours
                      </label>
                      <p>{workOrder.estimated_hours}h</p>
                    </div>
                  )}
                  
                  {workOrder.actual_hours && (
                    <div>
                      <label className="font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Actual Hours
                      </label>
                      <p>{workOrder.actual_hours}h</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed sections */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="messages">
            <MessageCircle className="h-4 w-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* Admin Notes */}
          {workOrder.admin_completion_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Completion Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{workOrder.admin_completion_notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports">
          {/* Reports Section */}
          {workOrder.work_order_reports && workOrder.work_order_reports.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Work Order Reports ({workOrder.work_order_reports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workOrder.work_order_reports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">
                            {report.subcontractor_user.first_name} {report.subcontractor_user.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Submitted {formatDateTime(report.submitted_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={getReportStatusColor(report.status)}>
                            {report.status}
                          </Badge>
                          {report.hours_worked && (
                            <div className="flex items-center gap-1 text-sm font-medium mt-1">
                              <Clock className="h-3 w-3" />
                              {report.hours_worked}h worked
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm">{report.work_performed}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No reports submitted yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attachments">
          {/* Attachments Section */}
          {workOrder.work_order_attachments && workOrder.work_order_attachments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attachments ({workOrder.work_order_attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {workOrder.work_order_attachments.map((attachment) => (
                    <Card key={attachment.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted relative">
                        {attachment.file_type === 'photo' ? (
                          <img
                            src={supabase.storage.from('work-order-attachments').getPublicUrl(attachment.file_url).data.publicUrl}
                            alt={attachment.file_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                              <div className="text-sm font-medium text-muted-foreground">
                                {attachment.file_name.split('.').pop()?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="hidden flex items-center justify-center w-full h-full">
                          <FileText className="w-12 h-12 text-muted-foreground" />
                        </div>
                      </div>
                      
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                {getFileIcon(attachment.file_type, attachment.file_name)}
                                <span className="text-sm font-medium truncate">
                                  {attachment.file_name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge 
                                  variant="secondary" 
                                  className={cn("text-xs", getFileTypeColor(attachment.file_type))}
                                >
                                  {attachment.file_type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Size: Unknown
                                </span>
                              </div>
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <Calendar className="w-3 h-3 mr-1" />
                                {format(new Date(attachment.uploaded_at), 'MMM dd, yyyy')}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Uploaded by: {attachment.uploaded_by_user.first_name} {attachment.uploaded_by_user.last_name}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                const { data } = supabase.storage.from('work-order-attachments').getPublicUrl(attachment.file_url);
                                window.open(data.publicUrl, '_blank');
                              }}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const { data } = supabase.storage.from('work-order-attachments').getPublicUrl(attachment.file_url);
                                const link = document.createElement('a');
                                link.href = data.publicUrl;
                                link.download = attachment.file_name;
                                link.click();
                              }}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No attachments uploaded yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="messages">
          <MessageErrorBoundary>
            <WorkOrderMessages workOrderId={workOrder.id} />
          </MessageErrorBoundary>
        </TabsContent>

        <TabsContent value="audit">
          <WorkOrderAuditTrail workOrderId={workOrder.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}