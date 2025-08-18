import React, { useState, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMobileAllocation } from "@/hooks/useMobileAllocation";
import { cn } from "@/lib/utils";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Calculator, 
  MapPin,
  X,
  Users,
  Target,
  DollarSign,
  ChevronRight
} from "lucide-react";
import {
  AllocationWorkflowValidator,
  getActionButtonText,
  formatAllocationSummary,
  type WorkOrder,
  type WorkflowAllocation,
  type AllocationState
} from "@/utils/allocationWorkflow";

interface AllocationWorkflowProps {
  workOrders: WorkOrder[];
  totalAmount: number;
  allocations: WorkflowAllocation[];
  onAllocationsChange: (allocations: WorkflowAllocation[]) => void;
  vendor?: string;
  className?: string;
}

export const AllocationWorkflow = memo(function AllocationWorkflow({
  workOrders,
  totalAmount,
  allocations,
  onAllocationsChange,
  vendor,
  className
}: AllocationWorkflowProps) {
  const { toast } = useToast();
  
  // Mobile optimization hook
  const { 
    isMobile, 
    hapticFeedback, 
    useSwipeToRemove, 
    useDebouncedAmountChange,
    getTouchTargetClass,
    getInputProps,
    getFloatingActionClass
  } = useMobileAllocation({
    onRemoveAllocation: (workOrderId: string) => {
      const updatedAllocations = allocations.filter(a => a.work_order_id !== workOrderId);
      onAllocationsChange(updatedAllocations);
      setSelectedWorkOrderIds(prev => prev.filter(id => id !== workOrderId));
    },
    debounceDelay: 300
  });
  
  // Selection state
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>(
    allocations.map(a => a.work_order_id)
  );
  
  
  // Initialize validator
  const validator = useMemo(
    () => new AllocationWorkflowValidator(totalAmount, workOrders),
    [totalAmount, workOrders]
  );
  
  
  // Workflow state with enhanced logic
  const workflowState: AllocationState = useMemo(() => ({
    selectedWorkOrderIds,
    allocations,
    totalAmount,
    mode: selectedWorkOrderIds.length === 0 ? 'select' : 
          allocations.length === 0 ? 'allocate' : 'confirm'
  }), [selectedWorkOrderIds, allocations, totalAmount]);
  
  // Calculate workflow progress (0-100)
  const workflowProgress = useMemo(() => {
    let progress = 25; // Start with receipt amount confirmed
    
    if (selectedWorkOrderIds.length > 0) progress += 25; // Work orders selected
    if (allocations.length > 0) progress += 25; // Amounts allocated
    
    const summary = formatAllocationSummary(allocations, totalAmount);
    if (summary.status === 'perfect') progress += 25; // Perfect allocation
    
    return Math.min(progress, 100);
  }, [selectedWorkOrderIds.length, allocations, totalAmount]);
  
  // Validation results
  const validation = useMemo(
    () => validator.validateWorkflow(workflowState),
    [validator, workflowState]
  );
  
  // Allocation summary
  const summary = useMemo(
    () => formatAllocationSummary(allocations, totalAmount),
    [allocations, totalAmount]
  );
  
  
  // Handle work order selection with haptic feedback
  const handleWorkOrderToggle = useCallback((workOrderId: string, checked: boolean) => {
    // Trigger haptic feedback
    if (checked) {
      hapticFeedback.onSelection();
    } else {
      hapticFeedback.onDeselection();
    }
    
    setSelectedWorkOrderIds(prev => {
      const newSelection = checked 
        ? [...prev, workOrderId]
        : prev.filter(id => id !== workOrderId);
      
      // Auto-remove allocations for unselected work orders
      if (!checked) {
        const updatedAllocations = allocations.filter(a => a.work_order_id !== workOrderId);
        onAllocationsChange(updatedAllocations);
      }
      
      
      return newSelection;
    });
  }, [allocations, onAllocationsChange, hapticFeedback]);
  
  
  // Handle amount changes with haptic feedback and validation
  const handleAmountChange = useCallback((workOrderId: string, amount: number) => {
    if (amount < 0) {
      hapticFeedback.onValidationError();
      toast({
        title: "Invalid Amount",
        description: "Amount cannot be negative",
        variant: "destructive"
      });
      return;
    }
    
    hapticFeedback.onAmountInput();
    
    const updatedAllocations = allocations.map(a =>
      a.work_order_id === workOrderId 
        ? { ...a, allocated_amount: amount }
        : a
    );
    
    // Add new allocation if not exists
    if (!allocations.find(a => a.work_order_id === workOrderId) && amount > 0) {
      updatedAllocations.push({
        work_order_id: workOrderId,
        allocated_amount: amount
      });
    }
    
    // Remove allocation if amount is 0
    const filteredAllocations = updatedAllocations.filter(a => a.allocated_amount > 0);
    
    onAllocationsChange(filteredAllocations);
    
    // Check for perfect allocation and trigger success haptic
    const total = filteredAllocations.reduce((sum, a) => sum + a.allocated_amount, 0);
    if (Math.abs(total - totalAmount) < 0.01) {
      hapticFeedback.onPerfectAllocation();
    }
  }, [allocations, onAllocationsChange, toast, hapticFeedback, totalAmount]);
  
  // Enhanced split evenly with haptic feedback
  const handleSplitEvenly = useCallback(() => {
    if (selectedWorkOrderIds.length === 0) {
      hapticFeedback.onValidationError();
      toast({
        title: "Select Work Orders First",
        description: "Please select the work orders you want to split this receipt between",
        variant: "destructive"
      });
      return;
    }
    
    hapticFeedback.onSplit();
    const amountPerOrder = Math.round((totalAmount / selectedWorkOrderIds.length) * 100) / 100;
    const suggestedAllocations = validator.getSuggestedAllocations(selectedWorkOrderIds);
    onAllocationsChange(suggestedAllocations);
    
    toast({
      title: "Split Applied",
      description: `$${totalAmount.toFixed(2)} ÷ ${selectedWorkOrderIds.length} = $${amountPerOrder.toFixed(2)} each`,
    });
  }, [selectedWorkOrderIds, validator, onAllocationsChange, totalAmount, toast, hapticFeedback]);
  
  // Auto-allocate with haptic feedback
  const handleAutoAllocate = useCallback(() => {
    if (selectedWorkOrderIds.length === 0) {
      hapticFeedback.onValidationError();
      toast({
        title: "Select Work Orders First",
        description: "Please select at least one work order",
        variant: "destructive"
      });
      return;
    }
    
    hapticFeedback.onAutoAllocate();
    const firstWorkOrderId = selectedWorkOrderIds[0];
    const newAllocations: WorkflowAllocation[] = [{
      work_order_id: firstWorkOrderId,
      allocated_amount: totalAmount
    }];
    
    onAllocationsChange(newAllocations);
    
    const workOrder = workOrders.find(w => w.id === firstWorkOrderId);
    toast({
      title: "Auto-Allocation Complete",
      description: `Full amount allocated to ${workOrder?.work_order_number || 'selected work order'}`,
    });
  }, [selectedWorkOrderIds, workOrders, totalAmount, onAllocationsChange, toast, hapticFeedback]);
  
  // Clear all allocations
  const handleClearAllocations = useCallback(() => {
    onAllocationsChange([]);
    setSelectedWorkOrderIds([]);
    toast({
      title: "Allocations Cleared",
      description: "All allocations have been removed",
    });
  }, [onAllocationsChange, toast]);
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Workflow Progress Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-semibold">Receipt Allocation</span>
                <Badge variant="outline" className="font-mono">
                  {vendor || 'Receipt'}
                </Badge>
              </div>
              <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
            </div>
            
            {/* Progress Steps */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Progress: {Math.round(workflowProgress)}% complete</span>
                <span>
                  {workflowState.mode === 'select' && 'Select work orders'}
                  {workflowState.mode === 'allocate' && 'Set allocation amounts'}
                  {workflowState.mode === 'confirm' && 'Ready to submit'}
                </span>
              </div>
              <Progress value={workflowProgress} className="h-2" />
              
              {/* Step indicators */}
              <div className="flex items-center gap-2 text-xs">
                <div className={cn("flex items-center gap-1", workflowProgress >= 25 && "text-primary")}>
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Amount</span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <div className={cn("flex items-center gap-1", workflowProgress >= 50 && "text-primary")}>
                  <Users className="h-3 w-3" />
                  <span>Select</span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <div className={cn("flex items-center gap-1", workflowProgress >= 75 && "text-primary")}>
                  <Calculator className="h-3 w-3" />
                  <span>Allocate</span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <div className={cn("flex items-center gap-1", workflowProgress >= 100 && "text-primary")}>
                  <Target className="h-3 w-3" />
                  <span>Confirm</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      
      {/* Work Order Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Select Work Orders
            {selectedWorkOrderIds.length > 0 && (
              <Badge variant="secondary">
                {selectedWorkOrderIds.length} selected
              </Badge>
            )}
          </CardTitle>
          {selectedWorkOrderIds.length === 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Choose which work orders this receipt should be allocated to
            </p>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {workOrders.map((workOrder) => {
                const isSelected = selectedWorkOrderIds.includes(workOrder.id);
                const isSuggested = false;
                const allocation = allocations.find(a => a.work_order_id === workOrder.id);
                
                return (
                  <div
                    key={workOrder.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      isSelected && "border-primary bg-primary/5",
                      isSuggested && !isSelected && "border-blue-200 bg-blue-50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => 
                        handleWorkOrderToggle(workOrder.id, checked as boolean)
                      }
                      className={cn("mt-1", getTouchTargetClass())}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {workOrder.work_order_number}
                        </Badge>
                        {workOrder.organizations?.name && (
                          <Badge variant="secondary" className="text-xs">
                            {workOrder.organizations.initials || workOrder.organizations.name}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm">{workOrder.title}</p>
                      {workOrder.store_location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {workOrder.store_location}
                        </p>
                      )}
                    </div>
                    
                    {isSelected && (
                      <MobileAllocationControls
                        workOrder={workOrder}
                        allocation={allocation}
                        totalAmount={totalAmount}
                        onAmountChange={handleAmountChange}
                        onRemove={() => handleWorkOrderToggle(workOrder.id, false)}
                        isMobile={isMobile}
                        getTouchTargetClass={getTouchTargetClass}
                        getInputProps={getInputProps}
                        useSwipeToRemove={useSwipeToRemove}
                        hapticFeedback={hapticFeedback}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Quick Actions with Enhanced Context */}
      {selectedWorkOrderIds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Fast allocation methods for {selectedWorkOrderIds.length} selected work order{selectedWorkOrderIds.length !== 1 ? 's' : ''}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Primary actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleSplitEvenly}
                  disabled={selectedWorkOrderIds.length < 2}
                  className="flex items-center gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  {selectedWorkOrderIds.length >= 2 
                    ? `Split $${totalAmount.toFixed(2)} evenly (≈$${(totalAmount / selectedWorkOrderIds.length).toFixed(2)} each)`
                    : "Split Evenly (Select 2+ orders)"
                  }
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleAutoAllocate}
                  className="flex items-center gap-2"
                >
                  <Target className="h-4 w-4" />
                  Allocate full amount to first selected
                </Button>
                
                {allocations.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleClearAllocations}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Step 4: Allocation Summary */}
      {allocations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Allocation Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Allocated: ${summary.totalAllocated.toFixed(2)}</span>
                  <span>Remaining: ${summary.remaining.toFixed(2)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      summary.status === 'perfect' && "bg-green-500",
                      summary.status === 'over' && "bg-red-500",
                      summary.status === 'under' && "bg-blue-500",
                      summary.status === 'empty' && "bg-muted"
                    )}
                    style={{ width: `${summary.percentage}%` }}
                  />
                </div>
              </div>
              
              {/* Status indicator */}
              {summary.status === 'perfect' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Perfect! All amounts allocated correctly.
                  </AlertDescription>
                </Alert>
              )}
              
              {summary.status === 'over' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Over-allocated by ${Math.abs(summary.remaining).toFixed(2)}. Please reduce amounts.
                  </AlertDescription>
                </Alert>
              )}
              
              {summary.status === 'under' && Math.abs(summary.remaining) > 0.01 && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    ${summary.remaining.toFixed(2)} unallocated. This is okay if intentional.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <div key={index}>
                  <strong>{error.message}</strong>
                  <div className="text-sm text-muted-foreground">{error.action}</div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <div className="space-y-1 text-yellow-800">
              {validation.warnings.map((warning, index) => (
                <div key={index} className="text-sm">
                  {warning.message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
});

// Optimized mobile allocation controls component
const MobileAllocationControls = memo(function MobileAllocationControls({
  workOrder,
  allocation,
  totalAmount,
  onAmountChange,
  onRemove,
  isMobile,
  getTouchTargetClass,
  getInputProps,
  useSwipeToRemove,
  hapticFeedback
}: {
  workOrder: any;
  allocation: any;
  totalAmount: number;
  onAmountChange: (workOrderId: string, amount: number) => void;
  onRemove: () => void;
  isMobile: boolean;
  getTouchTargetClass: (baseClass?: string) => string;
  getInputProps: () => any;
  useSwipeToRemove: (workOrderId: string) => any;
  hapticFeedback: any;
}) {
  const swipeGesture = useSwipeToRemove(workOrder.id);
  
  const handleSwipeEnd = useCallback(() => {
    if (!swipeGesture.isSwipeing && swipeGesture.direction === 'left' && swipeGesture.distance > 75) {
      hapticFeedback.onSwipeAction();
      onRemove();
      swipeGesture.onReset();
    }
  }, [swipeGesture, hapticFeedback, onRemove]);

  return (
    <div 
      className={cn(
        "flex items-center gap-2 transition-transform",
        swipeGesture.isSwipeing && swipeGesture.direction === 'left' && "transform -translate-x-2"
      )}
      {...(isMobile && {
        onTouchStart: swipeGesture.onTouchStart,
        onTouchMove: swipeGesture.onTouchMove,
        onTouchEnd: (e) => {
          swipeGesture.onTouchEnd(e);
          handleSwipeEnd();
        }
      })}
    >
      <Input
        type="number"
        step="0.01"
        min="0"
        max={totalAmount}
        value={allocation?.allocated_amount || ""}
        onChange={(e) => 
          onAmountChange(workOrder.id, parseFloat(e.target.value) || 0)
        }
        placeholder="$0.00"
        className={cn(
          "text-xs",
          isMobile ? "w-24 min-h-[44px]" : "w-20",
          getTouchTargetClass()
        )}
        {...getInputProps()}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className={cn(
          "p-0",
          isMobile ? "h-11 w-11" : "h-8 w-8",
          getTouchTargetClass()
        )}
        aria-label="Remove allocation"
      >
        <X className="h-4 w-4" />
      </Button>
      
      {/* Swipe indicator for mobile */}
      {isMobile && swipeGesture.isSwipeing && swipeGesture.direction === 'left' && (
        <div className="text-xs text-muted-foreground animate-pulse">
          Swipe to remove
        </div>
      )}
    </div>
  );
});