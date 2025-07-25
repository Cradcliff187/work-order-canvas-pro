
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useWorkOrder } from '@/hooks/useWorkOrders';
import { useAdminWorkOrderEdit } from '@/hooks/useAdminWorkOrderEdit';
import { WorkOrderForm } from '@/components/admin/work-orders/WorkOrderForm';
import { WorkOrderBreadcrumb } from '@/components/admin/work-orders/WorkOrderBreadcrumb';
import { useToast } from '@/hooks/use-toast';

export default function AdminWorkOrderEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: workOrder, isLoading, error } = useWorkOrder(id!);
  const { updateWorkOrder, isUpdating } = useAdminWorkOrderEdit();

  const handleSubmit = async (formData: any) => {
    try {
      await updateWorkOrder.mutateAsync({
        id: id!,
        originalStatus: workOrder?.status,
        ...formData,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      });
      navigate(`/admin/work-orders/${id}`);
    } catch (error) {
      console.error('Error updating work order:', error);
    }
  };

  const handleCancel = () => {
    navigate(`/admin/work-orders/${id}`);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <WorkOrderBreadcrumb 
          workOrderId={id}
          currentPage="Edit"
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
          currentPage="Edit"
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

  return (
    <div className="p-6 space-y-6">
      <WorkOrderBreadcrumb 
        workOrderId={id}
        currentPage="Edit"
      />
      
      <div className="flex items-center gap-4">
        <Button 
          onClick={() => navigate(`/admin/work-orders/${id}`)} 
          variant="outline" 
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Details
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Work Order</h1>
          <p className="text-muted-foreground">
            {workOrder.work_order_number || `Work Order ${workOrder.id?.slice(0, 8)}`}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkOrderForm
            workOrder={workOrder}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isUpdating}
          />
        </CardContent>
      </Card>
    </div>
  );
}
