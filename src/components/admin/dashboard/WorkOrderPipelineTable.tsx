import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
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
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { ComputedFinancialStatusBadge, FinancialStatusBadge, ReportStatusBadge, StatusBadge } from '@/components/ui/status-badge';
import { WorkOrderPipelineItem } from '@/hooks/useWorkOrderLifecyclePipeline';
import { ClipboardList, Copy } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import { TablePagination } from '@/components/admin/shared/TablePagination';

interface WorkOrderPipelineTableProps {
  data: WorkOrderPipelineItem[];
  isLoading: boolean;
  isError: boolean;
  viewMode?: 'table' | 'card' | 'list';
  columnVisibility?: Record<string, boolean>;
  onExport?: (format: 'csv' | 'excel') => void;
  onToggleColumn?: (columnId: string) => void;
  onResetColumns?: () => void;
  columns?: Array<{
    id: string;
    label: string;
    visible: boolean;
    canHide: boolean;
  }>;
}

export function WorkOrderPipelineTable({ 
  data, 
  isLoading, 
  isError, 
  viewMode = 'table',
  columnVisibility = {},
  onExport,
  onToggleColumn,
  onResetColumns,
  columns: columnOptions = []
}: WorkOrderPipelineTableProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Helper function to get partner billing status based on workflow
  const getPartnerBillingStatus = (item: WorkOrderPipelineItem): string => {
    // Based on the 4-step workflow: Report Created → Subcontractor Invoice → Invoice Approved → Bill Partner
    if (item.status !== 'completed') {
      return 'report_pending'; // Work not completed yet
    }
    
    if (item.report_status !== 'approved') {
      return 'invoice_needed'; // Report not approved yet
    }
    
    if (item.invoice_status === 'submitted' || item.invoice_status === 'pending') {
      return 'invoice_pending'; // Has pending subcontractor invoices
    }
    
    if (item.partner_bill_status === 'billed' || item.partner_billed_at) {
      return 'billed'; // Already billed to partner
    }
    
    if (item.invoice_status === 'approved') {
      return 'ready_to_bill'; // Has approved invoices, ready to bill partner
    }
    
    return 'invoice_needed'; // Default - needs subcontractor invoice
  };

  const tableColumns: ColumnDef<WorkOrderPipelineItem>[] = useMemo(() => [
    {
      id: 'work_order_number',
      header: 'Work Order #',
      cell: ({ row }) => {
        const item = row.original;
        
        const copyToClipboard = (e: React.MouseEvent) => {
          e.stopPropagation();
          navigator.clipboard.writeText(item.work_order_number || '');
        };

        return (
          <HoverCard>
            <HoverCardTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer">
                <span className="font-medium text-foreground hover:text-primary">
                  {item.work_order_number}
                </span>
                {item.age_days !== undefined && (
                  <Badge variant={item.is_overdue ? "destructive" : "secondary"} className="text-xs">
                    {item.age_days}d
                  </Badge>
                )}
                <button 
                  onClick={copyToClipboard}
                  className="opacity-0 group-hover:opacity-100 hover:text-primary"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-[9999]">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">{item.work_order_number}</h4>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  {item.partner_organization_name} • {item.store_location || 'No location'}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-sm">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {item.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                  <Badge variant={item.is_overdue ? "destructive" : "secondary"} className="text-xs">
                    {item.age_days || 0} days old
                  </Badge>
                  {item.priority && item.priority !== 'low' && (
                    <Badge variant={item.priority === 'urgent' ? 'destructive' : 'default'} className="text-xs">
                      {item.priority.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Submitted:</span>
                  <span>{item.date_submitted ? formatDate(item.date_submitted) : 'N/A'}</span>
                </div>
                {item.due_date && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Due Date:</span>
                    <span>{formatDate(item.due_date)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Status:</span>
                  <span className="capitalize">{item.status}</span>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      },
    },
    {
      id: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const item = row.original;
        const title = item.title || 'No title';
        const isLong = title.length > 40;
        
        return isLong ? (
          <HoverCard>
            <HoverCardTrigger asChild>
              <div className="max-w-[200px] truncate cursor-pointer hover:text-primary">
                {title}
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="z-[9999]">
              <p className="text-sm">{title}</p>
            </HoverCardContent>
          </HoverCard>
        ) : (
          <div className="max-w-[200px]">{title}</div>
        );
      },
    },
    {
      id: 'partner',
      header: 'Partner',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="max-w-[150px] truncate" title={item.partner_organization_name}>
            {item.partner_organization_name}
          </div>
        );
      },
    },
    {
      id: 'location',
      header: 'Location',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="max-w-[120px] truncate text-sm text-muted-foreground" title={item.store_location}>
            {item.store_location || 'No location'}
          </div>
        );
      },
    },
    {
      id: 'completed_by',
      header: 'Completed By',
      cell: ({ row }) => {
        const { assigned_organization_type, assigned_organization_name } = row.original;
        
        if (assigned_organization_type === 'internal') {
          return <span className="text-sm font-medium">Internal</span>;
        }
        
        if (assigned_organization_type === 'subcontractor' && assigned_organization_name) {
          return (
            <div className="max-w-[120px] truncate text-sm" title={assigned_organization_name}>
              {assigned_organization_name}
            </div>
          );
        }
        
        return <span className="text-muted-foreground text-sm">Unassigned</span>;
      },
    },
    {
      id: 'operational_status',
      header: 'Work Status',
      cell: ({ row }) => <WorkOrderStatusBadge status={row.original.status} size="sm" showIcon />,
    },
    {
      id: 'report_status',
      header: 'Report Status',
      cell: ({ row }) => {
        const item = row.original;
        const reportStatus = item.report_status || 'not_submitted';
        return <ReportStatusBadge status={reportStatus} size="sm" />;
      },
    },
    {
      id: 'subcontractor_invoice',
      header: 'Subcontractor Invoice',
      cell: ({ row }) => {
        const item = row.original;
        
        const getInvoiceStatusForBadge = () => {
          if (!item.invoice_status) {
            if (item.status === 'completed' && item.report_status === 'approved') {
              return 'pending';
            }
            return 'pending';
          }
          
          switch (item.invoice_status) {
            case 'approved':
              return 'approved_for_payment';
            case 'submitted':
            case 'pending':
              return 'pending';
            default:
              return 'pending';
          }
        };
        
        const statusValue = getInvoiceStatusForBadge();
        
        return <FinancialStatusBadge status={statusValue} size="sm" showIcon />;
      },
    },
    {
      id: 'partner_billing',
      header: 'Partner Billing Status',
      cell: ({ row }) => <StatusBadge type="partnerBilling" status={getPartnerBillingStatus(row.original)} size="sm" showIcon />,
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const item = row.original;
        
        return (
          <div className="text-right">
            {item.subcontractor_invoice_amount ? (
              <span className="font-medium">
                ${item.subcontractor_invoice_amount.toLocaleString()}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </div>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
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
        <div className="flex items-center justify-between">
          <CardTitle>Work Order Pipeline</CardTitle>
          <div className="flex gap-2">
            {onExport && (
              <ExportDropdown 
                onExport={onExport} 
                variant="outline" 
                size="sm"
                disabled={isLoading || data.length === 0} 
              />
            )}
            {!isMobile && onToggleColumn && onResetColumns && (
              <ColumnVisibilityDropdown
                columns={columnOptions}
                onToggleColumn={onToggleColumn}
                onResetToDefaults={onResetColumns}
                variant="outline"
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <div className="hidden lg:block overflow-visible">
              <ResponsiveTableWrapper stickyFirstColumn className="overflow-visible relative">
                <Table className="admin-table overflow-visible relative">
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
                         className="group cursor-pointer hover:bg-muted/50"
                         onClick={() => handleRowClick(row.original)}
                       >
                         {row.getVisibleCells().map((cell) => (
                           <TableCell key={cell.id} className="py-2 h-12">
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
                    status={<WorkOrderStatusBadge status={item.status} size="sm" showIcon />}
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
                        <ComputedFinancialStatusBadge status={item.financial_status} size="sm" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Billing:</span>
                        <StatusBadge type="partnerBilling" status={getPartnerBillingStatus(item)} size="sm" showIcon />
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

            {/* Enhanced Pagination */}
            <TablePagination
              table={table}
              totalCount={data.length}
              isMobile={isMobile}
              itemName="work orders"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
