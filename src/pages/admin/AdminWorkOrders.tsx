
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaginationState, SortingState, RowSelectionState } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RotateCcw, CheckSquare } from 'lucide-react';
import { useWorkOrders, useWorkOrderMutations, WorkOrder } from '@/hooks/useWorkOrders';
import { useUnreadMessageCounts } from '@/hooks/useUnreadMessageCounts';
import { useUserProfile } from '@/hooks/useUserProfile';
import { createWorkOrderColumns, WORK_ORDER_COLUMN_METADATA } from '@/components/admin/work-orders/WorkOrderColumns';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { WorkOrderFilters } from '@/components/admin/work-orders/WorkOrderFilters';
import { BulkActionsBar } from '@/components/admin/work-orders/BulkActionsBar';
import { CreateWorkOrderModal } from '@/components/admin/work-orders/CreateWorkOrderModal';
import { AssignWorkOrderModal } from '@/components/admin/work-orders/AssignWorkOrderModal';
import { WorkOrderBreadcrumb } from '@/components/admin/work-orders/WorkOrderBreadcrumb';
import { WorkOrderTable } from '@/components/admin/work-orders/WorkOrderTable';
import { useViewMode } from '@/hooks/useViewMode';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { useToast } from '@/hooks/use-toast';
import { exportWorkOrders } from '@/lib/utils/export';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useDebounce } from '@/hooks/useDebounce';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
import { KeyboardShortcutsTooltip } from '@/components/ui/keyboard-shortcuts-tooltip';

interface WorkOrderFiltersState {
  status?: string[];
  trade_id?: string[];
  organization_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  location_filter?: string[];
}

export default function AdminWorkOrders() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, isEmployee, isAdmin } = useUserProfile();
  
  // View mode configuration
  const { viewMode, setViewMode, allowedModes } = useViewMode({
    componentKey: 'admin-work-orders',
    config: {
      mobile: ['list'],
      desktop: ['table', 'card']
    },
    defaultMode: 'table'
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<WorkOrderFiltersState>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentWorkOrders, setAssignmentWorkOrders] = useState<WorkOrder[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [useCompactCards, setUseCompactCards] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workOrderToDelete, setWorkOrderToDelete] = useState<WorkOrder | null>(null);
  const isMobile = useIsMobile();

  // Column visibility management
  const {
    columnVisibility,
    setColumnVisibility,
    toggleColumn,
    resetToDefaults,
    getAllColumns
  } = useColumnVisibility({
    storageKey: 'admin-workorders-columns',
    columnMetadata: WORK_ORDER_COLUMN_METADATA,
    defaultVisible: {
      work_order_number: true,
      title: true,
      organization: true,
      store_location: true,
      trade: true,
      status: true,
      assigned_to: true,
      date_submitted: true
    }
  });

  // Debounce search term with 300ms delay
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Pull to refresh functionality  
  const { handleRefresh, threshold } = usePullToRefresh({
    queryKey: 'work-orders',
    successMessage: 'Work orders refreshed'
  });

  // Keyboard shortcuts
  const handleSearchFocus = () => {
    const searchInput = document.getElementById('work-order-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  };

  const handleEscape = () => {
    // Close any open modals
    if (showCreateModal) setShowCreateModal(false);
    if (showAssignModal) setShowAssignModal(false);
    if (deleteDialogOpen) setDeleteDialogOpen(false);
  };

  useGlobalKeyboardShortcuts({
    onSearchFocus: handleSearchFocus,
    onEscape: handleEscape,
    disabled: isMobile,
  });

  // Transform sorting state to match the hook's expected format
  const sortingFormatted = useMemo(() => ({
    sortBy: sorting.map(sort => ({ id: sort.id, desc: sort.desc }))
  }), [sorting]);

  // Update filters when debounced search term changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      search: debouncedSearchTerm || undefined
    }));
  }, [debouncedSearchTerm]);

  // Fetch data with server-side pagination and filtering
  const { data: workOrdersData, isLoading, error, refetch, isFetching, isRefetching } = useWorkOrders(
    pagination,
    sortingFormatted,
    filters
  );

  const { deleteWorkOrder } = useWorkOrderMutations();

  // Extract work order IDs for unread message counts
  const workOrderIds = workOrdersData?.data?.map(wo => wo.id) || [];
  const { data: unreadCounts = {} } = useUnreadMessageCounts(workOrderIds, profile, isEmployee, isAdmin);

  // Fetch selected work order details for master-detail view
  const { data: selectedWorkOrder, isLoading: isLoadingDetail } = useWorkOrderDetail(
    selectedWorkOrderId || ''
  );

  // Column definitions with action handlers - Updated with proper type handling
  const columns = useMemo(() => createWorkOrderColumns({
    unreadCounts,
    onEdit: (workOrder: WorkOrder) => {
      navigate(`/admin/work-orders/${workOrder.id}/edit`);
    },
    onView: (workOrder: WorkOrder) => {
      navigate(`/admin/work-orders/${workOrder.id}`);
    },
    onDelete: (workOrder: WorkOrder) => {
      setWorkOrderToDelete(workOrder);
      setDeleteDialogOpen(true);
    },
    onAssign: (workOrder: WorkOrder) => {
      // Ensure the workOrder has the correct type structure
      const typedWorkOrder: WorkOrder = {
        ...workOrder,
        // Ensure organizations has the correct structure
        organizations: workOrder.organizations ? {
          id: workOrder.organizations.id,
          name: workOrder.organizations.name,
          contact_email: workOrder.organizations.contact_email,
          organization_type: workOrder.organizations.organization_type
        } : null
      };
      setAssignmentWorkOrders([typedWorkOrder]);
      setShowAssignModal(true);
    },
  }), [deleteWorkOrder, navigate, unreadCounts]);

  const handleClearSelection = () => {
    setRowSelection({});
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({});
    setRowSelection({});
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const handleExportAll = async (format: 'csv' | 'excel') => {
    try {
      if (!workOrdersData?.data || workOrdersData.data.length === 0) {
        toast({ title: 'No data to export', variant: 'destructive' });
        return;
      }
      exportWorkOrders(workOrdersData.data, format);
      toast({ title: `Successfully exported ${workOrdersData.data.length} work orders as ${format.toUpperCase()}` });
    } catch (error) {
      toast({ 
        title: 'Export failed', 
        description: 'Failed to export work orders. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  const handleExport = (format: 'csv' | 'excel', ids: string[]) => {
    try {
      const selectedData = workOrdersData?.data.filter(wo => ids.includes(wo.id));
      if (!selectedData || selectedData.length === 0) {
        toast({ title: 'No data to export', variant: 'destructive' });
        return;
      }
      
      exportWorkOrders(selectedData, format);
      toast({ title: `Successfully exported ${ids.length} work orders as ${format.toUpperCase()}` });
    } catch (error) {
      toast({ 
        title: 'Export failed', 
        description: 'Failed to export work orders. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  const handleBulkAssign = (ids: string[]) => {
    const workOrders = workOrdersData?.data.filter(wo => ids.includes(wo.id)) || [];
    setAssignmentWorkOrders(workOrders);
    setShowAssignModal(true);
  };

  const handleDeleteConfirm = () => {
    if (workOrderToDelete) {
      deleteWorkOrder.mutate(workOrderToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setWorkOrderToDelete(null);
        },
        onError: () => {
          setDeleteDialogOpen(false);
          setWorkOrderToDelete(null);
        }
      });
    }
  };

  // Loading overlay logic - show during operations but not initial load
  const getLoadingMessage = () => {
    if (deleteWorkOrder.isPending) return "Deleting work order...";
    if (isRefetching) return "Refreshing work orders...";
    if (isFetching && !isLoading) {
      if (debouncedSearchTerm) return "Searching work orders...";
      if (Object.keys(filters).length > 1) return "Applying filters...";
      return "Loading work orders...";
    }
    return "Loading...";
  };

  const showLoadingOverlay = deleteWorkOrder.isPending || (isFetching && !isLoading);


  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">Error loading work orders: {error.message}</p>
              <Button 
                onClick={() => refetch()} 
                variant="outline"
                aria-label="Retry loading work orders"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("p-6 space-y-6", bulkMode && Object.keys(rowSelection).length > 0 && "pb-24 sm:pb-28")}>
      {/* Breadcrumb */}
      <WorkOrderBreadcrumb />
      
      {/* Header */}
      <header className="flex justify-between items-center" role="banner" aria-label="Work orders management header">
        <div>
          <h1 className="text-2xl font-bold">Work Orders Management</h1>
          <p className="text-muted-foreground">
            {workOrdersData?.totalCount ? `${workOrdersData.totalCount} total work orders` : 'Manage all work orders across organizations'}
          </p>
          {bulkMode && (
            <p className="text-sm text-primary mt-1">
              Select work orders using checkboxes, then use the action bar below
            </p>
          )}
        </div>
        <div className="flex items-center gap-2" role="toolbar" aria-label="Work order actions">
          <KeyboardShortcutsTooltip />
          <ViewModeSwitcher
            value={viewMode}
            onValueChange={setViewMode}
            allowedModes={allowedModes}
            className="h-9"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setBulkMode(!bulkMode)}
            className={cn("h-9", bulkMode ? "border-primary text-primary" : "")}
            aria-label={bulkMode ? 'Exit bulk selection mode' : 'Enter bulk selection mode'}
            aria-pressed={bulkMode}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            {bulkMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
          </Button>
          <Button 
            size="sm" 
            onClick={() => setShowCreateModal(true)} 
            className="h-9"
            aria-label="Create new work order"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Work Order
          </Button>
        </div>
      </header>

      {/* Filters */}
      <section className="flex flex-col lg:flex-row gap-4" role="search" aria-label="Work order filters">
        <div className="flex-1">
          <WorkOrderFilters
            filters={filters}
            searchTerm={searchTerm}
            onFiltersChange={setFilters}
            onSearchChange={setSearchTerm}
            onClearFilters={handleClearFilters}
          />
        </div>
      </section>

      {/* Work Order Table */}
      <WorkOrderTable
        data={workOrdersData?.data}
        totalCount={workOrdersData?.totalCount}
        pageCount={workOrdersData?.pageCount || 0}
        isLoading={isLoading}
        columns={columns}
        pagination={pagination}
        setPagination={setPagination}
        sorting={sorting}
        setSorting={setSorting}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
        columnVisibilityColumns={getAllColumns()}
        onToggleColumn={toggleColumn}
        onResetColumns={resetToDefaults}
        viewMode={viewMode}
        allowedModes={allowedModes}
        setViewMode={setViewMode}
        bulkMode={bulkMode}
        useCompactCards={useCompactCards}
        selectedWorkOrderId={selectedWorkOrderId}
        setSelectedWorkOrderId={setSelectedWorkOrderId}
        selectedWorkOrder={selectedWorkOrder as any}
        isLoadingDetail={isLoadingDetail}
        onWorkOrderClick={(workOrder) => navigate(`/admin/work-orders/${workOrder.id}`)}
        onEdit={(workOrder) => navigate(`/admin/work-orders/${workOrder.id}/edit`)}
        onViewDetails={(workOrder) => navigate(`/admin/work-orders/${workOrder.id}`)}
        onMessage={(workOrder) => navigate(`/admin/work-orders/${workOrder.id}?tab=messages`)}
        onExportAll={handleExportAll}
        onExport={handleExport}
        onClearSelection={handleClearSelection}
        onCreateNew={() => setShowCreateModal(true)}
        isMobile={isMobile}
        onRefresh={handleRefresh}
        refreshThreshold={threshold}
      />

      {/* Bulk Actions Bar */}
      {bulkMode && (
        <BulkActionsBar
          selectedCount={Object.keys(rowSelection).length}
          selectedIds={Object.keys(rowSelection)}
          onClearSelection={handleClearSelection}
          onExport={handleExport}
          onBulkAssign={handleBulkAssign}
        />
      )}

      {/* Create Modal */}
      <CreateWorkOrderModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onWorkOrderCreated={() => refetch()}
      />

      {/* Assignment Modal */}
      <AssignWorkOrderModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setAssignmentWorkOrders([]);
        }}
        workOrders={assignmentWorkOrders}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={workOrderToDelete?.work_order_number || workOrderToDelete?.title || 'Unknown'}
        itemType="work order"
        isLoading={deleteWorkOrder.isPending}
      />

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={showLoadingOverlay}
        message={getLoadingMessage()}
      />
    </div>
  );
}
