
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useUnreadMessageCounts } from '@/hooks/useUnreadMessageCounts';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';
import { useUserProfile } from '@/hooks/useUserProfile';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
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
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileWorkOrderCard } from '@/components/MobileWorkOrderCard';

const SubcontractorWorkOrders = () => {
  const navigate = useNavigate();
  const { profile, userOrganizations } = useAuth();
  const { isEmployee, isAdmin } = useUserProfile();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const isMobile = useIsMobile();

  // Get organization IDs for the query
  const organizationIds = useMemo(() => {
    return userOrganizations?.map(org => org.organization_id) || [];
  }, [userOrganizations]);

  // Pull to refresh functionality
  const { handleRefresh, threshold } = usePullToRefresh({
    queryKey: ['subcontractor-work-orders', ...organizationIds],
    successMessage: 'Work orders refreshed'
  });
  
  const { viewMode, setViewMode, allowedModes } = useViewMode({
    componentKey: 'subcontractor-work-orders',
    config: {
      mobile: ['list'],
      desktop: ['table', 'card']
    },
    defaultMode: 'table'
  });


  // Simple direct query for work orders
  const { data: workOrderList = [], isLoading } = useQuery({
    queryKey: ['subcontractor-work-orders', organizationIds],
    queryFn: async () => {
      if (!profile?.id || organizationIds.length === 0) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          trades (name),
          organizations!organization_id (name),
          work_order_attachments(count),
          work_order_reports (
            id,
            status,
            submitted_at,
            subcontractor_user_id
          ),
          work_order_assignments (
            assigned_to,
            assignment_type,
            profiles!work_order_assignments_assigned_to_fkey (first_name, last_name),
            assigned_organization:organizations!assigned_organization_id(name, organization_type)
          )
        `)
        .in('assigned_organization_id', organizationIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((wo: any) => ({
        ...wo,
        attachment_count: wo.work_order_attachments?.[0]?.count || 0
      }));
    },
    enabled: !!profile?.id && organizationIds.length > 0,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // Get unread message counts
  const workOrderIds = workOrderList.map(wo => wo.id);
  const { data: unreadCounts = {} } = useUnreadMessageCounts(
    workOrderIds, 
    profile, 
    isEmployee, 
    isAdmin
  );

  // Get selected work order detail
  const { data: selectedWorkOrder, isLoading: isLoadingDetail } = useWorkOrderDetail(
    selectedWorkOrderId || ''
  );

  // Filter work orders
  const filteredWorkOrders = useMemo(() => {
    return workOrderList.filter((workOrder) => {
      const matchesSearch = 
        workOrder.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workOrder.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workOrder.store_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workOrder.city?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || workOrder.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [workOrderList, searchTerm, statusFilter]);

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

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderTableView = () => {
    if (isMobile) {
      return (
        <MobilePullToRefresh onRefresh={handleRefresh} threshold={threshold}>
          <Card>
            <CardContent className="p-0">
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
            </CardContent>
          </Card>
        </MobilePullToRefresh>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
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

    if (isMobile) {
      return (
        <MobilePullToRefresh onRefresh={handleRefresh} threshold={threshold}>
          <div className="space-y-4">
            {filteredWorkOrders.map((workOrder) => (
              <MobileWorkOrderCard
                key={workOrder.id}
                workOrder={workOrder}
                onTap={() => navigate(`/subcontractor/work-orders/${workOrder.id}`)}
                viewerRole="subcontractor"
                showQuickActions={true}
                showOrganization={true}
                showAssignee={false}
                showTrade={true}
                showInvoiceAmount={false}
                onMessage={() => navigate(`/subcontractor/work-orders/${workOrder.id}?tab=messages`)}
                onSubmitReport={() => navigate(`/subcontractor/work-orders/${workOrder.id}?action=submit-report`)}
              />
            ))}
          </div>
        </MobilePullToRefresh>
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
                    <WorkOrderStatusBadge status={workOrder.status} workOrder={workOrder} />
                  </div>

                  <h4 className="font-medium text-foreground">{workOrder.title}</h4>

                  <div className="grid gap-3 text-sm text-muted-foreground grid-cols-1 sm:grid-cols-2">
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

                    {workOrder.attachment_count > 0 && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{workOrder.attachment_count} attachment(s)</span>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Work Orders</h1>
          <p className="text-muted-foreground">Manage and view your assigned work orders</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
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
      {viewMode === 'table' ? renderTableView() : renderCardView()}
    </div>
  );
};

export default SubcontractorWorkOrders;
