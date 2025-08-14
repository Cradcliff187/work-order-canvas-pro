import { useState, useMemo, useEffect } from 'react';
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
  RowSelectionState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  CalendarIcon, 
  Search,
  Download,
  RotateCcw,
  Filter,
  X,
  Trash
} from 'lucide-react';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { useViewMode } from '@/hooks/useViewMode';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { useAdminReports } from '@/hooks/useAdminReports';
import { useAdminFilters } from '@/hooks/useAdminFilters';
import { useAdminReportMutations } from '@/hooks/useAdminReportMutations';
import { useSubcontractorOrganizations } from '@/hooks/useSubcontractorOrganizations';
import { useToast } from '@/hooks/use-toast';
import { useSubmittedCounts } from '@/hooks/useSubmittedCounts';
import { ReportStatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToCSV, exportToExcel, generateFilename, ExportColumn } from '@/lib/utils/export';
import { ReportsTable } from '@/components/admin/reports/ReportsTable';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { SwipeableListItem } from '@/components/ui/swipeable-list-item';
import { SortableHeader } from '@/components/admin/shared/SortableHeader';
import { WorkOrderFilters } from '@/components/admin/work-orders/WorkOrderFilters';

interface ReportFilters {
  status?: string[];
  trade_id?: string[];
  partner_organization_ids?: string[];
  completed_by?: string[]; // 'internal' and/or subcontractor org IDs
  search?: string;
  date_from?: string;
  date_to?: string;
  location_filter?: string[];
}

export default function AdminReports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // View mode configuration
  const { viewMode, setViewMode, allowedModes } = useViewMode({
    componentKey: 'admin-reports',
    config: {
      mobile: ['card'],
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

  // Persist filters using the same logic as admin work orders
  const { filters, setFilters, clearFilters, filterCount } = useAdminFilters<ReportFilters>(
    'admin-reports-filters-v2',
    {},
    { excludeKeys: ['search'] }
  );

  const { data: subcontractorOrganizations } = useSubcontractorOrganizations();
  const { reviewReport, bulkReviewReports, deleteReport } = useAdminReportMutations();
  const { data: submittedCounts } = useSubmittedCounts();

  // Debounced search for better UX
  const debouncedSearch = useDebounce(searchTerm, 300);
  const effectiveFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch || undefined,
  }), [filters, debouncedSearch]);

  const { data: reportsData, isLoading, error, refetch } = useAdminReports(
    pagination,
    sorting,
    effectiveFilters
  );

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<any>(null);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'work_orders.work_order_number',
      header: ({ column }) => <SortableHeader column={column} label="Work Order" />,
      cell: ({ row }) => {
        const workOrder = row.original.work_orders;
        return (
          <div className="font-medium">
            {workOrder?.work_order_number || 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: 'work_orders.title',
      header: ({ column }) => <SortableHeader column={column} label="Title" />,
      cell: ({ row }) => {
        const workOrder = row.original.work_orders;
        return (
          <div className="max-w-[200px] truncate">
            {workOrder?.title || 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: 'subcontractor',
      header: 'Subcontractor',
      cell: ({ row }) => {
        const subcontractor = row.original.subcontractor;
        const subcontractorOrg = row.original.subcontractor_organization;
        const submittedBy = row.original.submitted_by;
        
        // Determine what to display based on organization type
        let displayName = 'N/A';
        
        // Check if subcontractor is from internal organization
        const isInternalSubcontractor = subcontractor?.organization_members?.some(
          (om: any) => om.organizations?.organization_type === 'internal'
        );
        
        if (subcontractorOrg) {
          // Organization-level assignment - always show organization name for subcontractors
          displayName = subcontractorOrg.name;
        } else if (subcontractor && isInternalSubcontractor) {
          // Individual internal user - show their name
          displayName = `${subcontractor.first_name} ${subcontractor.last_name}`;
        } else if (subcontractor) {
          // Individual subcontractor from subcontractor org - this shouldn't happen but fallback to org name
          const subcontractorOrgFromMember = subcontractor.organization_members?.find(
            (om: any) => om.organizations?.organization_type === 'subcontractor'
          );
          displayName = subcontractorOrgFromMember?.organizations?.name || `${subcontractor.first_name} ${subcontractor.last_name}`;
        }

        return (
          <div>
            <div className="font-medium">
              {displayName}
            </div>
            {submittedBy && submittedBy.organization_members?.some((om: any) => om.organizations?.organization_type === 'internal') && (
              <div className="text-xs text-orange-600 font-medium">
                Submitted by Admin: {submittedBy.first_name} {submittedBy.last_name}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <ReportStatusBadge status={row.getValue('status')} size="sm" showIcon />,
    },
    {
      accessorKey: 'invoice_amount',
      header: ({ column }) => <SortableHeader column={column} label="Amount" />,
      cell: ({ row }) => {
        const amount = row.getValue('invoice_amount') as number;
        return amount ? `$${amount.toLocaleString()}` : 'N/A';
      },
    },
    {
      accessorKey: 'submitted_at',
      header: ({ column }) => <SortableHeader column={column} label="Submitted" />,
      cell: ({ row }) => {
        const date = row.getValue('submitted_at') as string;
        return format(new Date(date), 'MMM dd, yyyy');
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const report = row.original;
        const isSubmitted = report.status === 'submitted';
        
        const actions = [
          {
            label: 'View Details',
            icon: Eye,
            onClick: () => navigate(`/admin/reports/${report.id}`)
          },
          {
            label: 'Approve',
            icon: CheckCircle,
            onClick: () => reviewReport.mutate({ reportId: report.id, status: 'approved' }),
            show: isSubmitted
          },
          {
            label: 'Reject',
            icon: XCircle,
            onClick: () => reviewReport.mutate({ reportId: report.id, status: 'rejected' }),
            show: isSubmitted,
            variant: 'destructive' as const
          },
          {
            label: 'Delete',
            icon: Trash,
            onClick: () => handleDeleteClick(report),
            variant: 'destructive' as const
          }
        ];
        
        const reportName = `${report.work_orders?.work_order_number || 'Report'} - ${report.work_orders?.title || 'Work Order'}`;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <TableActionsDropdown actions={actions} itemName={reportName} align="end" />
          </div>
        );
      },
    },
  ], [navigate, reviewReport]);

  // Column visibility
  const columnMetadata = {
    select: { label: 'Select', defaultVisible: true },
    'work_orders.work_order_number': { label: 'Work Order', defaultVisible: true },
    'work_orders.title': { label: 'Title', defaultVisible: true },
    subcontractor: { label: 'Subcontractor', defaultVisible: true },
    status: { label: 'Status', defaultVisible: true },
    invoice_amount: { label: 'Amount', defaultVisible: true },
    submitted_at: { label: 'Submitted', defaultVisible: true },
    actions: { label: 'Actions', defaultVisible: true },
  } as const;

  const { columnVisibility, setColumnVisibility, toggleColumn, resetToDefaults, getAllColumns, getVisibleColumnCount } = useColumnVisibility({
    storageKey: 'admin-reports-columns-v1',
    columnMetadata: columnMetadata as any,
    legacyKeys: ['admin-reports-columns'],
  });

  const columnOptions = getAllColumns().map((c) => ({
    ...c,
    canHide: c.id !== 'select' && c.id !== 'actions',
  }));

const table = useReactTable({
  data: reportsData?.data || [],
  columns,
  pageCount: reportsData?.pageCount || 0,
  state: {
    pagination,
    sorting,
    rowSelection,
    columnVisibility,
  },
  getRowId: (row) => row.id,
  enableRowSelection: true,
  onRowSelectionChange: setRowSelection,
  onPaginationChange: setPagination,
  onSortingChange: setSorting,
  onColumnVisibilityChange: setColumnVisibility,
  getCoreRowModel: getCoreRowModel(),
  manualPagination: true,
  manualSorting: true,
});

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map(row => row.original.id);

  const handleFiltersChange = (newFilters: ReportFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const handleClearFilters = () => {
    clearFilters();
    setSearchTerm('');
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    bulkReviewReports.mutate({ reportIds: selectedIds, status: 'approved' });
    setRowSelection({});
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) return;
    bulkReviewReports.mutate({ reportIds: selectedIds, status: 'rejected' });
    setRowSelection({});
  };

  const handleDeleteClick = (report: any) => {
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (reportToDelete) {
      deleteReport.mutate(reportToDelete.id);
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const handleExport = (format: 'csv' | 'excel') => {
    try {
      const columns: ExportColumn[] = [
        { key: 'work_orders.work_order_number', label: 'Work Order #', type: 'string' },
        { key: 'work_orders.title', label: 'Title', type: 'string' },
        { key: 'status', label: 'Status', type: 'string' },
        { key: 'invoice_amount', label: 'Amount', type: 'currency' },
        { key: 'submitted_at', label: 'Submitted', type: 'date' },
        { key: 'subcontractor_organization.name', label: 'Subcontractor', type: 'string' },
      ];
      const data = reportsData?.data || [];
      const filename = generateFilename('reports', format === 'excel' ? 'xlsx' : 'csv');
      if (format === 'excel') {
        exportToExcel(data, columns, filename);
      } else {
        exportToCSV(data, columns, filename);
      }
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message || 'Please try again.', variant: 'destructive' });
    }
  };

  return error ? (
    <div className="p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-destructive">We couldn't load reports. Please try again.</p>
            <Button onClick={() => refetch()} variant="outline" aria-label="Retry loading reports">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  ) : (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Report Review</h1>
            {submittedCounts && submittedCounts.reportsCount > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                {submittedCounts.reportsCount} pending
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {reportsData?.totalCount ? `${reportsData.totalCount} total reports` : 'Review and approve subcontractor reports'}
          </p>
        </div>
        <div className="flex items-center gap-2" role="toolbar" aria-label="Report actions">
          <ViewModeSwitcher
            value={viewMode}
            onValueChange={setViewMode}
            allowedModes={allowedModes}
            className="h-9"
          />
        </div>
      </div>

      {/* Filters */}
      <WorkOrderFilters
        filters={filters}
        searchTerm={searchTerm}
        onFiltersChange={handleFiltersChange}
        onSearchChange={handleSearchChange}
        onClearFilters={handleClearFilters}
      />

      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedRows.length} report(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={bulkReviewReports.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkReject}
                  disabled={bulkReviewReports.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reports</CardTitle>
            <div className="flex items-center gap-2">
              <ColumnVisibilityDropdown
                columns={columnOptions}
                onToggleColumn={toggleColumn}
                onResetToDefaults={resetToDefaults}
                visibleCount={columnOptions.filter(c => c.canHide && c.visible).length}
                totalCount={columnOptions.filter(c => c.canHide).length}
              />
              <ExportDropdown onExport={handleExport} disabled={isLoading || (reportsData?.data?.length ?? 0) === 0} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ReportsTable
            table={table}
            columns={columns}
            isLoading={isLoading}
            viewMode={viewMode === 'card' ? 'card' : 'table'}
            onRowClick={(report) => navigate(`/admin/reports/${(report as any).id}`)}
            renderMobileCard={(report: any) => {
              const workOrder = report.work_orders;
              const subcontractor = report.subcontractor;
              const subcontractorOrg = report.subcontractor_organization;

              let subcontractorDisplay = 'N/A';
              const isInternalSubcontractor = subcontractor?.organization_members?.some(
                (om: any) => om.organizations?.organization_type === 'internal'
              );

              if (subcontractorOrg) {
                subcontractorDisplay = subcontractorOrg.name;
              } else if (subcontractor && isInternalSubcontractor) {
                subcontractorDisplay = `${subcontractor.first_name} ${subcontractor.last_name}`;
              } else if (subcontractor) {
                const subcontractorOrgFromMember = subcontractor.organization_members?.find(
                  (om: any) => om.organizations?.organization_type === 'subcontractor'
                );
                subcontractorDisplay = subcontractorOrgFromMember?.organizations?.name || `${subcontractor.first_name} ${subcontractor.last_name}`;
              }

              return (
                <SwipeableListItem
                  key={report.id}
                  itemName={workOrder?.work_order_number || 'Report'}
                  itemType="report"
                  leftAction={report.status === 'submitted' ? { icon: CheckCircle, label: 'Approve', color: 'success' } : { icon: Eye, label: 'View', color: 'default' }}
                  rightAction={report.status === 'submitted' ? { icon: XCircle, label: 'Reject', color: 'destructive' } : undefined}
                  onSwipeLeft={report.status === 'submitted' ? () => reviewReport.mutate({ reportId: report.id, status: 'approved' }) : undefined}
                  onSwipeRight={report.status === 'submitted' ? () => reviewReport.mutate({ reportId: report.id, status: 'rejected' }) : undefined}
                >
                  <MobileTableCard
                    key={report.id}
                    title={workOrder?.work_order_number || 'N/A'}
                    subtitle={`${workOrder?.title || 'N/A'} • ${subcontractorDisplay}`}
                    status={<ReportStatusBadge status={report.status} size="sm" showIcon />}
                    onClick={() => navigate(`/admin/reports/${report.id}`)}
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">
                        {report.invoice_amount ? `$${report.invoice_amount.toLocaleString()}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Submitted:</span>
                      <span>{format(new Date(report.submitted_at), 'MMM dd, yyyy')}</span>
                    </div>
                  </MobileTableCard>
                </SwipeableListItem>
              );
            }}
            emptyIcon={FileText}
            emptyTitle="No reports found"
            emptyDescription={Object.values(filters).some(val => val && (Array.isArray(val) ? val.length > 0 : true)) ? "Try adjusting your filters or search criteria" : "Reports will appear here when subcontractors submit them"}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={reportToDelete ? `${reportToDelete.work_orders?.work_order_number || 'Report'} - ${reportToDelete.work_orders?.title || 'Work Order'}` : ''}
        itemType="report"
        isLoading={deleteReport.isPending}
      />
    </div>
  );
}
