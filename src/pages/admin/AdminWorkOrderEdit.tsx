
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useWorkOrder } from '@/hooks/useWorkOrders';
import { useUpdateWorkOrder } from '@/hooks/useAdminWorkOrders';
import { WorkOrderBreadcrumb } from '@/components/admin/work-orders/WorkOrderBreadcrumb';
import { WorkOrderForm } from '@/components/admin/work-orders/WorkOrderForm';
import { useToast } from '@/hooks/use-toast';

export default function AdminWorkOrderEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<any>(null);

  const { data: workOrder, isLoading, error } = useWorkOrder(id!);
  const updateWorkOrder = useUpdateWorkOrder();

  useEffect(() => {
    if (workOrder) {
      setFormData({
        title: workOrder.title,
        description: workOrder.description,
        organization_id: workOrder.organization_id,
        trade_id: workOrder.trade_id,
        store_location: workOrder.store_location,
        street_address: workOrder.street_address,
        city: workOrder.city,
        state: workOrder.state,
        zip_code: workOrder.zip_code,
        partner_po_number: workOrder.partner_po_number,
        partner_location_number: workOrder.partner_location_number,
        estimated_hours: workOrder.estimated_hours,
        due_date: workOrder.due_date,
      });
    }
  }, [workOrder]);

  const handleSave = async () => {
    if (!id || !formData) return;

    try {
      await updateWorkOrder.mutateAsync({
        id,
        ...formData,
      });
      navigate(`/admin/work-orders/${id}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update work order',
      });
    }
  };

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
        currentPage="Edit"
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Edit Work Order</h1>
          <p className="text-muted-foreground">
            Update work order details and requirements
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/work-orders/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateWorkOrder.isPending || !formData}
          >
            {updateWorkOrder.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          {formData && (
            <WorkOrderForm
              data={formData}
              onChange={setFormData}
              isEditing={true}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
