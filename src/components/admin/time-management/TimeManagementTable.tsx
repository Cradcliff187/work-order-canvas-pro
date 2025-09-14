import React from 'react';
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, ColumnDef, flexRender, PaginationState } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreHorizontal, Clock, DollarSign, CheckCircle, XCircle, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { TimeEntry } from '@/hooks/useTimeManagement';
import { cn } from '@/lib/utils';
import { calculateWeeklyEntryOvertimeInfo } from '@/utils/overtimeCalculations';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { TablePagination } from '@/components/admin/shared/TablePagination';
import { parseDateOnly } from '@/lib/utils/date';

interface TimeManagementTableProps {
  entries: TimeEntry[];
  selectedEntries: string[];
  onSelectionChange: (entryId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entryId: string) => void;
  onApprove?: (entryId: string) => void;
  onReject?: (entryId: string, reason: string) => void;
  onFlag?: (entryId: string) => void;
  isLoading: boolean;
  columnVisibility: any;
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
  pageCount: number;
  totalCount: number;
}

export function TimeManagementTable({
  entries,
  selectedEntries,
  onSelectionChange,
  onSelectAll,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onFlag,
  isLoading,
  columnVisibility,
  pagination,
  setPagination,
  pageCount,
  totalCount,
}: TimeManagementTableProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const getStatusBadge = (entry: TimeEntry, allEntries: TimeEntry[]) => {
    const baseVariant = entry.approval_status === 'approved' ? 'default' : 
                        entry.approval_status === 'rejected' ? 'destructive' :
                        entry.approval_status === 'flagged' ? 'secondary' : 'outline';
    
    const statusText = entry.approval_status.charAt(0).toUpperCase() + entry.approval_status.slice(1);
    
    // Calculate overtime info using weekly aggregation (40h threshold)
    const entriesWithOvertimeInfo = calculateWeeklyEntryOvertimeInfo(allEntries.map(entry => ({
      id: entry.id,
      report_date: entry.report_date,
      hours_worked: entry.hours_worked,
      employee_user_id: entry.employee_user_id,
      employee: entry.employee ? {
        id: entry.employee.id,
        first_name: entry.employee.first_name,
        last_name: entry.employee.last_name,
        is_overtime_eligible: entry.employee.is_overtime_eligible
      } : undefined
    })));
    const entryWithOT = entriesWithOvertimeInfo.find(e => e.id === entry.id);
    const hasOvertime = entryWithOT?.contributesToOvertime && entryWithOT.overtimePortion > 0;
    
    return (
      <div className="flex flex-col gap-1">
        <Badge variant={baseVariant}>{statusText}</Badge>
        {hasOvertime && (
          <Badge variant="secondary" className="text-xs">
            {entryWithOT.overtimePortion.toFixed(1)}h OT
          </Badge>
        )}
      </div>
    );
  };

  const columns: ColumnDef<TimeEntry>[] = React.useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            onSelectAll(!!value);
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedEntries.includes(row.original.id)}
          onCheckedChange={() => onSelectionChange(row.original.id)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'report_date',
      header: 'Date',
      cell: ({ row }) => {
        const entry = row.original;
        const date = parseDateOnly(entry.report_date);
        return (
          <div className="flex flex-col">
            <span>{format(date, 'MMM d, yyyy')}</span>
            <span className="text-xs text-muted-foreground">
              {format(date, 'EEEE')}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={entry.employee?.avatar_url} />
              <AvatarFallback>
                {entry.employee?.first_name[0]}{entry.employee?.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                {entry.employee?.first_name} {entry.employee?.last_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {entry.employee?.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'workItem',
      header: 'Work Item',
      cell: ({ row }) => {
        const entry = row.original;
        if (entry.work_order) {
          return (
            <div>
              <div className="font-medium text-sm">
                {entry.work_order.work_order_number}
              </div>
              <div className="text-xs text-muted-foreground">
                {entry.work_order.title}
              </div>
            </div>
          );
        } else if (entry.project) {
          return (
            <div>
              <div className="font-medium text-sm">
                {entry.project.project_number}
              </div>
              <div className="text-xs text-muted-foreground">
                {entry.project.name}
              </div>
            </div>
          );
        }
        return <span className="text-muted-foreground">-</span>;
      },
    },
    {
      accessorKey: 'hours_worked',
      header: 'Hours',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Clock className="h-3 w-3" />
          {formatHours(row.getValue('hours_worked'))}
        </div>
      ),
    },
    {
      accessorKey: 'hourly_rate_snapshot',
      header: 'Rate',
      cell: ({ row }) => formatCurrency(row.getValue('hourly_rate_snapshot')),
    },
    {
      accessorKey: 'total_labor_cost',
      header: 'Labor Cost',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <DollarSign className="h-3 w-3" />
          {formatCurrency(row.getValue('total_labor_cost') || 0)}
        </div>
      ),
    },
    {
      accessorKey: 'materials_cost',
      header: 'Materials',
      cell: ({ row }) => {
        const materialsCost = row.getValue('materials_cost');
        return materialsCost ? formatCurrency(materialsCost as number) : '-';
      },
    },
    {
      accessorKey: 'approval_status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original, entries),
    },
    {
      accessorKey: 'work_performed',
      header: 'Description',
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <div className="max-w-xs">
            <div className="truncate" title={entry.work_performed}>
              {entry.work_performed}
            </div>
            {entry.notes && (
              <div className="text-xs text-muted-foreground truncate" title={entry.notes}>
                Note: {entry.notes}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-50">
              <DropdownMenuItem onClick={() => onEdit(entry)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              
              {entry.approval_status === 'pending' && onApprove && (
                <DropdownMenuItem 
                  onClick={() => onApprove(entry.id)}
                  className="text-green-600"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </DropdownMenuItem>
              )}
              
              {entry.approval_status !== 'rejected' && onReject && (
                <DropdownMenuItem 
                  onClick={() => onReject(entry.id, 'Individual rejection')}
                  className="text-red-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </DropdownMenuItem>
              )}
              
              {onFlag && (
                <DropdownMenuItem onClick={() => onFlag(entry.id)}>
                  <Flag className="h-4 w-4 mr-2" />
                  Flag for Review
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={() => onDelete(entry.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ], [entries, selectedEntries, onSelectionChange, onSelectAll, onEdit, onDelete, onApprove, onReject, onFlag]);

  const table = useReactTable({
    data: entries,
    columns,
    pageCount,
    state: {
      pagination,
      columnVisibility,
      rowSelection: selectedEntries.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    getRowId: (row) => row.id,
  });

  if (isLoading) {
    return <EnhancedTableSkeleton />;
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No time entries found</h3>
          <p className="text-muted-foreground">
            No time entries match your current filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnId = header.column.id;
                  // Show select and actions columns always, others based on visibility
                  const shouldShow = columnId === 'select' || columnId === 'actions' || 
                    (columnVisibility[columnId] !== false);
                  
                  if (!shouldShow) return null;
                  
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "hover:bg-muted/50",
                    selectedEntries.includes(row.original.id) && "bg-muted/20"
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const columnId = cell.column.id;
                    // Show select and actions columns always, others based on visibility
                    const shouldShow = columnId === 'select' || columnId === 'actions' || 
                      (columnVisibility[columnId] !== false);
                    
                    if (!shouldShow) return null;
                    
                    return (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination table={table} totalCount={totalCount} />
      </CardContent>
    </Card>
  );
}