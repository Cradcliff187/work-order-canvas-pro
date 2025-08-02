import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubcontractorWorkOrders } from '@/hooks/useSubcontractorWorkOrders';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function SubcontractorSubmitReport() {
  const navigate = useNavigate();
  const { assignedWorkOrders } = useSubcontractorWorkOrders();

  if (assignedWorkOrders.isLoading) {
    return <LoadingSpinner />;
  }

  // Filter work orders that need reports (assigned or in_progress status)
  const workOrdersNeedingReports = assignedWorkOrders.data?.filter(
    (wo: any) => wo.status === 'assigned' || wo.status === 'in_progress'
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Submit Reports</h1>
        <p className="text-muted-foreground">
          Submit completion reports for your assigned work orders
        </p>
      </div>

      {workOrdersNeedingReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reports to Submit</h3>
            <p className="text-muted-foreground text-center">
              All your assigned work orders have been completed or don't require reports yet.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/subcontractor/work-orders')}
            >
              View All Work Orders
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workOrdersNeedingReports.map((workOrder: any) => (
            <Card key={workOrder.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {workOrder.work_order_number}
                    </CardTitle>
                    <CardDescription className="font-medium">
                      {workOrder.title}
                    </CardDescription>
                  </div>
                  <Badge variant={workOrder.status === 'assigned' ? 'secondary' : 'default'}>
                    {workOrder.status === 'assigned' ? 'Assigned' : 'In Progress'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {workOrder.store_location}
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    Assigned {formatDistanceToNow(new Date(workOrder.date_assigned))} ago
                  </div>
                </div>

                {workOrder.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {workOrder.description}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    onClick={() => navigate(`/subcontractor/reports/new/${workOrder.id}`)}
                  >
                    Submit Report
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/subcontractor/work-orders/${workOrder.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}