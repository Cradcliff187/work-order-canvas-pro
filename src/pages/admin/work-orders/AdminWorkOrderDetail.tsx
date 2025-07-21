
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Edit, 
  MapPin, 
  Building2, 
  Calendar, 
  Clock, 
  User, 
  FileText,
  Phone,
  Mail,
  Loader2
} from 'lucide-react';
import { useWorkOrder } from '@/hooks/useWorkOrders';
import { WorkOrderBreadcrumb } from '@/components/admin/work-orders/WorkOrderBreadcrumb';
import { formatDate, formatDateTime } from '@/lib/utils/date';

const statusColors = {
  received: 'bg-blue-100 text-blue-800',
  assigned: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AdminWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: workOrder, isLoading, error } = useWorkOrder(id!);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">
                {error?.message || 'Work order not found'}
              </p>
              <Button onClick={() => navigate('/admin/work-orders')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Work Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <WorkOrderBreadcrumb 
        workOrderNumber={workOrder.work_order_number}
        currentPage="Details"
      />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{workOrder.title}</h1>
            <Badge className={statusColors[workOrder.status as keyof typeof statusColors]}>
              {workOrder.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Work Order #{workOrder.work_order_number}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/work-orders')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={() => navigate(`/admin/work-orders/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Work Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Description</h4>
                <p className="text-sm">{workOrder.description || 'No description provided'}</p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Trade</h4>
                  <p className="text-sm">{workOrder.trades?.name || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Priority</h4>
                  <p className="text-sm">Normal</p>
                </div>
              </div>

              {workOrder.estimated_hours && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Estimated Hours</h4>
                  <p className="text-sm">{workOrder.estimated_hours} hours</p>
                </div>
              )}

              {workOrder.partner_po_number && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">PO Number</h4>
                  <p className="text-sm">{workOrder.partner_po_number}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Store/Location</h4>
                <p className="text-sm font-medium">{workOrder.store_location}</p>
                {workOrder.partner_location_number && (
                  <p className="text-xs text-muted-foreground">Code: {workOrder.partner_location_number}</p>
                )}
              </div>

              {workOrder.street_address && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Address</h4>
                    <div className="text-sm space-y-1">
                      <p>{workOrder.street_address}</p>
                      <p>{workOrder.city}, {workOrder.state} {workOrder.zip_code}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{workOrder.organizations?.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {workOrder.organizations?.organization_type} Organization
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Info */}
          {workOrder.assigned_user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Assigned To
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">
                    {workOrder.assigned_user.first_name} {workOrder.assigned_user.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {workOrder.assigned_to_type} Assignment
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Submitted</h4>
                <p className="text-sm">{formatDateTime(workOrder.date_submitted)}</p>
              </div>

              {workOrder.date_assigned && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Assigned</h4>
                  <p className="text-sm">{formatDateTime(workOrder.date_assigned)}</p>
                </div>
              )}

              {workOrder.estimated_completion_date && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Due Date</h4>
                  <p className="text-sm">{formatDate(workOrder.estimated_completion_date)}</p>
                </div>
              )}

              {workOrder.completed_at && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Completed</h4>
                  <p className="text-sm">{formatDateTime(workOrder.completed_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
