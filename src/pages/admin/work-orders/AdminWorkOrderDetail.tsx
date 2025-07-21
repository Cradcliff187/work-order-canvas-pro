
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  MapPin, 
  Building, 
  User, 
  Clock, 
  FileText, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useWorkOrder } from '@/hooks/useWorkOrders';
import { WorkOrderBreadcrumb } from '@/components/admin/work-orders/WorkOrderBreadcrumb';
import { AssignWorkOrderModal } from '@/components/admin/work-orders/AssignWorkOrderModal';
import { formatDate, formatDateTime } from '@/lib/utils/date';

export default function AdminWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  const { data: workOrder, isLoading, error } = useWorkOrder(id!);

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
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Work Order Not Found</h3>
                <p className="text-muted-foreground">
                  {error?.message || 'The work order you are looking for does not exist.'}
                </p>
              </div>
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
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <WorkOrderBreadcrumb 
        workOrderId={id}
        currentPage="Details"
      />
      
      {/* Header */}
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
          <Badge className={getStatusColor(workOrder.status)}>
            {workOrder.status.replace('_', ' ')}
          </Badge>
          <Button 
            onClick={() => navigate(`/admin/work-orders/${id}/edit`)}
            size="sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            onClick={() => setShowAssignModal(true)}
            size="sm"
            variant="outline"
          >
            <User className="h-4 w-4 mr-2" />
            Assign
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Work Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Title</label>
                    <p className="text-sm">{workOrder.title}</p>
                  </div>
                  
                  {workOrder.description && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-sm">{workOrder.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Trade</label>
                      <p className="text-sm">
                        {workOrder.trades?.name || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Badge className={getStatusColor(workOrder.status)}>
                        {workOrder.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estimated Hours</label>
                      <p className="text-sm">{workOrder.estimated_hours || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                      <p className="text-sm">{workOrder.due_date ? formatDate(workOrder.due_date) : 'Not specified'}</p>
                    </div>
                  </div>

                  {workOrder.partner_po_number && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">PO Number</label>
                      <p className="text-sm">{workOrder.partner_po_number}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Organization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">
                        {workOrder.organizations?.name || 'Not specified'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {workOrder.organizations?.organization_type || 'Unknown type'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {workOrder.assigned_user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Assigned To
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">
                      {workOrder.assigned_user.first_name} {workOrder.assigned_user.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {workOrder.assigned_to_type || 'Unknown type'}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium">Submitted</p>
                    <p className="text-muted-foreground">
                      {formatDateTime(workOrder.date_submitted)}
                    </p>
                  </div>
                  
                  {workOrder.date_assigned && (
                    <div className="text-sm">
                      <p className="font-medium">Assigned</p>
                      <p className="text-muted-foreground">
                        {formatDateTime(workOrder.date_assigned)}
                      </p>
                    </div>
                  )}
                  
                  {workOrder.completed_at && (
                    <div className="text-sm">
                      <p className="font-medium">Completed</p>
                      <p className="text-muted-foreground">
                        {formatDateTime(workOrder.completed_at)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Store Location</label>
                <p className="text-sm">{workOrder.store_location || 'Not specified'}</p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Street Address</label>
                  <p className="text-sm">{workOrder.street_address || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <p className="text-sm">{workOrder.city || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">State</label>
                  <p className="text-sm">{workOrder.state || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ZIP Code</label>
                  <p className="text-sm">{workOrder.zip_code || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Work Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div>
                    <p className="font-medium">Work Order Submitted</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(workOrder.date_submitted)}
                    </p>
                  </div>
                </div>
                
                {workOrder.date_assigned && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
                    <div>
                      <p className="font-medium">Work Order Assigned</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(workOrder.date_assigned)}
                      </p>
                    </div>
                  </div>
                )}
                
                {workOrder.completed_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                    <div>
                      <p className="font-medium">Work Order Completed</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(workOrder.completed_at)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Work Order Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                No reports submitted yet
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assignment Modal */}
      <AssignWorkOrderModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        workOrders={workOrder ? [workOrder] : []}
      />
    </div>
  );
}
