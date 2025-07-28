
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, MapPin, Calendar, Clock, User, Building2, Wrench, FileText, Phone, Mail, Loader2 } from 'lucide-react';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { WorkOrderBreadcrumb } from '@/components/admin/work-orders/WorkOrderBreadcrumb';
import { formatDate } from '@/lib/utils/date';

export default function AdminWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: workOrder, isLoading, error } = useWorkOrderDetail(id!);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <WorkOrderBreadcrumb 
          workOrderId={id}
          currentPage="Details"
        />
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading work order...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="p-6 space-y-6">
        <WorkOrderBreadcrumb 
          workOrderId={id}
          currentPage="Details"
        />
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">
                {error?.message || 'Work order not found'}
              </p>
              <Button 
                onClick={() => navigate('/admin/work-orders')} 
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Work Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received':
        return 'Received';
      case 'assigned':
        return 'Assigned';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <WorkOrderBreadcrumb 
        workOrderId={id}
        currentPage="Details"
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/admin/work-orders')} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Orders
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{workOrder.title}</h1>
            <p className="text-muted-foreground">
              {workOrder.work_order_number || `Work Order ${workOrder.id?.slice(0, 8)}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <Badge className={`${getStatusColor(workOrder.status)} h-5 text-[10px] px-1.5`}>
            {getStatusText(workOrder.status)}
          </Badge>
          <Button asChild size="sm">
            <Link to={`/admin/work-orders/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{workOrder.organizations?.name || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">
                    {workOrder.organizations?.contact_email || 'N/A'}
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Trade</h4>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{workOrder.trades?.name || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{workOrder.store_location || 'N/A'}</p>
                  {workOrder.street_address && (
                    <p className="text-sm text-muted-foreground">
                      {workOrder.street_address}
                      {workOrder.city && `, ${workOrder.city}`}
                      {workOrder.state && `, ${workOrder.state}`}
                      {workOrder.zip_code && ` ${workOrder.zip_code}`}
                    </p>
                  )}
                </div>
                
                {workOrder.partner_location_number && (
                  <div>
                    <p className="text-sm font-medium">Location Number</p>
                    <p className="text-sm text-muted-foreground">{workOrder.partner_location_number}</p>
                  </div>
                )}
                
                {workOrder.partner_po_number && (
                  <div>
                    <p className="text-sm font-medium">PO Number</p>
                    <p className="text-sm text-muted-foreground">{workOrder.partner_po_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Date Submitted</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(workOrder.date_submitted)}
                  </p>
                </div>
                
                {workOrder.date_assigned && (
                  <div>
                    <p className="text-sm font-medium">Date Assigned</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(workOrder.date_assigned)}
                    </p>
                  </div>
                )}
                
                {workOrder.due_date && (
                  <div>
                    <p className="text-sm font-medium">Due Date</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(workOrder.due_date)}
                    </p>
                  </div>
                )}
                
                {workOrder.actual_completion_date && (
                  <div>
                    <p className="text-sm font-medium">Completed</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(workOrder.actual_completion_date)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assignment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {workOrder.work_order_assignments && workOrder.work_order_assignments.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium">Assigned To</p>
                    <p className="text-sm text-muted-foreground">
                      {workOrder.work_order_assignments[0].profiles?.first_name} {workOrder.work_order_assignments[0].profiles?.last_name}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned</p>
                )}
                
                {workOrder.created_user && (
                  <div>
                    <p className="text-sm font-medium">Created By</p>
                    <p className="text-sm text-muted-foreground">
                      {workOrder.created_user.first_name} {workOrder.created_user.last_name}
                    </p>
                  </div>
                )}
                
                {workOrder.estimated_hours && (
                  <div>
                    <p className="text-sm font-medium">Estimated Hours</p>
                    <p className="text-sm text-muted-foreground">{workOrder.estimated_hours}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {workOrder.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{workOrder.description}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Work Order Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {workOrder.work_order_reports && workOrder.work_order_reports.length > 0 ? (
                <div className="space-y-4">
                  {workOrder.work_order_reports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {report.subcontractor_user.first_name} {report.subcontractor_user.last_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                           <Badge className={`${getStatusColor(report.status)} h-5 text-[10px] px-1.5`}>
                            {report.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(report.submitted_at)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm">{report.work_performed}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {report.hours_worked && (
                            <span>Hours: {report.hours_worked}</span>
                          )}
                          <span>Status: {report.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No reports submitted yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              {workOrder.work_order_attachments && workOrder.work_order_attachments.length > 0 ? (
                <div className="space-y-4">
                  {workOrder.work_order_attachments.map((attachment) => (
                    <div key={attachment.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{attachment.file_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{attachment.file_type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(attachment.uploaded_at)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Uploaded by: {attachment.uploaded_by_user.first_name} {attachment.uploaded_by_user.last_name}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No attachments uploaded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
