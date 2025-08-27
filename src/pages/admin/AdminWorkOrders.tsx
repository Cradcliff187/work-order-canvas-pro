
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaginationState, SortingState, RowSelectionState } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, RotateCcw, CheckSquare, Filter } from 'lucide-react';
import { useWorkOrders, useWorkOrderMutations, WorkOrder } from '@/hooks/useWorkOrders';
import { useUnreadMessageCounts } from '@/hooks/useUnreadMessageCounts';
import { useUserProfile } from '@/hooks/useUserProfile';
import { createWorkOrderColumns, WORK_ORDER_COLUMN_METADATA } from '@/components/admin/work-orders/WorkOrderColumns';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { WorkOrderFiltersV2, WorkOrderFiltersValue } from '@/components/admin/work-orders/WorkOrderFiltersV2';
import { BulkActionsBar } from '@/components/admin/work-orders/BulkActionsBar';
import { BulkEditModal } from '@/components/admin/work-orders/BulkEditModal';
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
import { useWorkOrderStatusTransitions } from '@/hooks/useWorkOrderStatusTransitions';
import { SmartSearchInput } from '@/components/ui/smart-search-input';


import { useAdminFilters } from '@/hooks/useAdminFilters';

export default function AdminWorkOrders() {
  // Clear corrupted localStorage on component mount
  useEffect(() => {
    localStorage.removeItem('admin-work-orders-filters-v3');
    localStorage.removeItem('billing-pipeline-filters-v3');
  }, []);

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
  const [pagination, setPagination] = useState<PaginationState>(() => {
    try {
      const saved = localStorage.getItem('admin-workorders-pagination-v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { pageIndex: 0, pageSize: 25 };
  });
  const [sorting, setSorting] = useState<SortingState>(() => {
    try {
      const saved = localStorage.getItem('admin-workorders-sorting-v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchTerm, setSearchTerm] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('admin-workorders-search-v1');
      return saved ?? '';
    } catch {
      return '';
    }
  });
  // Define initial filters with proper types
  const initialFilters: WorkOrderFiltersValue = {
    status: [],
    priority: [],
    organizations: [],
    assigned_to: [],
    trades: [],
    location_filter: [],
    date_range: undefined
  };

  // Use unified filters hook
  const { filters, setFilters, clearFilters, filterCount } = useAdminFilters<WorkOrderFiltersValue>(
    'admin-work-orders-filters-v3',
    initialFilters
  );

  // Clean and validate filters to fix corruption
  const cleanFilters = useMemo(() => {
    const cleanedFilters = { ...filters };
    
    // Fix corrupted date_range field
    if (cleanedFilters.date_range && typeof cleanedFilters.date_range === 'object' && 
        ('_type' in cleanedFilters.date_range || 'value' in cleanedFilters.date_range)) {
      console.log('🔧 Fixing corrupted date_range field:', cleanedFilters.date_range);
      cleanedFilters.date_range = undefined;
    }
    
    return cleanedFilters;
  }, [filters]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [assignmentWorkOrders, setAssignmentWorkOrders] = useState<WorkOrder[]>([]);
  const [bulkEditWorkOrders, setBulkEditWorkOrders] = useState<WorkOrder[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [useCompactCards, setUseCompactCards] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workOrderToDelete, setWorkOrderToDelete] = useState<WorkOrder | null>(null);
  const [updatingRowIds, setUpdatingRowIds] = useState<Set<string>>(new Set());
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const isMobile = useIsMobile();

  // Column visibility management
  const {
    columnVisibility,
    setColumnVisibility,
    toggleColumn,
    resetToDefaults,
    getAllColumns
  } = useColumnVisibility({
    storageKey: 'admin-workorders-columns-v1',
    columnMetadata: WORK_ORDER_COLUMN_METADATA,
    legacyKeys: ['admin-workorders-columns', 'admin-work-orders-columns'],
    defaultVisible: {
      work_order_number: true,
      title: true,
      organization: true,
      store_location: true,
      trade: true,
      priority: true,
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

  // Persist UI state
  useEffect(() => {
    try { localStorage.setItem('admin-workorders-search-v1', searchTerm || ''); } catch {}
  }, [searchTerm]);
  useEffect(() => {
    try { localStorage.setItem('admin-workorders-sorting-v1', JSON.stringify(sorting)); } catch {}
  }, [sorting]);
  useEffect(() => {
    try { localStorage.setItem('admin-workorders-pagination-v1', JSON.stringify(pagination)); } catch {}
  }, [pagination]);

  // Transform sorting state to match the hook's expected format
  const sortingFormatted = useMemo(() => ({
    sortBy: sorting.map(sort => ({ id: sort.id, desc: sort.desc }))
  }), [sorting]);


  // Transform for API compatibility
  const apiFilters = useMemo(() => ({
    ...cleanFilters,
    // Map field names for API compatibility
    partner_organization_ids: cleanFilters.organizations || [],
    trade_id: cleanFilters.trades || [],
    assigned_to: cleanFilters.assigned_to || [],
    organizations: undefined, // remove this field for API
    trades: undefined, // remove this field for API
    date_from: cleanFilters.date_range?.from,
    date_to: cleanFilters.date_range?.to,
    date_range: undefined, // remove this field for API
    search: debouncedSearchTerm || undefined
  }), [cleanFilters, debouncedSearchTerm]);

  // Update filters when debounced search term changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      search: debouncedSearchTerm || undefined
    }));
  }, [debouncedSearchTerm, setFilters]);

  // Fetch data with server-side pagination and filtering
  const { data: workOrdersData, isLoading, error, refetch, isFetching, isRefetching } = useWorkOrders(
    pagination,
    sortingFormatted,
    apiFilters
  );

  const { deleteWorkOrder, bulkUpdateWorkOrders } = useWorkOrderMutations();
  const { transitionStatus } = useWorkOrderStatusTransitions();

  // Track status updates for visual feedback
  const handleStatusUpdate = (workOrderId: string, newStatus: string, reason?: string) => {
    setUpdatingRowIds(prev => new Set([...prev, workOrderId]));
    
    transitionStatus.mutate(
      { workOrderId, newStatus: newStatus as any, reason },
      {
        onSettled: () => {
          setUpdatingRowIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(workOrderId);
            return newSet;
          });
        }
      }
    );
  };

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
    updatingRowIds,
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
  }), [deleteWorkOrder, navigate, unreadCounts, updatingRowIds]);

  const handleClearSelection = () => {
    setRowSelection({});
  };

  const handleClearFilters = () => {
    try {
      localStorage.removeItem('admin-workorders-search-v1');
    } catch {}
    setSearchTerm('');
    clearFilters();
    setRowSelection({});
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const handleSearchClear = () => {
    try {
      localStorage.removeItem('admin-workorders-search-v1');
    } catch {}
    setSearchTerm('');
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

  const handleBulkEdit = (ids: string[]) => {
    const workOrders = workOrdersData?.data.filter(wo => ids.includes(wo.id)) || [];
    setBulkEditWorkOrders(workOrders);
    setShowBulkEditModal(true);
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


  return error ? (
    <div className="p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-destructive">We couldn't load work orders. Please try again.</p>
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
  ) : (
    <div className={cn("min-h-screen bg-background w-full max-w-full p-4 md:p-6 space-y-6", bulkMode && Object.keys(rowSelection).length > 0 && "pb-24 sm:pb-28")}>
      {/* Breadcrumb */}
      <WorkOrderBreadcrumb />
      
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6" role="banner" aria-label="Work orders management header">
        <div className="min-w-0">
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
      </header>

      {/* Filters */}
      <WorkOrderFiltersV2
        value={cleanFilters}
        onChange={setFilters}
        onClear={handleClearFilters}
        filterCount={filterCount}
        config={{
          showPriority: true,
        }}
      />

      {/* Work Order Table */}
      <WorkOrderTable
        data={workOrdersData?.data}
        totalCount={workOrdersData?.totalCount}
        pageCount={workOrdersData?.pageCount || 0}
        isLoading={isLoading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search WO#, title, or location..."
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
        updatingRowIds={updatingRowIds}
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
          onBulkEdit={handleBulkEdit}
          loading={isFetching || isLoading}
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

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => {
          setShowBulkEditModal(false);
          setBulkEditWorkOrders([]);
        }}
        workOrders={bulkEditWorkOrders}
        onSave={async (changes) => {
          const workOrderIds = bulkEditWorkOrders.map(wo => wo.id);
          await bulkUpdateWorkOrders.mutateAsync({ 
            workOrderIds, 
            updates: changes 
          });
          setShowBulkEditModal(false);
          setBulkEditWorkOrders([]);
          setRowSelection({});
        }}
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
