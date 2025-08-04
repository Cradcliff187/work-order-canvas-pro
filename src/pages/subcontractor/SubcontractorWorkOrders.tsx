
import React, { useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { useViewMode } from '@/hooks/useViewMode';
import { 
  Search, 
  Eye, 
  Calendar, 
  MapPin, 
  Building,
  ClipboardList,
  Filter,
  FileText,
  List,
  Grid
} from 'lucide-react';
import { useSubcontractorWorkOrders } from '@/hooks/useSubcontractorWorkOrders';
import { useUnreadMessageCounts } from '@/hooks/useUnreadMessageCounts';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { AssigneeDisplay } from '@/components/AssigneeDisplay';
import { MasterDetailLayout } from '@/components/work-orders/MasterDetailLayout';
import { WorkOrderDetailPanel } from '@/components/work-orders/WorkOrderDetailPanel';
import { createSubcontractorWorkOrderColumns } from '@/components/subcontractor/work-orders/WorkOrderColumns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';

const SubcontractorWorkOrders = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { assignedWorkOrders } = useSubcontractorWorkOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { viewMode, setViewMode, allowedModes } = useViewMode({
    componentKey: 'subcontractor-work-orders',
    config: {
      mobile: ['card'],
      desktop: ['card', 'table']
    },
    defaultMode: 'card'
  });
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const workOrderList = assignedWorkOrders.data || [];
  
  // Extract work order IDs for unread message counts
  const workOrderIds = workOrderList.map(wo => wo.id);
  const { data: unreadCounts = {} } = useUnreadMessageCounts(workOrderIds);

  // Get selected work order detail
  const { data: selectedWorkOrder, isLoading: isLoadingDetail } = useWorkOrderDetail(
    selectedWorkOrderId || ""
  );

  const filteredWorkOrders = workOrderList.filter((workOrder) => {
    const matchesSearch = 
      workOrder.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workOrder.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workOrder.store_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workOrder.city?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || workOrder.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const hasFilters = searchTerm || statusFilter !== 'all';

  // Table columns 
  const columns = useMemo(() => createSubcontractorWorkOrderColumns({ 
    unreadCounts,
    onPreview: (workOrder) => setSelectedWorkOrderId(workOrder.id),
    onView: (workOrder) => navigate(`/subcontractor/work-orders/${workOrder.id}`),
    onSubmitReport: (workOrder) => navigate(`/subcontractor/work-orders/${workOrder.id}?action=submit-report`)
  }), [unreadCounts, navigate]);

  const table = useReactTable({
    data: filteredWorkOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
  });

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };


  const renderTableView = () => {
    return (
      <Card>
        <CardContent className="p-0">
          {/* Desktop Master-Detail Layout */}
          <div className="hidden lg:block">
            <MasterDetailLayout
              listContent={
                <div className="rounded-md border">
                  <Table>
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
                          className={`cursor-pointer ${selectedWorkOrderId === row.original.id ? 'bg-muted/50' : ''}`}
                          onClick={() => setSelectedWorkOrderId(row.original.id)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              }
              selectedId={selectedWorkOrderId}
              onSelectionChange={setSelectedWorkOrderId}
              detailContent={
                selectedWorkOrder && (
                  <WorkOrderDetailPanel
                    workOrder={selectedWorkOrder}
                    onViewFull={() => navigate(`/subcontractor/work-orders/${selectedWorkOrderId}`)}
                    showActionButtons={true}
                  />
                )
              }
              isLoading={isLoadingDetail}
              items={filteredWorkOrders.map(wo => ({ id: wo.id }))}
            />
          </div>

          {/* Mobile/Tablet Table */}
          <div className="block lg:hidden">
            <div className="rounded-md border">
              <Table>
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
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCardView = () => {
    if (filteredWorkOrders.length === 0) {
      return (
        <EmptyState
          icon={hasFilters ? Filter : ClipboardList}
          title={hasFilters ? "No results match your criteria" : "No work orders assigned yet"}
          description={hasFilters 
            ? "Try adjusting your filters or search terms to find what you're looking for."
            : "Work orders will appear here once they're assigned to you. Check back later or contact your administrator."
          }
          action={hasFilters ? {
            label: "Clear Filters",
            onClick: clearAllFilters,
            icon: Filter
          } : undefined}
          variant="full"
        />
      );
    }

    return (
      <div className="space-y-4">
        {filteredWorkOrders.map((workOrder) => (
          <Card key={workOrder.id} className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/subcontractor/work-orders/${workOrder.id}`)}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{workOrder.work_order_number}</h3>
                    {unreadCounts[workOrder.id] > 0 && (
                      <Badge variant="default" className="ml-2">
                        {unreadCounts[workOrder.id]}
                      </Badge>
                    )}
                    <WorkOrderStatusBadge status={workOrder.status} />
                  </div>

                  <h4 className="font-medium text-foreground">{workOrder.title}</h4>

                  <div className={`grid gap-3 text-sm text-muted-foreground ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{workOrder.store_location}, {workOrder.city}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(workOrder.date_submitted), 'MMM dd, yyyy')}</span>
                    </div>

                    {workOrder.trades && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span>{workOrder.trades.name}</span>
                      </div>
                    )}

                    {workOrder.work_order_attachments && workOrder.work_order_attachments.length > 0 && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{workOrder.work_order_attachments.length} attachment(s)</span>
                      </div>
                    )}
                  </div>

                  {workOrder.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {workOrder.description}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/subcontractor/work-orders/${workOrder.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  {workOrder.status === 'assigned' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/subcontractor/work-orders/${workOrder.id}?action=submit-report`);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Report
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Work Orders</h1>
          <p className="text-muted-foreground">Manage and view your assigned work orders</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search work orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="estimate_needed">Estimate Needed</SelectItem>
                <SelectItem value="estimate_approved">Estimate Approved</SelectItem>
              </SelectContent>
            </Select>
            <ViewModeSwitcher
              value={viewMode}
              onValueChange={setViewMode}
              allowedModes={allowedModes}
            />
          </div>
          {hasFilters && (
            <div className="mt-2">
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear all filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      {assignedWorkOrders.isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        renderTableView()
      ) : (
        renderCardView()
      )}
    </div>
  );
};

export default SubcontractorWorkOrders;
