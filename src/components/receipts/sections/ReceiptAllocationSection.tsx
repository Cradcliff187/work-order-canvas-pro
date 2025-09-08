import React, { useCallback } from "react";
import { AllocationWorkflow } from "../AllocationWorkflow";
import type { WorkOrder, WorkflowAllocation } from "@/utils/allocationWorkflow";

interface ReceiptAllocationSectionProps {
  availableWorkOrders: WorkOrder[];
  allocations: WorkflowAllocation[];
  totalAmount: number;
  vendorName: string;
  onAllocationsChange: (allocations: WorkflowAllocation[]) => void;
  showAllocationSection: boolean;
}

export function ReceiptAllocationSection({
  availableWorkOrders,
  allocations,
  totalAmount,
  vendorName,
  onAllocationsChange,
  showAllocationSection
}: ReceiptAllocationSectionProps) {
  const handleAllocationsChange = useCallback((newAllocations: WorkflowAllocation[]) => {
    onAllocationsChange(newAllocations);
  }, [onAllocationsChange]);

  if (!showAllocationSection || !availableWorkOrders || availableWorkOrders.length === 0) {
    return null;
  }

  return (
    <div data-tour="work-order-section">
      <AllocationWorkflow
        workOrders={availableWorkOrders}
        totalAmount={totalAmount}
        allocations={allocations}
        onAllocationsChange={handleAllocationsChange}
        vendor={vendorName}
      />
    </div>
  );
}