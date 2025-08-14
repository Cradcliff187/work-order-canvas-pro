import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { WorkOrderStatusBadge, FinancialStatusBadge } from '@/components/ui/status-badge';
import { useWorkOrderLifecycle } from '@/hooks/useWorkOrderLifecyclePipeline';
import { WorkOrderPipelineItem } from '@/hooks/useWorkOrderLifecyclePipeline';
import { ClipboardList, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkOrderPipelineTable() {
  const navigate = useNavigate();
  const { data: pipelineData, isLoading, isError } = useWorkOrderLifecycle();
  
  const data = useMemo(() => pipelineData || [], [pipelineData]);

  // Create operational status badge
  const getOperationalStatusBadge = (item: WorkOrderPipelineItem) => {
    let status = 'New';
    let variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'outline';
    
    switch (item.status) {
      case 'received':
        status = 'New';
        variant = 'outline';
        break;
      case 'assigned':
        status = 'Assigned';
        variant = 'secondary';
        break;
      case 'in_progress':
        status = 'In Progress';
        variant = 'default';
        break;
      case 'completed':
        if (item.report_status === 'submitted' || item.report_status === 'reviewed') {
          status = 'Reports Pending';
          variant = 'default';
        } else {
          status = 'Complete';
          variant = 'default';
        }
        break;
      default:
        status = 'New';
        variant = 'outline';
    }

    // Override with operational status if available
    if (item.operational_status) {
      switch (item.operational_status) {
        case 'on_track':
          variant = 'default';
          break;
        case 'at_risk':
          variant = 'secondary';
          break;
        case 'overdue':
          variant = 'destructive';
          break;
        case 'blocked':
          variant = 'destructive';
          break;
        case 'completed':
          variant = 'default';
          status = 'Complete';
          break;
      }
    }

    // Apply overdue styling
    if (item.is_overdue) {
      variant = 'destructive';
    }

    return (
      <Badge variant={variant} className="whitespace-nowrap">
        {status}
      </Badge>
    );
  };

  // Create partner billing status badge
  const getPartnerBillingBadge = (item: WorkOrderPipelineItem) => {
    const status = item.partner_bill_status || 'not_billed';
    let label = 'Not Billed';
    let variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'outline';

    switch (status) {
      case 'not_billed':
        label = 'Not Billed';
        variant = 'outline';
        break;
      case 'billed':
        label = 'Billed';
        variant = 'default';
        break;
      case 'paid':
        label = 'Paid';
        variant = 'default';
        break;
      default:
        label = 'Not Billed';
        variant = 'outline';
    }

    return (
      <Badge variant={variant} className="whitespace-nowrap">
        {label}
      </Badge>
    );
  };

  const columns: ColumnDef<WorkOrderPipelineItem>[] = useMemo(() => [
    {
      id: 'work_order',
      header: 'Work Order',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {item.work_order_number}
              </span>
              {item.age_days !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  {item.age_days}d
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground truncate" title={item.title}>
              {item.title}
            </div>
            <div className="text-xs text-muted-foreground">
              {item.partner_organization_name}
            </div>
            {item.store_location && (
              <div className="text-xs text-muted-foreground">
                {item.store_location}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'operational_status',
      header: 'Operational Status',
      cell: ({ row }) => getOperationalStatusBadge(row.original),
    },
    {
      id: 'subcontractor_invoice',
      header: 'Subcontractor Invoice',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="space-y-1">
            <FinancialStatusBadge status={item.financial_status} />
            {item.subcontractor_invoice_amount && (
              <div className="text-xs text-muted-foreground">
                ${item.subcontractor_invoice_amount.toLocaleString()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'partner_billing',
      header: 'Partner Billing',
      cell: ({ row }) => getPartnerBillingBadge(row.original),
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const handleRowClick = (item: WorkOrderPipelineItem) => {
    navigate(`/admin/work-orders/${item.id}`);
  };

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={ClipboardList}
            title="Error loading pipeline data"
            description="There was an error loading the work order pipeline. Please try again."
            variant="card"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Order Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No work orders found"
            description="No work orders are currently in the pipeline."
            variant="card"
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <ResponsiveTableWrapper stickyFirstColumn>
                <Table className="admin-table">
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="h-12">
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
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ResponsiveTableWrapper>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {table.getRowModel().rows.map((row) => {
                const item = row.original;
                return (
                  <MobileTableCard
                    key={row.id}
                    title={`${item.work_order_number} - ${item.title}`}
                    subtitle={`${item.partner_organization_name} • ${item.store_location || 'No location'}`}
                    status={getOperationalStatusBadge(item)}
                    onClick={() => handleRowClick(item)}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Age:</span>
                        <Badge variant="secondary" className="text-xs">
                          {item.age_days || 0} days
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Invoice:</span>
                        <FinancialStatusBadge status={item.financial_status} size="sm" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Billing:</span>
                        {getPartnerBillingBadge(item)}
                      </div>
                      {item.subcontractor_invoice_amount && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Amount:</span>
                          <span className="text-sm font-medium">
                            ${item.subcontractor_invoice_amount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </MobileTableCard>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between space-x-2 py-4 mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {table.getRowModel().rows.length} of {data.length} work orders
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 py-1 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 py-1 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}