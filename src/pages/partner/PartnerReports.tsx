
import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Search,
  RotateCcw,
  Filter,
  X
} from 'lucide-react';
import { ViewToggle } from '@/components/partner/work-orders/ViewToggle';
import { SortDropdown } from '@/components/partner/work-orders/SortDropdown';
import { ReportCard } from '@/components/partner/reports/ReportCard';
import { usePartnerReports } from '@/hooks/usePartnerReports';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ReportFilters {
  status?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
  location_filter?: string;
}

const reportSortOptions = [
  { value: 'submitted-desc', label: 'Recently Submitted' },
  { value: 'submitted-asc', label: 'Oldest First' },
  { value: 'number-asc', label: 'Work Order # (A-Z)' },
  { value: 'number-desc', label: 'Work Order # (Z-A)' },
  { value: 'status-asc', label: 'Status (A-Z)' },
  { value: 'hours-desc', label: 'Most Hours' },
  { value: 'hours-asc', label: 'Least Hours' },
];

export default function PartnerReports() {
  const navigate = useNavigate();
  const { organization } = useUserOrganization();
  const { data: locations = [] } = usePartnerLocations(organization?.id);
  
  const [view, setView] = useState<'card' | 'table'>('card');
  const [sortBy, setSortBy] = useState('submitted-desc');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    location_filter: 'all'
  });

  const { data: reportsData, isLoading, error, refetch } = usePartnerReports(
    pagination,
    sorting,
    filters
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Submitted</Badge>;
      case 'reviewed':
        return <Badge variant="outline"><Eye className="w-3 h-3 mr-1" />Reviewed</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'work_orders.work_order_number',
      header: 'Work Order',
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
      header: 'Title',
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
        return (
          <div>
            <div className="font-medium">
              {subcontractor ? `${subcontractor.first_name} ${subcontractor.last_name}` : 'N/A'}
            </div>
            {subcontractor?.company_name && (
              <div className="text-sm text-muted-foreground">{subcontractor.company_name}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.getValue('status')),
    },
    {
      accessorKey: 'hours_worked',
      header: 'Hours',
      cell: ({ row }) => {
        const hours = row.getValue('hours_worked') as number;
        return hours ? `${hours}h` : 'N/A';
      },
    },
    {
      accessorKey: 'submitted_at',
      header: 'Submitted',
      cell: ({ row }) => {
        const date = row.getValue('submitted_at') as string;
        return format(new Date(date), 'MMM dd, yyyy');
      },
    },
    {
      accessorKey: 'reviewed_at',
      header: 'Reviewed',
      cell: ({ row }) => {
        const date = row.getValue('reviewed_at') as string;
        return date ? format(new Date(date), 'MMM dd, yyyy') : '-';
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const report = row.original;
        
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/partner/reports/${report.id}`)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        );
      },
    },
  ], [navigate]);

  const table = useReactTable({
    data: reportsData?.data || [],
    columns,
    pageCount: reportsData?.pageCount || 0,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  // Sort reports for card view
  const sortedReports = useMemo(() => {
    if (!reportsData?.data || view === 'table') return reportsData?.data || [];
    
    const reports = [...reportsData.data];
    
    switch (sortBy) {
      case 'submitted-desc':
        return reports.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
      case 'submitted-asc':
        return reports.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
      case 'number-asc':
        return reports.sort((a, b) => (a.work_orders?.work_order_number || '').localeCompare(b.work_orders?.work_order_number || ''));
      case 'number-desc':
        return reports.sort((a, b) => (b.work_orders?.work_order_number || '').localeCompare(a.work_orders?.work_order_number || ''));
      case 'status-asc':
        return reports.sort((a, b) => a.status.localeCompare(b.status));
      case 'hours-desc':
        return reports.sort((a, b) => (b.hours_worked || 0) - (a.hours_worked || 0));
      case 'hours-asc':
        return reports.sort((a, b) => (a.hours_worked || 0) - (b.hours_worked || 0));
      default:
        return reports;
    }
  }, [reportsData?.data, sortBy, view]);

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ location_filter: 'all' });
  };

  const getSelectedLocationName = () => {
    if (!filters.location_filter || filters.location_filter === 'all') {
      return null;
    }
    if (filters.location_filter === 'manual') {
      return 'Manual Locations';
    }
    const location = locations.find(loc => loc.location_number === filters.location_filter);
    return location ? location.location_name : null;
  };

  const selectedLocationName = getSelectedLocationName();

  const renderTableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );

  const renderCardSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">Error loading reports: {error.message}</p>
              <Button onClick={() => refetch()} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            Work Reports{selectedLocationName ? ` - ${selectedLocationName}` : ''}
          </h1>
          <p className="text-muted-foreground">
            {reportsData?.totalCount ? `${reportsData.totalCount} total reports` : 'View work reports for your organization'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status?.[0] || 'all'}
                onValueChange={(value) => 
                  handleFilterChange('status', value === 'all' ? undefined : [value])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select
                value={filters.location_filter || 'all'}
                onValueChange={(value) => handleFilterChange('location_filter', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.location_number}>
                      {location.location_name} ({location.location_number})
                    </SelectItem>
                  ))}
                  <SelectItem value="manual">Manual Locations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <ViewToggle view={view} onViewChange={setView} />
          {view === 'card' && (
            <SortDropdown 
              value={sortBy} 
              onValueChange={setSortBy}
              options={reportSortOptions}
            />
          )}
        </div>
      </div>

      {/* Content */}
      {view === 'card' ? (
        <div>
          {isLoading ? (
            renderCardSkeleton()
          ) : sortedReports.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-muted-foreground">
                  {filters.search || filters.status || (filters.location_filter && filters.location_filter !== 'all') ? (
                    <div className="space-y-2">
                      <p>No reports found matching your criteria.</p>
                      <Button variant="outline" onClick={handleClearFilters}>
                        Clear filters to see all reports
                      </Button>
                    </div>
                  ) : (
                    'No reports found.'
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedReports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              renderTableSkeleton()
            ) : reportsData?.data.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                {filters.search || filters.status || (filters.location_filter && filters.location_filter !== 'all') ? (
                  <div className="space-y-2">
                    <p>No reports found matching your criteria.</p>
                    <Button variant="outline" onClick={handleClearFilters}>
                      Clear filters to see all reports
                    </Button>
                  </div>
                ) : (
                  'No reports found.'
                )}
              </div>
            ) : (
              <>
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
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
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
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="flex-1 text-sm text-muted-foreground">
                    Showing {table.getRowModel().rows.length} of {reportsData?.totalCount || 0} reports
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
