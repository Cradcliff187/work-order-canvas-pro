import React, { useMemo, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  AlertTriangle, 
  Calculator, 
  CheckCircle2, 
  Sparkles,
  BarChart3,
  PieChart,
  Target,
  Zap,
  RotateCcw,
  DollarSign
} from "lucide-react";
import { SmartWorkOrderSelector } from "./SmartWorkOrderSelector";
import { WorkOrderSelector } from "./WorkOrderSelector";
import AllocationSuggestions from "./AllocationSuggestions";
import AllocationVisualizer from "./AllocationVisualizer";
import { useAllocationPatterns } from "@/hooks/useAllocationPatterns";
import { useAllocationCalculator } from "@/utils/allocationCalculator";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
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
  vendor?: string;
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
  vendor,
  className,
}: EnhancedAllocationPanelProps) {
  // Premium UX state
  const [visualMode, setVisualMode] = useState<'pie' | 'bar' | 'progress'>('progress');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  // Hooks for premium features
  const { onFormSave, onSubmitSuccess, onError } = useHapticFeedback();
  const allocationCalculator = useAllocationCalculator({ precision: 2 });
  const allocationPatterns = useAllocationPatterns({
    workOrders: availableWorkOrders,
    totalAmount,
    vendor,
    enableHaptics: true
  });
  
  // Enhanced allocation summary with percentages
  const allocationSummary = useMemo(() => {
    const calculationState = allocationCalculator.calculateState(
      allocations.map(a => ({ work_order_id: a.work_order_id, allocated_amount: a.allocated_amount })),
      totalAmount
    );
    
    const isValid = calculationState.isValid;
    const isOverAllocated = calculationState.remaining < -0.01;
    const isUnderAllocated = calculationState.remaining > 0.01;
    const completionPercentage = totalAmount > 0 ? (calculationState.totalAllocated / totalAmount) * 100 : 0;
    
    return {
      ...calculationState,
      isValid,
      isOverAllocated,
      isUnderAllocated,
      completionPercentage,
    };
  }, [allocations, totalAmount, allocationCalculator]);

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
    onFormSave(); // Haptic feedback
    onSingleAllocationChange(workOrderId);
  }, [onSingleAllocationChange, onFormSave]);

  // Handle suggestion application
  const handleApplySuggestion = useCallback((suggestedAllocations: Array<{ work_order_id: string; allocated_amount: number }>) => {
    const updatedAllocations = suggestedAllocations.map(alloc => ({
      work_order_id: alloc.work_order_id,
      allocated_amount: alloc.allocated_amount,
      allocation_notes: allocations.find(a => a.work_order_id === alloc.work_order_id)?.allocation_notes,
    }));
    
    onFormSave(); // Haptic feedback
    onAllocationsChange(updatedAllocations);
    
    // Check for perfect allocation
    const total = updatedAllocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);
    if (Math.abs(total - totalAmount) < 0.01) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      onSubmitSuccess(); // Success haptic
    }
  }, [allocations, onAllocationsChange, onFormSave, onSubmitSuccess, totalAmount]);

  // Quick actions
  const handleSplitEvenly = useCallback(() => {
    if (availableWorkOrders.length < 2) return;
    
    const evenAllocations = allocationPatterns.splitEvenly();
    const updatedAllocations = evenAllocations.map(alloc => ({
      work_order_id: alloc.work_order_id,
      allocated_amount: alloc.allocated_amount,
      allocation_notes: allocations.find(a => a.work_order_id === alloc.work_order_id)?.allocation_notes,
    }));
    
    onAllocationsChange(updatedAllocations);
    onFormSave();
  }, [availableWorkOrders.length, allocationPatterns, allocations, onAllocationsChange, onFormSave]);

  const handleRoundToNearest = useCallback(() => {
    const rounded = allocationCalculator.roundToNearest(
      allocations.map(a => ({ work_order_id: a.work_order_id, allocated_amount: a.allocated_amount })),
      5
    );
    
    const updatedAllocations = rounded.map(alloc => ({
      work_order_id: alloc.work_order_id,
      allocated_amount: alloc.allocated_amount,
      allocation_notes: allocations.find(a => a.work_order_id === alloc.work_order_id)?.allocation_notes,
    }));
    
    onAllocationsChange(updatedAllocations);
    onFormSave();
  }, [allocations, allocationCalculator, onAllocationsChange, onFormSave]);

  const handleDistributeRemaining = useCallback(() => {
    const distributed = allocationCalculator.distributeRemainder(
      allocations.map(a => ({ work_order_id: a.work_order_id, allocated_amount: a.allocated_amount })),
      totalAmount
    );
    
    const updatedAllocations = distributed.map(alloc => ({
      work_order_id: alloc.work_order_id,
      allocated_amount: alloc.allocated_amount,
      allocation_notes: allocations.find(a => a.work_order_id === alloc.work_order_id)?.allocation_notes,
    }));
    
    onAllocationsChange(updatedAllocations);
    onFormSave();
  }, [allocations, allocationCalculator, totalAmount, onAllocationsChange, onFormSave]);

  // Auto-suggest when conditions change
  useEffect(() => {
    if (mode === 'split' && availableWorkOrders.length >= 2 && totalAmount > 0) {
      const hasAllocations = allocations.length > 0;
      setShowSuggestions(!hasAllocations || allocationSummary.remaining > 0.01);
    }
  }, [mode, availableWorkOrders.length, totalAmount, allocations.length, allocationSummary.remaining]);

  // Confetti effect for perfect splits
  useEffect(() => {
    if (showConfetti && allocationSummary.isValid && allocations.length > 1) {
      // Trigger confetti animation
      const celebration = () => {
        // This would integrate with a confetti library
        console.log('🎉 Perfect allocation achieved!');
      };
      celebration();
    }
  }, [showConfetti, allocationSummary.isValid, allocations.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("w-full space-y-4", className)}
    >
      {/* Glass morphism card with premium styling */}
      <Card className="bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: showConfetti ? 360 : 0 }}
                transition={{ duration: 0.5 }}
              >
                <Calculator className="h-5 w-5 text-primary" />
              </motion.div>
              Work Order Assignment
              {showConfetti && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Sparkles className="h-4 w-4 text-success" />
                </motion.div>
              )}
            </CardTitle>
            
            {/* Visual mode selector for split mode */}
            {mode === 'split' && allocations.length > 0 && (
              <Select value={visualMode} onValueChange={(value: 'pie' | 'bar' | 'progress') => setVisualMode(value)}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="progress">
                    <div className="flex items-center gap-2">
                      <Target className="h-3 w-3" />
                      Progress
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-3 w-3" />
                      Pie Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-3 w-3" />
                      Bar Chart
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
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
                {/* Enhanced Allocation Summary with Progress */}
                <motion.div 
                  className="p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Total: ${totalAmount.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        Allocated: ${allocationSummary.totalAllocated.toFixed(2)}
                        {totalAmount > 0 && (
                          <span className="ml-2">
                            ({Math.round(allocationSummary.completionPercentage)}%)
                          </span>
                        )}
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
                      <AnimatePresence>
                        {allocationSummary.isValid && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <Badge variant="success" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Perfect!
                            </Badge>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  {/* Visual progress bar */}
                  <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        allocationSummary.isValid && "bg-success",
                        allocationSummary.isOverAllocated && "bg-destructive",
                        allocationSummary.isUnderAllocated && "bg-primary"
                      )}
                      style={{ 
                        width: `${Math.min(allocationSummary.completionPercentage, 100)}%` 
                      }}
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${Math.min(allocationSummary.completionPercentage, 100)}%` 
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>

                {/* Smart Suggestions Panel */}
                <AnimatePresence>
                  {showSuggestions && mode === 'split' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AllocationSuggestions
                        availableWorkOrders={availableWorkOrders}
                        totalAmount={totalAmount}
                        vendor={vendor}
                        onApplySuggestion={handleApplySuggestion}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quick Actions Bar */}
                {mode === 'split' && allocations.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSplitEvenly}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Calculator className="h-3 w-3" />
                      Split Evenly
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRoundToNearest}
                      className="flex items-center gap-1 text-xs"
                    >
                      <DollarSign className="h-3 w-3" />
                      Round to $5
                    </Button>
                    
                    {!allocationSummary.isValid && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDistributeRemaining}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Zap className="h-3 w-3" />
                        Distribute Remaining
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSuggestions(!showSuggestions)}
                      className="flex items-center gap-1 text-xs ml-auto"
                    >
                      <Sparkles className="h-3 w-3" />
                      {showSuggestions ? 'Hide' : 'Show'} Suggestions
                    </Button>
                  </motion.div>
                )}

                {/* Enhanced Validation Alert */}
                <AnimatePresence>
                  {!allocationSummary.isValid && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Alert variant={allocationSummary.isOverAllocated ? "destructive" : "default"}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {allocationSummary.isOverAllocated 
                            ? `Over-allocated by $${Math.abs(allocationSummary.remaining).toFixed(2)}`
                            : `Under-allocated by $${allocationSummary.remaining.toFixed(2)}`
                          }
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Work Order Selector */}
                <WorkOrderSelector
                  workOrders={availableWorkOrders}
                  allocations={workOrderAllocations}
                  totalAmount={totalAmount}
                  onAllocationChange={handleWorkOrderAllocationChange}
                />

                {/* Visual Allocation Summary */}
                <AnimatePresence>
                  {allocations.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AllocationVisualizer
                        workOrders={availableWorkOrders}
                        allocations={allocations.map(a => ({
                          work_order_id: a.work_order_id,
                          allocated_amount: a.allocated_amount
                        }))}
                        totalAmount={totalAmount}
                        mode={visualMode}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Empty state for split mode */}
                {allocations.length === 0 && (
                  <motion.div 
                    className="text-center py-8 text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <motion.div
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                    >
                      <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    </motion.div>
                    <p className="text-sm">Select work orders to split this receipt</p>
                    <p className="text-xs mt-1 opacity-75">
                      Use suggestions above for smart allocation
                    </p>
                  </motion.div>
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
    </motion.div>
  );
}