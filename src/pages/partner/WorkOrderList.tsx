
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Eye, 
  Calendar, 
  MapPin, 
  Building,
  Plus,
  ClipboardList,
  Filter,
  FileText,
  X
} from 'lucide-react';
import { usePartnerWorkOrders } from '@/hooks/usePartnerWorkOrders';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { useUnreadMessageCounts } from '@/hooks/useUnreadMessageCounts';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { createWorkOrderColumns } from '@/components/partner/work-orders/WorkOrderColumns';
import { ViewToggle } from '@/components/partner/work-orders/ViewToggle';
import { SortDropdown } from '@/components/partner/work-orders/SortDropdown';

const workOrderSortOptions = [
  { value: 'submitted-desc', label: 'Newest First' },
  { value: 'submitted-asc', label: 'Oldest First' },
  { value: 'status-asc', label: 'Status (A-Z)' },
  { value: 'location-asc', label: 'Location (A-Z)' },
  { value: 'trade-asc', label: 'Trade (A-Z)' },
];

const WorkOrderList = () => {
  const navigate = useNavigate();
  const { data: workOrdersData, isLoading } = usePartnerWorkOrders();
  const { organization: userOrganization } = useUserOrganization();
  const { data: locations } = usePartnerLocations(userOrganization?.id);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [view, setView] = useState<'card' | 'table'>('table');
  const [sortOption, setSortOption] = useState('submitted-desc');
  const [sorting, setSorting] = useState<SortingState>([]);

  const workOrderList = workOrdersData?.data || [];
  
  // Extract work order IDs for unread message counts
  const workOrderIds = workOrderList.map(wo => wo.id);
  const { data: unreadCounts = {} } = useUnreadMessageCounts(workOrderIds);

  // Filter and sort work orders
  const filteredAndSortedWorkOrders = useMemo(() => {
    let filtered = workOrderList.filter((workOrder) => {
      const matchesSearch = 
        workOrder.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workOrder.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workOrder.store_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workOrder.city?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || workOrder.status === statusFilter;
      
      const matchesLocation = locationFilter === 'all' || 
        workOrder.partner_location_number === locationFilter ||
        (locationFilter === 'manual' && !workOrder.partner_location_number);
      
      return matchesSearch && matchesStatus && matchesLocation;
    });

    // Apply sorting for card view
    if (view === 'card') {
      const [sortBy, direction] = sortOption.split('-');
      
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'submitted':
            aValue = new Date(a.date_submitted).getTime();
            bValue = new Date(b.date_submitted).getTime();
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'location':
            aValue = a.store_location || '';
            bValue = b.store_location || '';
            break;
          case 'trade':
            aValue = a.trades?.name || '';
            bValue = b.trades?.name || '';
            break;
          default:
            return 0;
        }
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return filtered;
  }, [workOrderList, searchTerm, statusFilter, locationFilter, sortOption, view]);

  const hasFilters = searchTerm || statusFilter !== 'all' || locationFilter !== 'all';

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setLocationFilter('all');
  };

  // Table columns
  const columns = useMemo(() => createWorkOrderColumns({
    unreadCounts,
    onView: (workOrder) => navigate(`/partner/work-orders/${workOrder.id}`),
  }), [navigate, unreadCounts]);

  // React Table setup
  const table = useReactTable({
    data: filteredAndSortedWorkOrders,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4 mb-6">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Work Orders</h1>
          <p className="text-muted-foreground">
            {filteredAndSortedWorkOrders.length} of {workOrderList.length} work orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={setView} />
          <Button onClick={() => navigate('/partner/work-orders/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
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
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations && locations.length > 0 && locations.map((location) => (
                    <SelectItem key={location.id} value={location.location_number}>
                      {location.location_name} ({location.location_number})
                    </SelectItem>
                  ))}
                  <SelectItem value="manual">Manual Locations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasFilters && (
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
              
              {view === 'card' && (
                <SortDropdown 
                  value={sortOption} 
                  onValueChange={setSortOption}
                  options={workOrderSortOptions}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredAndSortedWorkOrders.length === 0 ? (
        <EmptyState
          icon={hasFilters ? Filter : ClipboardList}
          title={hasFilters ? "No results match your criteria" : "No work orders submitted yet"}
          description={hasFilters 
            ? "Try adjusting your filters or search terms to find what you're looking for."
            : "Get started by submitting your first work order to track and manage your maintenance requests."
          }
          action={hasFilters ? {
            label: "Clear Filters",
            onClick: clearAllFilters,
            icon: Filter
          } : {
            label: "Submit Your First Work Order",
            onClick: () => navigate('/partner/work-orders/new'),
            icon: Plus
          }}
        />
      ) : view === 'table' ? (
        /* Table View */
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
          </CardContent>
        </Card>
      ) : (
        /* Card View */
        <div className="space-y-4">
          {filteredAndSortedWorkOrders.map((workOrder) => (
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
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
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/partner/work-orders/${workOrder.id}`)}
                      className="min-h-[44px] sm:min-h-auto"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkOrderList;
