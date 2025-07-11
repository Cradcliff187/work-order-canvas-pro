import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  store_location?: string;
  status: string;
}

interface Allocation {
  work_order_id: string;
  allocated_amount: number;
  allocation_notes?: string;
}

interface WorkOrderSelectorProps {
  workOrders: WorkOrder[];
  allocations: Allocation[];
  totalAmount: number;
  onAllocationChange: (allocations: Allocation[]) => void;
}

export function WorkOrderSelector({
  workOrders,
  allocations,
  totalAmount,
  onAllocationChange,
}: WorkOrderSelectorProps) {
  const selectedWorkOrderIds = allocations.map(a => a.work_order_id);
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
  const remaining = totalAmount - totalAllocated;
  const isValidAllocation = Math.abs(remaining) < 0.01; // Allow for floating point precision

  const handleWorkOrderToggle = (workOrderId: string, checked: boolean) => {
    if (checked) {
      // Add new allocation
      const newAllocation: Allocation = {
        work_order_id: workOrderId,
        allocated_amount: remaining > 0 ? Math.min(remaining, totalAmount) : 0,
      };
      onAllocationChange([...allocations, newAllocation]);
    } else {
      // Remove allocation
      onAllocationChange(allocations.filter(a => a.work_order_id !== workOrderId));
    }
  };

  const handleAmountChange = (workOrderId: string, amount: number) => {
    const updatedAllocations = allocations.map(allocation =>
      allocation.work_order_id === workOrderId
        ? { ...allocation, allocated_amount: Math.max(0, amount) }
        : allocation
    );
    onAllocationChange(updatedAllocations);
  };

  const handleNotesChange = (workOrderId: string, notes: string) => {
    const updatedAllocations = allocations.map(allocation =>
      allocation.work_order_id === workOrderId
        ? { ...allocation, allocation_notes: notes }
        : allocation
    );
    onAllocationChange(updatedAllocations);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-medium">Allocate to Work Orders</Label>
        <div className="text-sm text-muted-foreground">
          <span className={remaining > 0.01 ? "text-amber-600" : remaining < -0.01 ? "text-destructive" : "text-green-600"}>
            Remaining: ${remaining.toFixed(2)}
          </span>
        </div>
      </div>

      {!isValidAllocation && totalAllocated > 0 && (
        <Alert variant={remaining < -0.01 ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {remaining > 0.01 
              ? `You still need to allocate $${remaining.toFixed(2)}.`
              : `You've over-allocated by $${Math.abs(remaining).toFixed(2)}.`
            }
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {workOrders.map((workOrder) => {
          const isSelected = selectedWorkOrderIds.includes(workOrder.id);
          const allocation = allocations.find(a => a.work_order_id === workOrder.id);

          return (
            <Card key={workOrder.id} className={isSelected ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => 
                      handleWorkOrderToggle(workOrder.id, checked as boolean)
                    }
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="font-medium text-sm">
                        {workOrder.work_order_number}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {workOrder.title}
                      </div>
                      {workOrder.store_location && (
                        <div className="text-xs text-muted-foreground">
                          {workOrder.store_location}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`amount-${workOrder.id}`} className="text-xs">
                            Amount
                          </Label>
                          <Input
                            id={`amount-${workOrder.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            max={totalAmount}
                            value={allocation?.allocated_amount || 0}
                            onChange={(e) => 
                              handleAmountChange(workOrder.id, parseFloat(e.target.value) || 0)
                            }
                            className="h-8"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`notes-${workOrder.id}`} className="text-xs">
                            Notes (optional)
                          </Label>
                          <Input
                            id={`notes-${workOrder.id}`}
                            value={allocation?.allocation_notes || ""}
                            onChange={(e) => 
                              handleNotesChange(workOrder.id, e.target.value)
                            }
                            className="h-8"
                            placeholder="Allocation notes"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {workOrders.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p>No work orders available for allocation.</p>
          <p className="text-sm">You need to be assigned to work orders to allocate receipts.</p>
        </div>
      )}
    </div>
  );
}