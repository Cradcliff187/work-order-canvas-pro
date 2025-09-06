import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getSortedRowModel, 
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  PaginationState,
  SortingState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { Plus, ClipboardList, Search, X } from 'lucide-react';
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
// Simple type for partner invoice filters
type PartnerInvoiceFiltersValue = {
  status?: string[];
  partner_organization_id?: string[];
  date_from?: string;
  date_to?: string;
  amount_min?: string;
  amount_max?: string;
};
import { InvoiceStatusBadge } from '@/components/admin/partner-billing/InvoiceStatusBadge';
import { formatCurrency } from '@/utils/formatting';
import { format } from 'date-fns';

interface PartnerInvoicesTableProps {
  // Data
  data: any[] | undefined;
  totalCount?: number;
  pageCount?: number;
  isLoading: boolean;
  
  // Filter Component
  filterComponent?: React.ReactNode;
  filterCount?: number;
  
  // Table Configuration
  columns: ColumnDef<any>[];
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  rowSelection: RowSelectionState;
  setRowSelection: (selection: RowSelectionState) => void;
  columnVisibility?: VisibilityState;
  setColumnVisibility?: (visibility: VisibilityState) => void;
  columnVisibilityColumns?: Array<{
    id: string;
    label: string;
    description?: string;
    visible: boolean;
    canHide: boolean;
  }>;
  onToggleColumn?: (columnId: string) => void;
  onResetColumns?: () => void;
  
  // View Configuration
  viewMode: 'table' | 'card' | 'list';
  setViewMode: (mode: 'table' | 'card' | 'list') => void;
  bulkMode: boolean;
  
  // Callbacks
  onInvoiceClick: (invoice: any) => void;
  onExportAll: (format: 'csv' | 'excel') => void;
  onExport: (format: 'csv' | 'excel', ids: string[]) => void;
  
  // Mobile specific
  isMobile: boolean;
  onRefresh?: () => Promise<void>;
  refreshThreshold?: number;
}

export function PartnerInvoicesTable({
  data,
  totalCount,
  pageCount,
  isLoading,
  filterComponent,
  columns,
  pagination,
  setPagination,
  sorting,
  setSorting,
  rowSelection,
  setRowSelection,
  columnVisibility,
  setColumnVisibility,
  columnVisibilityColumns,
  onToggleColumn,
  onResetColumns,
  viewMode,
  setViewMode,
  bulkMode,
  onInvoiceClick,
  onExportAll,
  onExport,
  isMobile,
  onRefresh,
  refreshThreshold = 60,
}: PartnerInvoicesTableProps) {
  // Internal search state
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered and searchable data
  const filteredInvoices = useMemo(() => {
    if (!data) return [];
    
    return data.filter(invoice => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          invoice.invoice_number?.toLowerCase().includes(searchLower) ||
          invoice.partner_organization?.name?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [data, searchTerm]);

  // React Table configuration
  const table = useReactTable({
    data: filteredInvoices,
    columns,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map(row => row.original.id);

  // Render mobile view
  if (isMobile) {
    return (
      <MobilePullToRefresh onRefresh={onRefresh} threshold={refreshThreshold}>
        <div className="space-y-4">
          {/* Mobile Toolbar */}
          <div className="bg-muted/30 border rounded-lg p-3 space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 h-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Filter and bulk actions row */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {/* Filters - Make filter button full width on mobile */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {filterComponent}
              </div>

              {/* Bulk mode actions */}
              {bulkMode && selectedIds.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRowSelection({})}
                  className="shrink-0 h-9 px-3 text-xs"
                >
                  Clear ({selectedIds.length})
                </Button>
              )}
            </div>
          </div>

          {!data?.length ? (
            <EmptyState
              icon={ClipboardList}
              title="No invoices found"
              description={totalCount === 0 
                ? "No invoices have been created yet. Create your first invoice to get started."
                : "No invoices match your current filters. Try adjusting your search criteria."
              }
              action={totalCount === 0 ? {
                label: "Create Invoice",
                onClick: () => console.log('Create invoice'),
                icon: Plus
              } : undefined}
            />
          ) : (
            <div className="space-y-4">
              {table.getRowModel().rows.map((row) => {
                const invoice = row.original;

                if (bulkMode) {
                  return (
                    <div key={row.original.id} className="relative">
                      <MobileTableCard
                        title={invoice.invoice_number}
                        subtitle={invoice.partner_organization?.name || 'Unknown Partner'}
                        badge={<InvoiceStatusBadge status={invoice.status} />}
                        onClick={() => onInvoiceClick(invoice)}
                        metadata={[
                          { label: 'Due', value: invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'No due date' },
                          { label: 'Amount', value: formatCurrency(invoice.total_amount || 0) },
                        ]}
                      />
                      <div className="absolute top-2 right-2">
                        <input
                          type="checkbox"
                          checked={row.getIsSelected()}
                          onChange={row.getToggleSelectedHandler()}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 scale-125"
                          aria-label={`Select invoice ${invoice.invoice_number}`}
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <MobileTableCard
                    key={row.original.id}
                    title={invoice.invoice_number}
                    subtitle={invoice.partner_organization?.name || 'Unknown Partner'}
                    badge={<InvoiceStatusBadge status={invoice.status} />}
                    onClick={() => onInvoiceClick(invoice)}
                    metadata={[
                      { label: 'Due', value: invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'No due date' },
                      { label: 'Amount', value: formatCurrency(invoice.total_amount || 0) },
                    ]}
                  />
                );
              })}
            </div>
          )}
        </div>
      </MobilePullToRefresh>
    );
  }

  // Render desktop view
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Partner Invoices</CardTitle>
          <ViewModeSwitcher
            value={viewMode}
            onValueChange={setViewMode}
            allowedModes={['table', 'card', 'list']}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Filter row */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            {/* Selection clear */}
            {selectedRows.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setRowSelection({})}
                className="shrink-0"
              >
                Clear Selection ({selectedRows.length})
              </Button>
            )}

            {/* Filters */}
            {filterComponent}

            {/* Search */}
            <div className="relative flex-1 max-w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 h-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Column visibility */}
            {columnVisibilityColumns && onToggleColumn && onResetColumns && (
              <ColumnVisibilityDropdown
                columns={columnVisibilityColumns}
                onToggleColumn={onToggleColumn}
                onResetToDefaults={onResetColumns}
                variant="outline"
                size="sm"
              />
            )}

            {/* Export */}
            <ExportDropdown
              onExport={onExportAll}
              variant="outline"
              size="sm"
              disabled={isLoading || !(data && data.length > 0)}
              loading={isLoading}
            />
          </div>
        </div>

        {/* Table content */}
        <div className="p-6">
          {isLoading ? (
            <EnhancedTableSkeleton rows={5} columns={7} />
          ) : data?.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No invoices found"
              description="Try adjusting your filters or search criteria"
              action={{
                label: "Create Invoice",
                onClick: () => console.log('Create invoice'),
                icon: Plus
              }}
              variant="card"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {bulkMode && (
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={table.getIsAllPageRowsSelected()}
                            onChange={table.getToggleAllPageRowsSelectedHandler()}
                            className="rounded border-gray-300"
                            aria-label="Select all invoices"
                          />
                        </TableHead>
                      )}
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => {
                      const invoice = row.original;
                      return (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() ? "selected" : undefined}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => onInvoiceClick(invoice)}
                        >
                          {bulkMode && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={row.getIsSelected()}
                                onChange={row.getToggleSelectedHandler()}
                                className="rounded border-gray-300"
                                aria-label={`Select invoice ${invoice.invoice_number}`}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-mono">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>
                            {invoice.partner_organization?.name || 'Unknown Partner'}
                          </TableCell>
                          <TableCell>
                            {invoice.invoice_date 
                              ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') 
                              : 'No date'}
                          </TableCell>
                          <TableCell>
                            {invoice.due_date 
                              ? format(new Date(invoice.due_date), 'MMM dd, yyyy') 
                              : 'No due date'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(invoice.total_amount || 0)}
                          </TableCell>
                          <TableCell>
                            <InvoiceStatusBadge status={invoice.status} />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInvoiceClick(invoice);
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={bulkMode ? 8 : 7} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}