import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { CompactLocationFilters } from './CompactLocationFilters';
import { ResponsiveTableContainer } from '@/components/ui/responsive-table-container';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { Badge } from '@/components/ui/badge';
import { MapPin, Edit, Trash2, Plus, Search, X } from 'lucide-react';
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh';
import { LoadingCard } from '@/components/ui/loading-states';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { cn } from '@/lib/utils';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { LOCATION_COLUMN_METADATA } from './PartnerLocationColumns';
import { exportToCSV, exportToExcel, ExportColumn } from '@/lib/utils/export';
import { TablePagination } from '@/components/admin/shared/TablePagination';
import { generateMapUrl } from '@/lib/utils/addressUtils';
import { useToast } from '@/hooks/use-toast';
import { ViewMode } from '@/hooks/useViewMode';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  PaginationState 
} from '@tanstack/react-table';
import { createLocationColumns } from './LocationColumns';

interface LocationFilters {
  search?: string;
  organization_id?: string;
  status?: 'all' | 'active' | 'inactive';
  location_ids?: string[];
}

interface PartnerLocation {
  id: string;
  location_name: string;
  location_number: string;
  organization_id: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
}

interface WorkOrderCounts {
  received: number;
  assigned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  estimate_needed: number;
  estimate_pending_approval: number;
  total: number;
}

export interface LocationTableProps {
  data: PartnerLocation[];
  workOrderCounts?: Record<string, WorkOrderCounts>;
  isLoading: boolean;
  isLoadingWorkOrders?: boolean;
  filters: LocationFilters;
  onFiltersChange: (filters: LocationFilters) => void;
  onClearFilters: () => void;
  locationOptions: { value: string; label: string }[];
  organizationMap: Record<string, any>;
  
  // View mode and mobile
  isMobile: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  
  // Row selection for bulk operations  
  rowSelection?: Record<string, boolean>;
  setRowSelection?: (selection: Record<string, boolean>) => void;
  bulkMode?: boolean;
  
  // Actions
  onEdit: (location: PartnerLocation) => void;
  onDelete: (location: PartnerLocation) => void;
  onRefresh?: () => Promise<void>;
  onAddLocation?: () => void;
  onBulkStatusChange?: (status: 'active' | 'inactive', ids: string[]) => void;
  onBulkDelete?: (ids: string[]) => void;
}

export function LocationTable({
  data,
  workOrderCounts = {},
  isLoading,
  isLoadingWorkOrders = false,
  filters,
  onFiltersChange,
  onClearFilters,
  locationOptions,
  organizationMap,
  isMobile,
  viewMode,
  onViewModeChange,
  rowSelection = {},
  setRowSelection,
  bulkMode = false,
  onEdit,
  onDelete,
  onRefresh,
  onAddLocation,
  onBulkStatusChange,
  onBulkDelete
}: LocationTableProps) {
  const { toast } = useToast();
  
  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  
  // Column visibility setup
  const { 
    columnVisibility, 
    toggleColumn, 
    resetToDefaults,
    getAllColumns,
    getVisibleColumnCount 
  } = useColumnVisibility({
    storageKey: 'admin-partner-locations-columns-v1',
    columnMetadata: LOCATION_COLUMN_METADATA,
  });

  const columnOptions = getAllColumns().map((c) => ({
    ...c,
    canHide: true, // All columns in this table can be hidden
  }));

  // Create table columns using the existing column definitions
  const columns = useMemo(() => createLocationColumns({
    organizationMap,
    workOrderCounts,
    onEdit,
    onDelete,
    bulkMode
  }), [organizationMap, workOrderCounts, onEdit, onDelete, bulkMode]);

  // Initialize table
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: bulkMode,
    getRowId: (row) => row.id,
  });

  // Export functionality
  const handleExport = (format: 'csv' | 'excel') => {
    const exportData = data.map(location => {
      const woCounts = workOrderCounts[location.id];
      return {
        'Organization': organizationMap[location.organization_id]?.name || '',
        'Location #': location.location_number,
        'Location Name': location.location_name,
        'Address': formatAddress(location),
        'City': location.city || '',
        'State': location.state || '',
        'ZIP': location.zip_code || '',
        'Contact': location.contact_name || '',
        'Email': location.contact_email || '',
        'Phone': location.contact_phone || '',
        'Status': location.is_active ? 'Active' : 'Inactive',
        'WO Received': woCounts?.received || 0,
        'WO Assigned': woCounts?.assigned || 0,
        'WO In Progress': woCounts?.in_progress || 0,
        'WO Completed': woCounts?.completed || 0,
        'WO Cancelled': woCounts?.cancelled || 0,
        'WO Est. Needed': woCounts?.estimate_needed || 0,
        'WO Total': woCounts?.total || 0,
        'Created': new Date(location.created_at).toLocaleDateString(),
      };
    });

    const columns: ExportColumn[] = [
      { key: 'Organization', label: 'Organization', type: 'string' },
      { key: 'Location #', label: 'Location #', type: 'string' },
      { key: 'Location Name', label: 'Location Name', type: 'string' },
      { key: 'Address', label: 'Address', type: 'string' },
      { key: 'City', label: 'City', type: 'string' },
      { key: 'State', label: 'State', type: 'string' },
      { key: 'ZIP', label: 'ZIP', type: 'string' },
      { key: 'Contact', label: 'Contact', type: 'string' },
      { key: 'Email', label: 'Email', type: 'string' },
      { key: 'Phone', label: 'Phone', type: 'string' },
      { key: 'Status', label: 'Status', type: 'string' },
      { key: 'WO Received', label: 'WO Received', type: 'number' },
      { key: 'WO Assigned', label: 'WO Assigned', type: 'number' },
      { key: 'WO In Progress', label: 'WO In Progress', type: 'number' },
      { key: 'WO Completed', label: 'WO Completed', type: 'number' },
      { key: 'WO Cancelled', label: 'WO Cancelled', type: 'number' },
      { key: 'WO Est. Needed', label: 'WO Est. Needed', type: 'number' },
      { key: 'WO Est. Pending', label: 'WO Est. Pending', type: 'number' },
      { key: 'WO Total', label: 'WO Total', type: 'number' },
      { key: 'Created', label: 'Created', type: 'string' },
    ];
    
    const filename = `partner-locations-${Date.now()}`;
    if (format === 'csv') {
      exportToCSV(exportData, columns, filename);
    } else {
      exportToExcel(exportData, columns, filename);
    }
    
    toast({
      title: "Export Complete",
      description: `Exported ${exportData.length} locations`
    });
  };

  // Helper functions
  const formatAddress = (location: PartnerLocation) => {
    const parts = [location.street_address, location.city, location.state, location.zip_code].filter(Boolean);
    return parts.join(', ');
  };

  const toggleRowSelection = (locationId: string) => {
    if (!setRowSelection) return;
    setRowSelection({
      ...rowSelection,
      [locationId]: !rowSelection[locationId]
    });
  };

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search?.trim()) count++;
    if (filters.organization_id && filters.organization_id !== 'all') count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.location_ids?.length) count += filters.location_ids.length;
    return count;
  }, [filters]);

  const hasFilters = activeFilterCount > 0;

  // Mobile view with pull-to-refresh
  if (isMobile) {
    return (
      <MobilePullToRefresh onRefresh={onRefresh}>
        {/* Mobile toolbar */}
        <div className="bg-muted/30 border rounded-lg p-3 space-y-3 mx-4 mt-4">
          <SmartSearchInput
            placeholder="Search..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full min-h-[44px]"
          />
          <div className="flex items-center gap-2">
            <CompactLocationFilters
              value={filters}
              onChange={onFiltersChange}
              onClear={onClearFilters}
              locationOptions={locationOptions}
            />
            {bulkMode && rowSelection && Object.keys(rowSelection).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRowSelection && setRowSelection({})}
                className="shrink-0 min-h-[44px] px-4"
              >
                Clear ({Object.keys(rowSelection).length})
              </Button>
            )}
          </div>
        </div>
        
        {/* Mobile content area */}
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-4 mt-4">
              <LoadingCard count={5} showHeader={false} />
            </div>
          ) : data.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={MapPin}
                title="No locations found"
                description={activeFilterCount > 0 
                  ? "No locations match your filters. Try adjusting your search."
                  : "No partner locations have been added yet."
                }
                action={activeFilterCount === 0 && onAddLocation ? {
                  label: "Add Location",
                  onClick: onAddLocation,
                  icon: Plus
                } : undefined}
                variant="full"
              />
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {table.getRowModel().rows.map(row => {
                const location = row.original;
                return (
                <MobileTableCard
                  key={location.id}
                  title={location.location_name}
                  subtitle={`#${location.location_number} - ${organizationMap[location.organization_id]?.name || 'Unknown Org'}`}
                  badge={
                    <Badge variant={location.is_active ? 'default' : 'secondary'}>
                      {location.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  }
                  metadata={[
                    { 
                      label: 'Address', 
                      value: formatAddress(location)
                    },
                    { 
                      label: 'Contact', 
                      value: location.contact_name || 'No contact' 
                    },
                    {
                      label: 'Work Orders',
                      value: workOrderCounts[location.id] 
                        ? `${workOrderCounts[location.id].in_progress + workOrderCounts[location.id].assigned} active, ${workOrderCounts[location.id].completed} completed`
                        : '0 active, 0 completed'
                    }
                  ]}
                  actions={[
                    { 
                      label: 'Edit', 
                      icon: Edit,
                      onClick: () => onEdit(location) 
                    },
                    { 
                      label: 'Delete', 
                      icon: Trash2,
                      onClick: () => onDelete(location), 
                      variant: 'destructive' 
                    }
                  ]}
                  selected={bulkMode && !!rowSelection[location.id]}
                  onSelect={bulkMode ? () => toggleRowSelection(location.id) : undefined}
                  onClick={() => !bulkMode && console.log('Location clicked:', location)}
                />
              );
              })}
            </div>
          )}
        </div>
      </MobilePullToRefresh>
    );
  }

  // Desktop view
  return (
    <Card className="overflow-hidden">
      {/* Desktop Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 border-b">
        {/* Left side - Title and view mode */}
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              Partner Locations
            </h2>
          </div>
          
          <ViewModeSwitcher
            value={viewMode === 'list' ? 'card' : viewMode}
            onValueChange={onViewModeChange}
            allowedModes={['table', 'card']}
            className="shrink-0"
          />
        </div>

        {/* Right side - Controls in correct order */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Clear selection (if any selected) */}
          {Object.keys(rowSelection).length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setRowSelection?.({})}
              className="shrink-0"
            >
              Clear Selection ({Object.keys(rowSelection).length})
            </Button>
          )}
          
          {/* Filters */}
          <CompactLocationFilters
            value={{
              organization_id: filters.organization_id,
              status: filters.status,
              location_ids: filters.location_ids
            }}
            onChange={(filterValue) => onFiltersChange({ ...filters, ...filterValue })}
            onClear={() => onFiltersChange({ search: filters.search })}
            locationOptions={locationOptions}
          />
          
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={filters.search || ''}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-10 pr-10 h-10"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange({ ...filters, search: '' })}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Column visibility */}
          <ColumnVisibilityDropdown
            columns={columnOptions}
            onToggleColumn={toggleColumn}
            onResetToDefaults={resetToDefaults}
            variant="outline"
            size="sm"
          />
          
          {/* Export */}
          <ExportDropdown
            onExport={handleExport}
            variant="outline"
            size="sm"
            disabled={false}
            loading={false}
          />
        </div>
      </div>

      {/* Content based on view mode */}
      <CardContent className="p-0 overflow-hidden">
        {isLoading ? (
        <div className="p-6">
          <TableSkeleton 
            rows={10} 
            columns={table.getVisibleFlatColumns().length}
          />
        </div>
      ) : data.length === 0 ? (
        viewMode === 'table' ? (
          <div className="p-0">
            <ResponsiveTableContainer>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                   ))}
                </TableHeader>
                <TableBody>
                  <EmptyTableState
                    icon={MapPin}
                    title="No partner locations"
                    description={
                      activeFilterCount > 0 
                        ? "No locations match your current filters."
                        : "Start by adding your first partner location."
                    }
                    action={activeFilterCount === 0 && onAddLocation ? {
                      label: "Add Location",
                      onClick: onAddLocation,
                      icon: Plus
                    } : undefined}
                    colSpan={getVisibleColumnCount() + (bulkMode ? 1 : 0) + 1}
                  />
                </TableBody>
              </Table>
            </ResponsiveTableContainer>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={MapPin}
              title="No partner locations"
              description={
                activeFilterCount > 0 
                  ? "No locations match your current filters."
                  : "Start by adding your first partner location."
              }
              action={activeFilterCount === 0 && onAddLocation ? {
                label: "Add Location",
                onClick: onAddLocation,
                icon: Plus
              } : undefined}
              variant="full"
            />
          </div>
        )
      ) : viewMode === 'table' ? (
        <div className="p-0 overflow-x-auto">
          <ResponsiveTableContainer>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                     {headerGroup.headers.map((header) => (
                       <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      row.getIsSelected() && "bg-muted"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        </div>
      ) : (
        /* Card view for desktop */
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {table.getRowModel().rows.map(row => {
              const location = row.original;
              const org = organizationMap[location.organization_id];
              const woCounts = workOrderCounts[location.id];
              
              return (
                <MobileTableCard
                  key={location.id}
                  title={location.location_name}
                  subtitle={`#${location.location_number} - ${org?.name || 'Unknown Org'}`}
                  badge={
                    <Badge variant={location.is_active ? 'default' : 'secondary'}>
                      {location.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  }
                  metadata={[
                    { 
                      label: 'Address', 
                      value: formatAddress(location)
                    },
                    { 
                      label: 'Contact', 
                      value: location.contact_name || 'No contact' 
                    },
                    {
                      label: 'Work Orders',
                      value: woCounts 
                        ? `${(woCounts.in_progress || 0) + (woCounts.assigned || 0)} active, ${woCounts.completed || 0} completed`
                        : '0 active, 0 completed'
                    }
                  ]}
                  actions={[
                    { 
                      label: 'Edit', 
                      icon: Edit,
                      onClick: () => onEdit(location) 
                    },
                    { 
                      label: 'Delete', 
                      icon: Trash2,
                      onClick: () => onDelete(location), 
                      variant: 'destructive' 
                    }
                  ]}
                  selected={bulkMode && !!rowSelection[location.id]}
                  onSelect={bulkMode ? () => toggleRowSelection(location.id) : undefined}
                  onClick={() => !bulkMode && console.log('Location clicked:', location)}
                />
              );
            })}
          </div>
        </div>
      )}
      </CardContent>
      
      {/* Pagination */}
      <TablePagination 
        table={table}
        totalCount={data.length}
        itemName="locations"
        isMobile={isMobile}
      />
    </Card>
  );
}