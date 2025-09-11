import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { SortableHeader } from '@/components/admin/shared/SortableHeader';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { ComputedFinancialStatusBadge, FinancialStatusBadge, ReportStatusBadge, StatusBadge } from '@/components/ui/status-badge';
import { WorkOrderPipelineItem } from '@/hooks/useWorkOrderLifecyclePipeline';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ClipboardList, Copy, Info } from 'lucide-react';
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
  isMobile?: boolean;
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
  columns: columnOptions = [],
  isMobile: isMobileProp = false
}: WorkOrderPipelineTableProps) {
  const navigate = useNavigate();
  const isMobileDevice = useIsMobile();

  // Add state for sorting
  const [sortingState, setSortingState] = useState<SortingState>([
    {
      id: 'work_order_number',
      desc: true
    }
  ]);

  // Helper function to get partner billing status based on workflow
  const getPartnerBillingStatus = (item: WorkOrderPipelineItem): string => {
    // If work not completed → "Work Pending"
    if (item.status !== 'completed') {
      return 'work_pending';
    }
    
    // If report not approved → "Report Pending"  
    if (item.report_status !== 'approved') {
      return 'report_pending';
    }
    
    // Check if internal work with bill amount ready
    const isInternalWork = item.assigned_organization_type === 'internal';
    if (!item.invoice_status && !isInternalWork) {
      return 'bill_needed';  // Subcontractor needs to submit bill
    }
    if (!item.invoice_status && isInternalWork && item.report_status === 'approved') {
      // Check if report has bill_amount
      if (item.bill_amount && item.bill_amount > 0) {
        return 'ready';  // Internal work ready to invoice
      }
      return 'bill_needed';  // Internal report needs cost added
    }
    
    // If bill pending (submitted) → "Bill Pending"
    if (item.invoice_status === 'submitted') {
      return 'bill_pending';
    }
    
    // If partner_bill_status='billed' → "Invoiced"
    if (item.partner_bill_status === 'billed') {
      return 'billed';
    }
    
    // If bill approved & partner_bill_status='ready' → "Ready to Invoice"
    if (item.invoice_status === 'approved' && item.partner_bill_status === 'ready') {
      return 'ready';
    }
    
    // Default fallback
    return 'bill_needed';
  };

  const tableColumns: ColumnDef<WorkOrderPipelineItem>[] = useMemo(() => [
    {
      id: 'work_order_number',
      accessorKey: 'work_order_number',
      header: ({ column }) => <SortableHeader column={column} label="WO #" />,
      size: 150,
      cell: ({ row }) => {
        const item = row.original;
        
        const copyToClipboard = (e: React.MouseEvent) => {
          e.stopPropagation();
          navigator.clipboard.writeText(item.work_order_number || '');
        };

        return (
          <div className="flex items-center gap-1.5">
            <HoverCard>
              <HoverCardTrigger asChild>
                <span className="font-mono text-sm font-medium tracking-tight cursor-pointer hover:text-primary transition-colors">
                  {item.work_order_number}
                </span>
              </HoverCardTrigger>
              <HoverCardContent 
                className="z-[99999] w-[400px] max-w-[90vw] p-4 bg-popover border shadow-lg" 
                align="start" 
                side="right"
                sideOffset={5}
              >
                <div className="space-y-3">
                  {/* Work Order Number */}
                  <div className="font-mono font-semibold text-primary">
                    {item.work_order_number}
                  </div>
                  
                  {/* Title */}
                  {item.title && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Title</div>
                      <div className="text-sm font-medium">{item.title}</div>
                    </div>
                  )}
                  
                  {/* Description - the original issue */}
                  {item.description && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Description</div>
                      <div className="text-sm text-foreground whitespace-pre-wrap">
                        {item.description}
                      </div>
                    </div>
                  )}
                  
                  {/* If no description or title */}
                  {!item.title && !item.description && (
                    <div className="text-sm text-muted-foreground italic">
                      No details available
                    </div>
                  )}
                  
                  {/* Copy button */}
                  <button 
                    onClick={copyToClipboard}
                    className="text-xs text-primary hover:underline flex items-center gap-1 pt-2 border-t"
                  >
                    <Copy className="h-3 w-3" />
                    Copy WO# to clipboard
                  </button>
                </div>
              </HoverCardContent>
            </HoverCard>
            
            {item.age_days !== undefined && (
              <Badge 
                variant={item.is_overdue ? 'destructive' : 'outline'} 
                className="h-4 text-[10px] px-1 tabular-nums shrink-0"
              >
                {item.age_days}d
              </Badge>
            )}
          </div>
        );
      }
    },
    {
      id: 'partner',
      accessorKey: 'partner_organization_name',
      header: ({ column }) => <SortableHeader column={column} label="Partner" />,
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
      accessorKey: 'store_location',
      header: ({ column }) => <SortableHeader column={column} label="Location" />,
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
      accessorKey: 'assigned_organization_name',
      header: ({ column }) => <SortableHeader column={column} label="Completed By" />,
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
      accessorKey: 'status',
      header: ({ column }) => <SortableHeader column={column} label="Work Status" />,
      cell: ({ row }) => <WorkOrderStatusBadge status={row.original.status} size="sm" showIcon />,
    },
    {
      id: 'report_status',
      accessorKey: 'report_status',
      header: ({ column }) => <SortableHeader column={column} label="Report Status" />,
      cell: ({ row }) => {
        const item = row.original;
        const reportStatus = item.report_status || 'not_submitted';
        return <ReportStatusBadge status={reportStatus} size="sm" showIcon />;
      },
    },
    {
      id: 'subcontractor_invoice',
      accessorKey: 'invoice_status',
      header: ({ column }) => <SortableHeader column={column} label="Subcontractor Bill" />,
      cell: ({ row }) => {
        const item = row.original;
        
        const getBillStatus = () => {
          if (!item.invoice_status) return 'not_billed';
          
          switch (item.invoice_status) {
            case 'submitted':
              return 'pending';
            case 'approved':
              return 'approved';
            case 'paid':
              return 'paid';
            default:
              return 'pending';
          }
        };
        
        const statusValue = getBillStatus();
        
        return <FinancialStatusBadge status={statusValue} size="sm" showIcon />;
      },
    },
    {
      id: 'partner_invoicing',
      accessorKey: 'partner_bill_status',
      header: ({ column }) => <SortableHeader column={column} label="Partner Invoicing Status" />,
      cell: ({ row }) => <StatusBadge type="partnerBilling" status={getPartnerBillingStatus(row.original)} size="sm" showIcon />,
    },
    {
      id: 'subcontractor_bill',
      accessorKey: 'subcontractor_bill_amount',
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <SortableHeader column={column} label="Sub Bill" />
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Amount billed by the subcontractor for this work order</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const amount = item.subcontractor_bill_amount;
        
        return (
          <div className="text-right font-mono text-sm">
            {amount ? (
              <span className="font-medium">
                ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'partner_invoice',
      accessorKey: 'partner_billed_amount',
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <SortableHeader column={column} label="Partner Invoice" />
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Amount to invoice the partner (includes markup)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ),
      cell: ({ row }) => {
        const item = row.original;
        
        // Use actual partner billed amount if available
        if (item.partner_billed_amount) {
          return (
            <div className="text-right font-mono text-sm">
              <span className="font-medium">
                ${item.partner_billed_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="text-xs text-muted-foreground">
                (Invoiced)
              </div>
            </div>
          );
        }
        
        // Calculate estimated amount using the work order's actual markup
        if (item.subcontractor_bill_amount && item.internal_markup_percentage) {
          const estimatedAmount = item.subcontractor_bill_amount * (1 + item.internal_markup_percentage / 100);
          return (
            <div className="text-right font-mono text-sm">
              <span className="font-medium text-blue-600 dark:text-blue-400">
                ${estimatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="text-xs text-muted-foreground">
                (Est. {item.internal_markup_percentage}% markup)
              </div>
            </div>
          );
        }
        
        return <span className="text-muted-foreground text-sm">—</span>;
      },
    },
    {
      id: 'profit_margin',
      accessorFn: (row) => {
        if (!row.subcontractor_bill_amount) return 0;
        const partnerAmount = row.partner_billed_amount || 
          (row.subcontractor_bill_amount * (1 + (row.internal_markup_percentage || 30) / 100));
        return partnerAmount - row.subcontractor_bill_amount;
      },
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <SortableHeader column={column} label="Gross Margin" />
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Profit margin (partner invoice - subcontractor bill)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ),
      cell: ({ row }) => {
        const item = row.original;
        
        if (!item.subcontractor_bill_amount) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        
        // Use actual or calculated partner amount
        const partnerAmount = item.partner_billed_amount || 
          (item.subcontractor_bill_amount * (1 + (item.internal_markup_percentage || 30) / 100));
        
        const profit = partnerAmount - item.subcontractor_bill_amount;
        const marginPercent = (profit / partnerAmount) * 100;
        
        // Show different colors based on margin health
        const marginColor = marginPercent >= 25 ? 'text-green-600 dark:text-green-400' :
                            marginPercent >= 15 ? 'text-blue-600 dark:text-blue-400' :
                            marginPercent >= 10 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400';
        
        return (
          <div className="text-right text-sm">
            <div className={`font-medium ${marginColor}`}>
              ${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">
              {marginPercent.toFixed(1)}% margin
            </div>
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
      sorting: [
        {
          id: 'work_order_number',
          desc: true // Sort by newest work orders first
        }
      ]
    },
    state: {
      sorting: sortingState,
    },
    onSortingChange: setSortingState,
  });

  const handleRowClick = (item: WorkOrderPipelineItem) => {
    const currentPath = window.location.pathname;
    const queryParams = currentPath.includes('billing-dashboard') ? '?from=billing-pipeline' : '';
    navigate(`/admin/work-orders/${item.id}${queryParams}`);
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

  // For mobile, render without card wrapper
  if (isMobileProp) {
    if (isError) {
      return (
        <div className="p-4">
          <EmptyState
            icon={ClipboardList}
            title="Error loading pipeline data"
            description="There was an error loading the work order pipeline. Please try again."
            variant="card"
          />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {isLoading ? (
          <EnhancedTableSkeleton rows={8} columns={8} showHeader={true} />
        ) : data.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={ClipboardList}
              title="No work orders found"
              description="No work orders are currently in the pipeline."
              variant="card"
            />
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {data.map(item => (
              <MobileTableCard
                key={item.id}
                title={item.work_order_number || 'No WO#'}
                subtitle={item.description 
                  ? `${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}`
                  : `${item.partner_organization_name} • ${item.store_location || 'No location'}`
                }
                badge={
                  <WorkOrderStatusBadge status={item.status} size="sm" />
                }
                metadata={[
                  { label: 'Status', value: item.status },
                  { label: 'Report', value: item.report_status || 'Not submitted' },
                  { 
                    label: 'Sub Bill', 
                    value: item.subcontractor_bill_amount 
                      ? `$${item.subcontractor_bill_amount.toLocaleString()}` 
                      : 'Not billed'
                  },
                  { 
                    label: 'Partner Inv', 
                    value: (() => {
                      if (item.partner_billed_amount) {
                        return `$${item.partner_billed_amount.toLocaleString()}`;
                      }
                      if (item.subcontractor_bill_amount) {
                        const markup = item.internal_markup_percentage || 30;
                        const amount = item.subcontractor_bill_amount * (1 + markup / 100);
                        return `$${amount.toLocaleString()} (est)`;
                      }
                      return '—';
                    })()
                  }
                ]}
                onClick={() => handleRowClick(item)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop rendering with card wrapper
  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Order Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <EnhancedTableSkeleton rows={8} columns={8} showHeader={true} />
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
            {viewMode === 'table' ? (
              <div className="overflow-visible">
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
            ) : (
              /* Desktop Card View */
              <div className="space-y-3">
                {table.getRowModel().rows.map((row) => {
                  const item = row.original;
                  return (
                    <MobileTableCard
                      key={row.id}
                      title={item.work_order_number || 'No WO#'}
                      subtitle={item.description 
                        ? `${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}`
                        : `${item.partner_organization_name} • ${item.store_location || 'No location'}`
                      }
                      badge={
                        <WorkOrderStatusBadge status={item.status} size="sm" />
                      }
                      metadata={[
                        { label: 'Partner', value: item.partner_organization_name },
                        { label: 'Location', value: item.store_location || 'No location' },
                        { label: 'Report', value: item.report_status || 'Not submitted' },
                        { 
                          label: 'Sub Bill', 
                          value: item.subcontractor_bill_amount ? `$${item.subcontractor_bill_amount.toLocaleString()}` : '—'
                        },
                        { 
                          label: 'Partner Invoice', 
                          value: (() => {
                            if (item.partner_billed_amount) {
                              return `$${item.partner_billed_amount.toLocaleString()} (Invoiced)`;
                            }
                            if (item.subcontractor_bill_amount && item.internal_markup_percentage) {
                              const amount = item.subcontractor_bill_amount * (1 + item.internal_markup_percentage / 100);
                              return `$${amount.toLocaleString()} (Est. ${item.internal_markup_percentage}% markup)`;
                            }
                            return '—';
                          })()
                        }
                      ]}
                      onClick={() => handleRowClick(item)}
                    />
                  );
                })}
              </div>
            )}

            {/* Enhanced Pagination */}
            <TablePagination
              table={table}
              totalCount={data.length}
              isMobile={false}
              itemName="work orders"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
