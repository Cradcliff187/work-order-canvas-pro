import React, { useState, useMemo, useCallback } from "react";
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
import { useIsMobile } from "@/hooks/use-mobile";
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
  Lightbulb,
  ChevronRight,
  Zap,
  History
} from "lucide-react";
import {
  AllocationWorkflowValidator,
  getActionButtonText,
  formatAllocationSummary,
  type WorkOrder,
  type WorkflowAllocation,
  type AllocationState
} from "@/utils/allocationWorkflow";
import { useAllocationPatterns } from "@/hooks/useAllocationPatterns";
import AllocationSuggestions from "./AllocationSuggestions";

interface AllocationWorkflowProps {
  workOrders: WorkOrder[];
  totalAmount: number;
  allocations: WorkflowAllocation[];
  onAllocationsChange: (allocations: WorkflowAllocation[]) => void;
  vendor?: string;
  className?: string;
}

export function AllocationWorkflow({
  workOrders,
  totalAmount,
  allocations,
  onAllocationsChange,
  vendor,
  className
}: AllocationWorkflowProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Selection state
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>(
    allocations.map(a => a.work_order_id)
  );
  
  // Smart suggestions state
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // Initialize validator
  const validator = useMemo(
    () => new AllocationWorkflowValidator(totalAmount, workOrders),
    [totalAmount, workOrders]
  );
  
  // Smart patterns hook
  const { suggestions: patternSuggestions, applyPattern } = useAllocationPatterns({
    workOrders,
    totalAmount,
    vendor,
    enableHaptics: !isMobile
  });
  
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
  
  // Smart work order pre-selection based on vendor/history
  const suggestedWorkOrderIds = useMemo(() => {
    if (!vendor || selectedWorkOrderIds.length > 0) return [];
    
    // Look for work orders that match vendor patterns
    const vendorLower = vendor.toLowerCase();
    if (vendorLower.includes('home depot') || vendorLower.includes('lowes')) {
      return workOrders
        .filter(wo => 
          wo.title.toLowerCase().includes('maintenance') || 
          wo.title.toLowerCase().includes('repair') ||
          wo.title.toLowerCase().includes('hvac') ||
          wo.title.toLowerCase().includes('plumbing')
        )
        .slice(0, 3) // Suggest top 3
        .map(wo => wo.id);
    }
    
    return [];
  }, [vendor, workOrders, selectedWorkOrderIds.length]);
  
  // Handle work order selection with smart suggestions
  const handleWorkOrderToggle = useCallback((workOrderId: string, checked: boolean) => {
    setSelectedWorkOrderIds(prev => {
      const newSelection = checked 
        ? [...prev, workOrderId]
        : prev.filter(id => id !== workOrderId);
      
      // Auto-remove allocations for unselected work orders
      if (!checked) {
        const updatedAllocations = allocations.filter(a => a.work_order_id !== workOrderId);
        onAllocationsChange(updatedAllocations);
      }
      
      // Hide suggestions after first manual selection
      if (checked) setShowSuggestions(false);
      
      return newSelection;
    });
  }, [allocations, onAllocationsChange]);
  
  // Apply smart suggestions
  const handleApplySuggestion = useCallback((suggestedAllocations: Array<{ work_order_id: string; allocated_amount: number }>) => {
    const workOrderIds = suggestedAllocations.map(a => a.work_order_id);
    setSelectedWorkOrderIds(workOrderIds);
    onAllocationsChange(suggestedAllocations);
    setShowSuggestions(false);
    
    toast({
      title: "Smart Suggestion Applied",
      description: `Allocated to ${suggestedAllocations.length} work orders based on patterns`,
    });
  }, [onAllocationsChange, toast]);
  
  // Handle amount changes
  const handleAmountChange = useCallback((workOrderId: string, amount: number) => {
    if (amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Amount cannot be negative",
        variant: "destructive"
      });
      return;
    }
    
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
  }, [allocations, onAllocationsChange, toast]);
  
  // Enhanced split evenly with preview
  const handleSplitEvenly = useCallback(() => {
    if (selectedWorkOrderIds.length === 0) {
      toast({
        title: "Select Work Orders First",
        description: "Please select the work orders you want to split this receipt between",
        variant: "destructive"
      });
      return;
    }
    
    const amountPerOrder = Math.round((totalAmount / selectedWorkOrderIds.length) * 100) / 100;
    const suggestedAllocations = validator.getSuggestedAllocations(selectedWorkOrderIds);
    onAllocationsChange(suggestedAllocations);
    
    toast({
      title: "Split Applied",
      description: `$${totalAmount.toFixed(2)} ÷ ${selectedWorkOrderIds.length} = $${amountPerOrder.toFixed(2)} each`,
    });
  }, [selectedWorkOrderIds, validator, onAllocationsChange, totalAmount, toast]);
  
  // Auto-allocate to first selected
  const handleAutoAllocate = useCallback(() => {
    if (selectedWorkOrderIds.length === 0) {
      toast({
        title: "Select Work Orders First",
        description: "Please select at least one work order",
        variant: "destructive"
      });
      return;
    }
    
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
  }, [selectedWorkOrderIds, workOrders, totalAmount, onAllocationsChange, toast]);
  
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
      
      {/* Smart Suggestions - Show early in workflow */}
      {showSuggestions && vendor && selectedWorkOrderIds.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4" />
            <span>Smart suggestions based on {vendor} purchases</span>
          </div>
          <AllocationSuggestions
            availableWorkOrders={workOrders}
            totalAmount={totalAmount}
            vendor={vendor}
            onApplySuggestion={handleApplySuggestion}
          />
        </div>
      )}
      
      {/* Vendor-specific pre-selection hints */}
      {suggestedWorkOrderIds.length > 0 && selectedWorkOrderIds.length === 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="flex items-center justify-between">
              <span>
                Based on previous {vendor} receipts, we recommend selecting maintenance work orders
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedWorkOrderIds(suggestedWorkOrderIds);
                  toast({
                    title: "Smart Selection Applied",
                    description: `Pre-selected ${suggestedWorkOrderIds.length} work orders for ${vendor}`,
                  });
                }}
                className="ml-2"
              >
                Auto-Select
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
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
                const isSuggested = suggestedWorkOrderIds.includes(workOrder.id);
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
                      className="mt-1"
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
                        {isSuggested && !isSelected && (
                          <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                            <Lightbulb className="h-3 w-3 mr-1" />
                            Suggested
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
                      {isSuggested && !isSelected && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <History className="h-3 w-3" />
                          Previously used for {vendor} purchases
                        </p>
                      )}
                    </div>
                    
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={totalAmount}
                          value={allocation?.allocated_amount || ""}
                          onChange={(e) => 
                            handleAmountChange(workOrder.id, parseFloat(e.target.value) || 0)
                          }
                          placeholder="$0.00"
                          className={cn("w-20 text-xs", isMobile && "w-24")}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleWorkOrderToggle(workOrder.id, false)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
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
              
              {/* Context-aware suggestions */}
              {patternSuggestions.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Pattern-based suggestions:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {patternSuggestions.slice(0, 2).map((pattern) => (
                      <Button
                        key={pattern.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const allocationsFromPattern = applyPattern(pattern.id);
                          if (allocationsFromPattern.length > 0) {
                            setSelectedWorkOrderIds(allocationsFromPattern.map(a => a.work_order_id));
                            onAllocationsChange(allocationsFromPattern);
                            toast({
                              title: "Pattern Applied",
                              description: `Applied ${pattern.name} to ${allocationsFromPattern.length} work orders`,
                            });
                          }
                        }}
                        className="text-xs h-auto py-1 px-2"
                      >
                        {pattern.name} ({Math.round(pattern.confidence * 100)}%)
                      </Button>
                    ))}
                  </div>
                </div>
              )}
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
}