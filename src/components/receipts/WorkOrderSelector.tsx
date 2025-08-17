import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MobilePullToRefresh } from "@/components/MobilePullToRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Search, 
  Zap, 
  X, 
  MapPin, 
  AlertCircle,
  AlertTriangle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  store_location?: string;
  status: string;
  organizations?: {
    name: string;
  };
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
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  // Pull to refresh functionality
  const { handleRefresh } = usePullToRefresh({
    queryKey: ["employee-work-orders"],
    successMessage: 'Work orders refreshed'
  });
  
  // Filter work orders based on search
  const filteredWorkOrders = workOrders.filter(wo => {
    const query = searchQuery.toLowerCase();
    return (
      wo.work_order_number.toLowerCase().includes(query) ||
      wo.title.toLowerCase().includes(query) ||
      (wo.store_location?.toLowerCase().includes(query) ?? false)
    );
  });

  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
  const remaining = totalAmount - totalAllocated;
  const isFullyAllocated = Math.abs(remaining) < 0.01;

  const handleAutoAllocate = () => {
    if (workOrders.length === 1) {
      // Allocate full amount to single work order
      onAllocationChange([{
        work_order_id: workOrders[0].id,
        allocated_amount: totalAmount,
      }]);
    } else if (workOrders.length > 1) {
      // Allocate to first work order
      const firstWO = workOrders[0];
      onAllocationChange([{
        work_order_id: firstWO.id,
        allocated_amount: totalAmount,
      }]);
    }
  };

  const handleSplitEvenly = () => {
    if (allocations.length > 0) {
      const amountPerOrder = totalAmount / allocations.length;
      const newAllocations = allocations.map((a, index) => ({
        ...a,
        allocated_amount: index === allocations.length - 1 
          ? totalAmount - (amountPerOrder * (allocations.length - 1)) // Handle rounding
          : amountPerOrder
      }));
      onAllocationChange(newAllocations);
    }
  };

  const handleAddWorkOrder = (workOrderId: string) => {
    const newAllocation: Allocation = {
      work_order_id: workOrderId,
      allocated_amount: remaining > 0 ? Math.min(remaining, totalAmount) : 0,
    };
    onAllocationChange([...allocations, newAllocation]);
  };

  const handleRemoveWorkOrder = (workOrderId: string) => {
    onAllocationChange(allocations.filter(a => a.work_order_id !== workOrderId));
  };

  const handleAmountChange = (workOrderId: string, amount: number) => {
    const updatedAllocations = allocations.map(allocation =>
      allocation.work_order_id === workOrderId
        ? { ...allocation, allocated_amount: Math.max(0, amount) }
        : allocation
    );
    onAllocationChange(updatedAllocations);
  };

  return (
    <div className="space-y-4">
      {/* Header with amount summary */}
      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Total Receipt</p>
          <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Remaining</p>
          <p className={cn(
            "text-2xl font-bold",
            isFullyAllocated ? "text-green-600" : "text-amber-600"
          )}>
            ${remaining.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      {!isFullyAllocated && workOrders.length > 0 && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoAllocate}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Auto-Allocate
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSplitEvenly}
            disabled={allocations.length === 0}
          >
            Split Evenly
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search work orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn("pl-10", isMobile && "h-11")}
        />
      </div>

      {/* Work Orders List */}
      <MobilePullToRefresh onRefresh={handleRefresh} disabled={!isMobile}>
        <ScrollArea className="h-[400px] pr-4">
            {filteredWorkOrders.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No matching work orders" : "No work orders available"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWorkOrders.map((workOrder) => {
                  const allocation = allocations.find(a => a.work_order_id === workOrder.id);
                  const isSelected = !!allocation;

                  return (
                    <Card 
                      key={workOrder.id}
                      className={cn(
                        "transition-colors cursor-pointer",
                        isSelected && "border-primary bg-primary/5"
                      )}
                      onClick={() => !isSelected && handleAddWorkOrder(workOrder.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">
                                {workOrder.work_order_number}
                              </Badge>
                              {workOrder.organizations?.name && (
                                <Badge variant="secondary" className="text-xs">
                                  {workOrder.organizations.name}
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium">{workOrder.title}</p>
                            {workOrder.store_location && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {workOrder.store_location}
                              </p>
                            )}
                          </div>
                          
                          {isSelected && (
                            <div className="ml-4">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={totalAmount}
                                  value={allocation.allocated_amount}
                                  onChange={(e) => handleAmountChange(workOrder.id, parseFloat(e.target.value) || 0)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={cn("w-24", isMobile ? "h-11" : "h-8")}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size={isMobile ? "default" : "sm"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveWorkOrder(workOrder.id);
                                  }}
                                  className={cn(isMobile && "h-11 w-11")}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </MobilePullToRefresh>

      {/* Validation Alert */}
      {!isFullyAllocated && totalAllocated > 0 && (
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

      {/* Allocation Summary */}
      {allocations.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="font-medium mb-2">Allocation Summary</p>
            <div className="space-y-1">
              {allocations.map(allocation => {
                const wo = workOrders.find(w => w.id === allocation.work_order_id);
                return (
                  <div key={allocation.work_order_id} className="flex justify-between text-sm">
                    <span>{wo?.work_order_number}</span>
                    <span className="font-medium">${allocation.allocated_amount.toFixed(2)}</span>
                  </div>
                );
              })}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total Allocated</span>
                <span className={cn(
                  isFullyAllocated ? "text-green-600" : ""
                )}>
                  ${totalAllocated.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}