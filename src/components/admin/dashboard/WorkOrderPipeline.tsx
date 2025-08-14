import { useState, useCallback } from 'react';
import { useWorkOrderPipeline, type WorkOrderSummary, type PipelineStage } from '@/hooks/useWorkOrderPipeline';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineStageModal } from './PipelineStageModal';
import { PipelineActionBar } from './PipelineActionBar';
import { EnhancedPipelineStageCard } from './EnhancedPipelineStageCard';
import { AssignWorkOrderModal } from '@/components/admin/work-orders/AssignWorkOrderModal';
import { useQueryClient } from '@tanstack/react-query';



function PipelineSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="text-center">
              <Skeleton className="h-8 w-12 mx-auto" />
            </div>
            <div className="flex justify-center gap-2">
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function WorkOrderPipeline() {
  const { data: pipelineData, isLoading, error, refetch } = useWorkOrderPipeline();
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [unassignedWorkOrders, setUnassignedWorkOrders] = useState<WorkOrderSummary[]>([]);

  const handleStageClick = (stage: PipelineStage) => {
    setSelectedStage(stage);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedStage(null);
  };

  const handleRefresh = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['workOrderPipeline'] });
  }, [refetch, queryClient]);

  const handleAssignPending = useCallback(() => {
    if (!pipelineData) return;
    
    // For now, collect work orders from New stage (these are typically unassigned)
    const unassigned: WorkOrderSummary[] = [
      ...pipelineData.new.workOrders
    ];
    
    setUnassignedWorkOrders(unassigned);
    setShowBulkAssignModal(true);
  }, [pipelineData]);

  const handleBulkAssignClose = () => {
    setShowBulkAssignModal(false);
    setUnassignedWorkOrders([]);
    // Refresh data after assignment
    handleRefresh();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PipelineActionBar isLoading />
        <PipelineSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-destructive">
            Failed to load pipeline data. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pipelineData) {
    return null;
  }

  const stages = [
    pipelineData.new,
    pipelineData.assigned,
    pipelineData.inProgress,
    pipelineData.awaitingReports,
    pipelineData.completed,
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Quick Action Bar */}
      <PipelineActionBar 
        pipelineData={pipelineData}
        isLoading={isLoading}
        onAssignPending={handleAssignPending}
        onRefresh={handleRefresh}
      />

      {/* Pipeline Stages */}
      <>
        {/* Desktop and tablet grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {stages.map((stage) => (
            <EnhancedPipelineStageCard
              key={stage.stageName}
              stage={stage}
              onClick={() => handleStageClick(stage)}
            />
          ))}
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="md:hidden">
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {stages.map((stage) => (
              <div key={stage.stageName} className="flex-shrink-0 w-40">
                <EnhancedPipelineStageCard
                  stage={stage}
                  onClick={() => handleStageClick(stage)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Modal for work order details */}
        <PipelineStageModal
          stage={selectedStage}
          isOpen={isModalOpen}
          onClose={handleModalClose}
        />

        {/* Bulk Assignment Modal - Note: This needs full WorkOrder objects, not WorkOrderSummary */}
        {/* For now, disable this until we can fetch full work order data */}
        {showBulkAssignModal && unassignedWorkOrders.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Bulk Assignment</h3>
              <p className="text-muted-foreground mb-4">
                Found {unassignedWorkOrders.length} unassigned work orders. 
                Please navigate to the work orders page to assign them.
              </p>
              <button 
                onClick={handleBulkAssignClose}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    </div>
  );
}