import { useState, useCallback, useMemo } from 'react';
import { useWorkOrderPipeline, type WorkOrderSummary, type PipelineStage } from '@/hooks/useWorkOrderPipeline';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PipelineStageModal } from './PipelineStageModal';
import { PipelineActionBar } from './PipelineActionBar';
import { EnhancedPipelineStageCard } from './EnhancedPipelineStageCard';
import { AssignWorkOrderModal } from '@/components/admin/work-orders/AssignWorkOrderModal';
import { useQueryClient } from '@tanstack/react-query';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { useAdminFilters } from '@/hooks/useAdminFilters';

interface WorkOrderPipelineFilters {
  search?: string;
  operationalStatus?: string[];
  financialStatus?: string[];
  organizationId?: string;
  showOverdueOnly?: boolean;
}

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

  // Filter state management
  const { filters, setFilters, clearFilters, filterCount } = useAdminFilters<WorkOrderPipelineFilters>(
    'pipeline-filters-v1',
    { 
      search: '', 
      operationalStatus: [], 
      financialStatus: [], 
      organizationId: '', 
      showOverdueOnly: false 
    }
  );

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

  const handleClearFilters = () => {
    clearFilters();
  };

  // Filter options
  const operationalStatusOptions = [
    { value: 'new', label: 'New' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'awaiting_reports', label: 'Awaiting Reports' },
    { value: 'completed', label: 'Completed' },
  ];

  const financialStatusOptions = [
    { value: 'pending', label: 'Not Invoiced' },
    { value: 'partially_invoiced', label: 'Partially Invoiced' },
    { value: 'fully_invoiced', label: 'Fully Invoiced' },
    { value: 'overdue', label: 'Overdue' },
  ];

  // Apply filters to pipeline data
  const filteredPipelineData = useMemo(() => {
    if (!pipelineData) return null;

    const applyFiltersToStage = (stage: PipelineStage) => {
      let filteredWorkOrders = [...stage.workOrders];

      // Apply search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredWorkOrders = filteredWorkOrders.filter(wo => 
          wo.work_order_number?.toLowerCase().includes(searchLower) ||
          wo.store_location?.toLowerCase().includes(searchLower) ||
          wo.title?.toLowerCase().includes(searchLower) ||
          wo.organization_name?.toLowerCase().includes(searchLower)
        );
      }

      // Apply organization filter - Note: We'll need to implement organization filtering differently
      // since WorkOrderSummary doesn't have organization_id, only organization_name
      if (filters.organizationId) {
        // For now, filter by organization name (this would need improvement for exact matching)
        filteredWorkOrders = filteredWorkOrders.filter(wo => 
          wo.organization_name === filters.organizationId
        );
      }

      // Apply overdue filter - calculate overdue based on due_date
      if (filters.showOverdueOnly) {
        const now = new Date();
        filteredWorkOrders = filteredWorkOrders.filter(wo => {
          if (!wo.due_date) return false;
          return new Date(wo.due_date) < now;
        });
      }

      // Calculate new counts
      const totalCount = filteredWorkOrders.length;
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentCount = filteredWorkOrders.filter(wo => 
        new Date(wo.date_submitted) > yesterday
      ).length;
      
      const overdueCount = filteredWorkOrders.filter(wo => 
        wo.due_date && new Date(wo.due_date) < now
      ).length;

      return {
        ...stage,
        workOrders: filteredWorkOrders.slice(0, 5), // Keep only top 5 for display
        totalCount,
        recentCount,
        overdueCount,
      };
    };

    // Filter operational status stages
    const stageMapping: Record<string, keyof typeof pipelineData> = {
      'new': 'new',
      'assigned': 'assigned',
      'in_progress': 'inProgress',
      'awaiting_reports': 'awaitingReports',
      'completed': 'completed',
    };

    const filteredStages = Object.entries(stageMapping).reduce((acc, [statusKey, stageKey]) => {
      // If operational status filter is active, only include selected stages
      if (filters.operationalStatus && filters.operationalStatus.length > 0) {
        if (!filters.operationalStatus.includes(statusKey)) {
          // Return empty stage
          acc[stageKey] = {
            ...pipelineData[stageKey],
            workOrders: [],
            totalCount: 0,
            recentCount: 0,
            overdueCount: 0,
          };
          return acc;
        }
      }
      
      acc[stageKey] = applyFiltersToStage(pipelineData[stageKey]);
      return acc;
    }, {} as typeof pipelineData);

    return filteredStages;
  }, [pipelineData, filters]);

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

  if (!pipelineData || !filteredPipelineData) {
    return null;
  }

  const stages = [
    filteredPipelineData.new,
    filteredPipelineData.assigned,
    filteredPipelineData.inProgress,
    filteredPipelineData.awaitingReports,
    filteredPipelineData.completed,
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

      {/* Filter Bar */}
      <AdminFilterBar title="Filters" filterCount={filterCount} onClear={handleClearFilters}>
        <SmartSearchInput
          value={filters.search || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          onSearchSubmit={(q) => setFilters(prev => ({ ...prev, search: q }))}
          placeholder="Search by work order number, location, or description..."
          className="w-full"
          storageKey="pipeline-search"
        />
        <MultiSelectFilter
          options={operationalStatusOptions}
          selectedValues={filters.operationalStatus || []}
          onSelectionChange={(values) => setFilters(prev => ({ ...prev, operationalStatus: values }))}
          placeholder="All statuses"
          searchPlaceholder="Search statuses..."
        />
        <MultiSelectFilter
          options={financialStatusOptions}
          selectedValues={filters.financialStatus || []}
          onSelectionChange={(values) => setFilters(prev => ({ ...prev, financialStatus: values }))}
          placeholder="All financial statuses"
          searchPlaceholder="Search financial statuses..."
        />
        <OrganizationSelector
          value={filters.organizationId || undefined}
          onChange={(value) => setFilters(prev => ({ ...prev, organizationId: value || '' }))}
          organizationType="partner"
          placeholder="All organizations"
          className="w-full"
        />
        <div className="flex items-center space-x-2">
          <Switch
            id="overdue-only"
            checked={filters.showOverdueOnly || false}
            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showOverdueOnly: checked }))}
          />
          <Label htmlFor="overdue-only" className="text-sm font-medium">
            Show Overdue Only
          </Label>
        </div>
      </AdminFilterBar>

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