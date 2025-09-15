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
import { ResponsiveTableContainer } from '@/components/ui/responsive-table-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { Plus, ClipboardList, Search, X, Eye, Download, Send } from 'lucide-react';
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
  data: any[];
  columns: ColumnDef<any, any>[];
  isLoading?: boolean;
  error?: any;
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  columnVisibility?: VisibilityState;
  setColumnVisibility?: (visibility: VisibilityState) => void;
  onInvoiceClick: (invoice: any) => void;
  onGeneratePdf?: (invoice: any) => void;
  onSendInvoice?: (invoice: any) => void;
  onDownloadPdf?: (invoice: any) => void;
  onUpdateStatus?: (invoice: any, status: string) => void;
  onRefresh?: () => void;
  filters?: PartnerInvoiceFiltersValue;
  onFiltersChange?: (filters: PartnerInvoiceFiltersValue) => void;
  onClearFilters?: () => void;
  onExport?: (format: 'csv' | 'excel') => void;
  // Column visibility
  allColumns?: Array<{ id: string; label: string; visible: boolean; canHide: boolean }>;
  onToggleColumn?: (columnId: string) => void;
  onResetColumns?: () => void;
  // View mode
  viewMode?: 'table' | 'card' | 'list';
  setViewMode?: (mode: 'table' | 'card' | 'list') => void;
  title?: string;
  subtitle?: string;
  showCreateButton?: boolean;
  onCreateNew?: () => void;
  isMobile?: boolean;
  filterComponent?: React.ReactNode;
}

export function PartnerInvoicesTable({
  data,
  columns,
  isLoading = false,
  error,
  pagination,
  setPagination,
  sorting,
  setSorting,
  columnVisibility = {},
  setColumnVisibility,
  onInvoiceClick,
  onGeneratePdf,
  onSendInvoice,
  onDownloadPdf,
  onUpdateStatus,
  onRefresh,
  filters = {},
  onFiltersChange,
  onClearFilters,
  onExport,
  allColumns = [],
  onToggleColumn,
  onResetColumns,
  viewMode = 'table',
  setViewMode,
  title = 'Partner Invoices',
  subtitle,
  showCreateButton = true,
  onCreateNew,
  isMobile = false,
  filterComponent
}: PartnerInvoicesTableProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(invoice => {
      const searchLower = searchTerm.toLowerCase();
      
      // Search basic invoice fields
      const basicMatch = 
        invoice.invoice_number?.toLowerCase().includes(searchLower) ||
        invoice.partner_organization?.name?.toLowerCase().includes(searchLower);
      
      // Search work order details from all sources
      const workOrderMatch = invoice.work_orders?.some(wo => 
        wo.work_orders?.work_order_number?.toLowerCase().includes(searchLower) ||
        wo.work_orders?.title?.toLowerCase().includes(searchLower) ||
        wo.work_orders?.store_location?.toLowerCase().includes(searchLower) ||
        wo.work_orders?.street_address?.toLowerCase().includes(searchLower) ||
        wo.work_orders?.city?.toLowerCase().includes(searchLower) ||
        wo.work_orders?.state?.toLowerCase().includes(searchLower) ||
        wo.work_orders?.description?.toLowerCase().includes(searchLower)
      );
      
      return basicMatch || workOrderMatch;
    });
  }, [data, searchTerm]);

  // Initialize table
  const table = useReactTable({
    data: filteredData,
    columns,
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
    },
    manualPagination: false,
    getRowId: (row) => row.id,
  });

  // Clear search
  const clearSearch = () => setSearchTerm('');


  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={ClipboardList}
            title="Unable to load invoices"
            description="There was an error loading the invoice data. Please try again."
            action={
              showCreateButton && onCreateNew ? {
                label: "Try Again",
                onClick: onCreateNew
              } : undefined
            }
          />
        </CardContent>
      </Card>
    );
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-4">
        <MobilePullToRefresh onRefresh={onRefresh}>
          {/* Mobile header */}
          <div className="flex flex-col gap-3 p-4 bg-background border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{title}</h2>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              {showCreateButton && onCreateNew && (
                <Button onClick={onCreateNew} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              )}
            </div>
            
            {/* Mobile search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Mobile filters */}
            {filterComponent && (
              <div className="w-full">
                {filterComponent}
              </div>
            )}

          </div>

          {/* Mobile content */}
          {isLoading ? (
            <EnhancedTableSkeleton />
          ) : filteredData.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No invoices found"
              description="There are no partner invoices to display."
              action={
                showCreateButton && onCreateNew ? {
                  label: "Create Invoice",
                  onClick: onCreateNew,
                  icon: Plus
                } : undefined
              }
            />
          ) : (
            <div className="space-y-2 p-4">
              {table.getRowModel().rows.map((row) => {
                const invoice = row.original;
                return (
                  <MobileTableCard
                    key={row.id}
                    title={invoice.invoice_number}
                    subtitle={invoice.partner_organization?.name || 'Unknown Partner'}
                    badge={<InvoiceStatusBadge status={invoice.status} />}
                    onClick={() => onInvoiceClick(invoice)}
                    metadata={[
                      { label: 'Due', value: invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'No due date' },
                      { label: 'Amount', value: formatCurrency(invoice.total_amount || 0) }
                    ]}
                  />
                );
              })}
            </div>
          )}
        </MobilePullToRefresh>
      </div>
    );
  }

  // Desktop view
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left side - Title and view mode */}
          <div className="flex items-center gap-4">
            <div className="min-w-0">
              <CardTitle className="text-lg font-semibold leading-none tracking-tight">{title}</CardTitle>
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            
            {setViewMode && (
              <ViewModeSwitcher
                value={viewMode}
                onValueChange={setViewMode}
                allowedModes={['table', 'card']}
                className="shrink-0"
              />
            )}
          </div>

          {/* Right side - Search and Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9 w-64"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {onToggleColumn && onResetColumns && (
              <ColumnVisibilityDropdown
                columns={allColumns}
                onToggleColumn={onToggleColumn}
                onResetToDefaults={onResetColumns}
              />
            )}
            
            {onExport && (
              <ExportDropdown
                onExport={onExport}
                disabled={filteredData.length === 0}
              />
            )}
            
            {showCreateButton && onCreateNew && (
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            )}
          </div>
        </div>

      </CardHeader>

      <CardContent>
        {isLoading ? (
          <EnhancedTableSkeleton />
        ) : filteredData.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No invoices found"
            description="There are no partner invoices to display."
            action={
              showCreateButton && onCreateNew ? {
                label: "Create Invoice",
                onClick: onCreateNew,
                icon: Plus
              } : undefined
            }
          />
        ) : (
          <>
            {/* Table View */}
            {viewMode === 'table' && (
              <ResponsiveTableContainer>
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                           <TableHead 
                            key={header.id}
                            style={{
                              width: header.getSize() !== 150 ? header.getSize() : undefined,
                            }}
                           >
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
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() ? "selected" : undefined}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => onInvoiceClick(row.original)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell 
                              key={cell.id}
                              style={{
                                textAlign: (cell.column.columnDef.meta as any)?.align || 'left',
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ResponsiveTableContainer>
            )}

            {/* Card View */}
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const invoice = row.original;
                    return (
                      <MobileTableCard
                        key={invoice.id}
                        title={invoice.invoice_number}
                        subtitle={invoice.partner_organization?.name || 'Unknown Partner'}
                        badge={<InvoiceStatusBadge status={invoice.status} />}
                        onClick={() => onInvoiceClick(invoice)}
                        metadata={[
                          { label: 'Date', value: invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') : 'No date' },
                          { label: 'Due Date', value: invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'No due date' },
                          { label: 'Amount', value: formatCurrency(invoice.total_amount || 0) }
                        ]}
                        actions={[
                          { label: 'View', icon: Eye, onClick: () => onInvoiceClick(invoice) },
                          ...(onDownloadPdf ? [{ label: 'Download PDF', icon: Download, onClick: () => onDownloadPdf(invoice) }] : []),
                          ...(onSendInvoice ? [{ label: 'Send', icon: Send, onClick: () => onSendInvoice(invoice) }] : [])
                        ]}
                      />
                    );
                  })
                ) : (
                  <div className="col-span-full">
                    <EmptyState
                      icon={ClipboardList}
                      title="No invoices found"
                      description="There are no partner invoices to display."
                      action={
                        showCreateButton && onCreateNew ? {
                          label: "Create Invoice",
                          onClick: onCreateNew,
                          icon: Plus
                        } : undefined
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}