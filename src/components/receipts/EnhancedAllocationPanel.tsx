import React, { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AlertTriangle, Calculator, Plus, Minus, CheckCircle2 } from "lucide-react";
import { SmartWorkOrderSelector } from "./SmartWorkOrderSelector";
import { WorkOrderSelector } from "./WorkOrderSelector";
import type { WorkOrderAllocation } from "@/reducers/receiptFlowReducer";

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  store_location?: string;
  status: string;
  organizations?: {
    name: string;
    initials: string;
  };
}

interface EnhancedAllocationPanelProps {
  availableWorkOrders: WorkOrder[];
  recentWorkOrders: WorkOrder[];
  totalAmount: number;
  mode: 'single' | 'split';
  allocations: WorkOrderAllocation[];
  onModeChange: (mode: 'single' | 'split') => void;
  onAllocationsChange: (allocations: WorkOrderAllocation[]) => void;
  onSingleAllocationChange: (workOrderId: string) => void;
  showModeToggle: boolean;
  className?: string;
}

export function EnhancedAllocationPanel({
  availableWorkOrders,
  recentWorkOrders,
  totalAmount,
  mode,
  allocations,
  onModeChange,
  onAllocationsChange,
  onSingleAllocationChange,
  showModeToggle,
  className,
}: EnhancedAllocationPanelProps) {
  
  // Calculate allocation summary
  const allocationSummary = useMemo(() => {
    const totalAllocated = allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
    const remaining = totalAmount - totalAllocated;
    const isValid = Math.abs(remaining) < 0.01; // Allow 1 cent tolerance
    const isOverAllocated = remaining < -0.01;
    const isUnderAllocated = remaining > 0.01;
    
    return {
      totalAllocated,
      remaining,
      isValid,
      isOverAllocated,
      isUnderAllocated,
    };
  }, [allocations, totalAmount]);

  // Convert allocations for WorkOrderSelector component
  const workOrderAllocations = useMemo(() => 
    allocations.map(allocation => ({
      work_order_id: allocation.work_order_id,
      allocated_amount: allocation.allocated_amount,
    })),
    [allocations]
  );

  // Handle multi-allocation changes from WorkOrderSelector
  const handleWorkOrderAllocationChange = useCallback((newAllocations: typeof workOrderAllocations) => {
    const updatedAllocations = newAllocations.map(allocation => ({
      work_order_id: allocation.work_order_id,
      allocated_amount: allocation.allocated_amount,
      allocation_notes: allocations.find(a => a.work_order_id === allocation.work_order_id)?.allocation_notes,
    }));
    onAllocationsChange(updatedAllocations);
  }, [allocations, onAllocationsChange]);

  // Get single allocation work order ID
  const singleWorkOrderId = mode === 'single' && allocations.length > 0 ? allocations[0].work_order_id : "";

  // Handle single allocation change
  const handleSingleWorkOrderChange = useCallback((workOrderId: string) => {
    onSingleAllocationChange(workOrderId);
  }, [onSingleAllocationChange]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Work Order Assignment
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Mode Toggle - Progressive Disclosure */}
        {showModeToggle && (
          <Tabs value={mode} onValueChange={(value) => onModeChange(value as 'single' | 'split')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Single Assignment
              </TabsTrigger>
              <TabsTrigger value="split" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Split Receipt
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4 mt-4">
              {/* Single Mode */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Full amount:</span>
                  <Badge variant="secondary" className="font-mono">
                    ${totalAmount.toFixed(2)}
                  </Badge>
                </div>
                
                <SmartWorkOrderSelector
                  availableWorkOrders={availableWorkOrders}
                  recentWorkOrders={recentWorkOrders}
                  selectedWorkOrderId={singleWorkOrderId}
                  onSelect={handleSingleWorkOrderChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="split" className="space-y-4 mt-4">
              {/* Split Mode */}
              <div className="space-y-4">
                {/* Allocation Summary */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Total: ${totalAmount.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      Allocated: ${allocationSummary.totalAllocated.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-sm font-medium",
                      allocationSummary.isValid && "text-success",
                      allocationSummary.isOverAllocated && "text-destructive",
                      allocationSummary.isUnderAllocated && "text-warning"
                    )}>
                      Remaining: ${allocationSummary.remaining.toFixed(2)}
                    </div>
                    {allocationSummary.isValid && (
                      <Badge variant="success" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Valid
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Validation Alert */}
                {!allocationSummary.isValid && (
                  <Alert variant={allocationSummary.isOverAllocated ? "destructive" : "default"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {allocationSummary.isOverAllocated 
                        ? `Over-allocated by $${Math.abs(allocationSummary.remaining).toFixed(2)}`
                        : `Under-allocated by $${allocationSummary.remaining.toFixed(2)}`
                      }
                    </AlertDescription>
                  </Alert>
                )}

                {/* Work Order Selector */}
                <WorkOrderSelector
                  workOrders={availableWorkOrders}
                  allocations={workOrderAllocations}
                  totalAmount={totalAmount}
                  onAllocationChange={handleWorkOrderAllocationChange}
                />

                {/* Split Actions */}
                {allocations.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Select work orders to split this receipt</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Single Mode Only (when toggle not shown) */}
        {!showModeToggle && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Assignment:</span>
              <Badge variant="secondary" className="font-mono">
                ${totalAmount.toFixed(2)}
              </Badge>
            </div>
            
            <SmartWorkOrderSelector
              availableWorkOrders={availableWorkOrders}
              recentWorkOrders={recentWorkOrders}
              selectedWorkOrderId={singleWorkOrderId}
              onSelect={handleSingleWorkOrderChange}
            />
          </div>
        )}

        {/* Allocation Preview for Single Mode */}
        {mode === 'single' && singleWorkOrderId && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Assignment Preview</div>
              <div className="flex items-center justify-between p-2 bg-success/10 border border-success/20 rounded-lg">
                <div className="text-sm">
                  {availableWorkOrders.find(wo => wo.id === singleWorkOrderId)?.work_order_number}
                </div>
                <Badge variant="success" className="font-mono">
                  ${totalAmount.toFixed(2)}
                </Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}