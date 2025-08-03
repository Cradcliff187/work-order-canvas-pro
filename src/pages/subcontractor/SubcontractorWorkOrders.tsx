
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
    selectedWorkOrderId ?? ''
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

  // Table columns with master-detail support
  const columns = useMemo(() => createSubcontractorWorkOrderColumns({
    unreadCounts,
    selectedId: selectedWorkOrderId,
    onSelectionChange: setSelectedWorkOrderId,
    onView: (workOrder) => navigate(`/subcontractor/work-orders/${workOrder.id}`),
    onSubmitReport: (workOrder) => navigate(`/subcontractor/reports/new/${workOrder.id}`),
  }), [navigate, unreadCounts, selectedWorkOrderId]);

  // React Table setup
  const table = useReactTable({
    data: filteredWorkOrders,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  if (assignedWorkOrders.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4 mb-6">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-48" />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const renderTableView = () => {
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
            onClick: () => {
              setSearchTerm('');
              setStatusFilter('all');
            },
            icon: Filter
          } : {
            label: "View All Work Orders",
            onClick: () => navigate('/subcontractor/work-orders'),
            icon: Eye
          }}
          variant="full"
        />
      );
    }

    const tableContent = (
      <Card>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
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
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
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
      </Card>
    );

    // Desktop: use master-detail layout
    if (!isMobile) {
      return (
        <MasterDetailLayout
          listContent={tableContent}
          selectedId={selectedWorkOrderId}
          onSelectionChange={setSelectedWorkOrderId}
          detailContent={selectedWorkOrder && (
            <WorkOrderDetailPanel
              workOrder={selectedWorkOrder}
              onEdit={() => navigate(`/subcontractor/work-orders/${selectedWorkOrder.id}`)}
              onViewFull={() => navigate(`/subcontractor/work-orders/${selectedWorkOrder.id}`)}
              showActionButtons={true}
            />
          )}
          isLoading={isLoadingDetail}
          items={filteredWorkOrders}
        />
      );
    }

    // Mobile: full-width table
    return tableContent;
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
            onClick: () => {
              setSearchTerm('');
              setStatusFilter('all');
            },
            icon: Filter
          } : {
            label: "View All Work Orders",
            onClick: () => navigate('/subcontractor/work-orders'),
            icon: Eye
          }}
          variant="full"
        />
      );
    }

    return (
      <div className="space-y-4">
        {filteredWorkOrders.map((workOrder) => (
          <Card key={workOrder.id} className="hover:shadow-md transition-shadow">
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

                  <div className={`grid gap-3 text-sm text-muted-foreground ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'}`}>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span>{workOrder.store_location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{workOrder.city}, {workOrder.state}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Submitted: {format(new Date(workOrder.date_submitted), 'MMM d, yyyy')}</span>
                    </div>
                    {workOrder.trades?.name && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{workOrder.trades.name}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {workOrder.description}
                  </p>

                  {/* Assignment Info */}
                  {workOrder.work_order_assignments && workOrder.work_order_assignments.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <AssigneeDisplay 
                        assignments={(workOrder.work_order_assignments || []).map(assignment => ({
                          assigned_to: assignment.assigned_to,
                          assignment_type: assignment.assignment_type,
                          assignee_profile: assignment.profiles,
                          assigned_organization: assignment.assigned_organization
                        }))}
                        className="text-xs"
                        showIcons={false}
                        showOrganization={true}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/subcontractor/work-orders/${workOrder.id}`)}
                    className="min-h-[44px] sm:min-h-auto"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  
                  {(workOrder.status === 'assigned' || workOrder.status === 'in_progress') && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/subcontractor/reports/new/${workOrder.id}`)}
                      className="min-h-[44px] sm:min-h-auto"
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">My Work Orders</h1>
        {!isMobile && allowedModes.length > 1 && (
          <ViewModeSwitcher
            value={viewMode}
            onValueChange={setViewMode}
            allowedModes={allowedModes}
          />
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search work orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders List */}
      {viewMode === 'table' ? renderTableView() : renderCardView()}
    </div>
  );
};

export default SubcontractorWorkOrders;
