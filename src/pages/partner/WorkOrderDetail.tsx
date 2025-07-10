import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Calendar, User, Wrench, FileText, Clock, Printer } from 'lucide-react';
import { useWorkOrderById } from '@/hooks/usePartnerWorkOrders';
import { format } from 'date-fns';

const statusColors = {
  received: 'bg-blue-100 text-blue-800',
  assigned: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusTimeline = [
  { status: 'received', label: 'Received', icon: FileText },
  { status: 'assigned', label: 'Assigned', icon: User },
  { status: 'in_progress', label: 'In Progress', icon: Clock },
  { status: 'completed', label: 'Completed', icon: 'check-circle' },
];

const WorkOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: workOrder, isLoading } = useWorkOrderById(id!);

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">Loading work order details...</div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Work Order Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The work order you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => navigate('/partner/work-orders')}>
            Back to Work Orders
          </Button>
        </div>
      </div>
    );
  }

  const getStatusIndex = (status: string) => {
    return statusTimeline.findIndex(s => s.status === status);
  };

  const currentStatusIndex = getStatusIndex(workOrder.status);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <Button variant="ghost" onClick={() => navigate('/partner/work-orders')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Orders
          </Button>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">
              Work Order #{workOrder.work_order_number}
            </h1>
            <Badge 
              variant="secondary"
              className={statusColors[workOrder.status as keyof typeof statusColors]}
            >
              {workOrder.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">{workOrder.title}</p>
        </div>
        <Button variant="outline" onClick={handlePrint} className="print:hidden">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusTimeline.map((step, index) => {
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  
                  return (
                    <div key={step.status} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {step.label}
                        </p>
                        {step.status === workOrder.status && (
                          <p className="text-sm text-muted-foreground">Current status</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Location Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Store Location</h4>
                <p className="text-muted-foreground">{workOrder.store_location}</p>
              </div>
              <div>
                <h4 className="font-medium">Address</h4>
                <p className="text-muted-foreground">
                  {workOrder.street_address}<br />
                  {workOrder.city}, {workOrder.state} {workOrder.zip_code}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Work Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Work Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Trade Type</h4>
                <p className="text-muted-foreground">{workOrder.trades?.name}</p>
              </div>
              <div>
                <h4 className="font-medium">Description</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{workOrder.description}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Key Information */}
          <Card>
            <CardHeader>
              <CardTitle>Key Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Organization</h4>
                <p className="font-medium">{workOrder.organizations?.name}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Submitted</h4>
                <p className="font-medium">
                  {format(new Date(workOrder.date_submitted), 'MMM d, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(workOrder.date_submitted), 'h:mm a')}
                </p>
              </div>

              {workOrder.estimated_completion_date && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Estimated Completion</h4>
                    <p className="font-medium">
                      {format(new Date(workOrder.estimated_completion_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </>
              )}

              {workOrder.date_completed && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Completed</h4>
                    <p className="font-medium">
                      {format(new Date(workOrder.date_completed), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(workOrder.date_completed), 'h:mm a')}
                    </p>
                  </div>
                </>
              )}
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Created By</h4>
                <p className="font-medium">
                  {workOrder.created_user?.first_name} {workOrder.created_user?.last_name}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Organization Contact</h4>
                <p className="font-medium">{workOrder.organizations?.contact_email}</p>
                {workOrder.organizations?.contact_phone && (
                  <p className="text-sm text-muted-foreground">
                    {workOrder.organizations.contact_phone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WorkOrderDetail;