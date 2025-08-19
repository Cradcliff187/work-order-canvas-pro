import { useMemo, useState } from 'react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { ComputedFinancialStatusBadge, FinancialStatusBadge, ReportStatusBadge, StatusBadge } from '@/components/ui/status-badge';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { useAdminFilters } from '@/hooks/useAdminFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { useWorkOrderLifecycle } from '@/hooks/useWorkOrderLifecyclePipeline';
import { WorkOrderPipelineItem } from '@/hooks/useWorkOrderLifecyclePipeline';
import { ClipboardList, Copy, Filter } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import { useTrades } from '@/hooks/useWorkOrders';

// Filter interface
interface PipelineFiltersValue {
  search?: string;
  operational_status?: string[];
  financial_status?: string[];
  partner_billing_status?: string[];
  partner_organization_id?: string;
  overdue?: boolean;
  priority?: string[];
  trade_id?: string[];
  assigned_organization_id?: string[];
  report_status?: string[];
  location_filter?: string[];
  date_from?: string;
  date_to?: string;
  age_range?: [number, number];
}

// Smart filter options with correct mappings
const operationalStatusOptions = [
  { value: 'new', label: 'New Orders' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'reports_pending', label: 'Reports Pending Review' },
  { value: 'complete', label: 'Completed' }
];

const financialStatusOptions = [
  { value: 'not_billed', label: 'No Invoice' },
  { value: 'invoice_received', label: 'Invoice Received' },
  { value: 'paid', label: 'Paid' }
];

const partnerBillingStatusOptions = [
  { value: 'report_pending', label: 'Report Pending' },
  { value: 'invoice_needed', label: 'Subcontractor Invoice Needed' },
  { value: 'invoice_pending', label: 'Invoice Pending Approval' },
  { value: 'ready_to_bill', label: 'Ready to Bill Partner' },
  { value: 'billed', label: 'Partner Billed' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const reportStatusOptions = [
  { value: 'not_submitted', label: 'Not Submitted' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Needs Revision' }
];

export function WorkOrderPipelineTable() {
  const navigate = useNavigate();
  const { data: pipelineData, isLoading, isError } = useWorkOrderLifecycle();
  const { data: trades } = useTrades();
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  // Default filters - show all work orders
  const initialFilters: PipelineFiltersValue = {
    search: '',
    operational_status: [], // Show all work orders by default
    financial_status: [],
    partner_billing_status: [],
    partner_organization_id: '',
    overdue: false,
    priority: [],
    trade_id: [],
    assigned_organization_id: [],
    report_status: [],
    location_filter: []
  };

  const { filters, setFilters, clearFilters, filterCount } = useAdminFilters(
    'admin-pipeline-filters',
    initialFilters,
    { excludeKeys: [] }
  );

  const handleClearFilters = () => {
    clearFilters();
    setIsMobileFilterOpen(false);
  };

  // Debounce search input
  const debouncedSearch = useDebounce(filters.search || '', 300);

  // Extract unique locations for filter options
  const locationOptions = useMemo(() => {
    if (!pipelineData) return [];
    
    const locations = new Set<string>();
    pipelineData.forEach(item => {
      if (item.store_location) {
        locations.add(item.store_location);
      } else {
        locations.add('No location');
      }
    });
    
    return Array.from(locations)
      .sort()
      .map(location => ({ value: location, label: location }));
  }, [pipelineData]);

  // Helper function to get operational status key for filtering
  const getOperationalStatusKey = (item: WorkOrderPipelineItem): string => {
    switch (item.status) {
      case 'received':
        return 'new';
      case 'assigned':
        return 'assigned';
      case 'in_progress':
        return 'in_progress';
      case 'completed':
        // Better logic: if work order is completed but reports need review/approval
        if (item.report_status === 'submitted' || item.report_status === 'reviewed') {
          return 'reports_pending';
        }
        // If report is approved or no report needed, it's complete
        return 'complete';
      default:
        return 'new';
    }
  };

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

  // Apply client-side filtering with improved logic
  const filteredData = useMemo(() => {
    if (!pipelineData) return [];

    return pipelineData.filter((item) => {
      // Enhanced search filter (work order number, title, partner, location, assigned org)
      if (debouncedSearch && debouncedSearch.trim()) {
        const searchTerm = debouncedSearch.toLowerCase().trim();
        const matchesSearch = 
          item.work_order_number?.toLowerCase().includes(searchTerm) ||
          item.title?.toLowerCase().includes(searchTerm) ||
          item.partner_organization_name?.toLowerCase().includes(searchTerm) ||
          item.store_location?.toLowerCase().includes(searchTerm) ||
          item.assigned_organization_name?.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;
      }

      // Operational status filter
      if (filters.operational_status && filters.operational_status.length > 0) {
        const itemOperationalStatus = getOperationalStatusKey(item);
        if (!filters.operational_status.includes(itemOperationalStatus)) return false;
      }

      // Financial status filter
      if (filters.financial_status && filters.financial_status.length > 0) {
        if (!filters.financial_status.includes(item.financial_status)) return false;
      }

      // Partner billing status filter
      if (filters.partner_billing_status && filters.partner_billing_status.length > 0) {
        const partnerBillingStatus = getPartnerBillingStatus(item);
        if (!filters.partner_billing_status.includes(partnerBillingStatus)) return false;
      }

      // Partner organization filter
      if (filters.partner_organization_id && filters.partner_organization_id.trim()) {
        if (item.organization_id !== filters.partner_organization_id) return false;
      }

      // Overdue filter
      if (filters.overdue) {
        if (!item.is_overdue) return false;
      }

      // Priority filter (handle null values properly)
      if (filters.priority && filters.priority.length > 0) {
        const itemPriority = item.priority || 'medium';
        if (!filters.priority.includes(itemPriority)) return false;
      }

      // Assigned organization filter (fix data type issue)
      if (filters.assigned_organization_id && filters.assigned_organization_id.length > 0) {
        if (!item.assigned_organization_id || 
            !filters.assigned_organization_id.includes(item.assigned_organization_id)) return false;
      }

      // Report status filter
      if (filters.report_status && filters.report_status.length > 0) {
        const reportStatus = item.report_status || 'not_submitted';
        if (!filters.report_status.includes(reportStatus)) return false;
      }

      // Location filter
      if (filters.location_filter && filters.location_filter.length > 0) {
        const itemLocation = item.store_location || 'No location';
        if (!filters.location_filter.includes(itemLocation)) return false;
      }

      return true;
    });
  }, [pipelineData, debouncedSearch, filters]);

  const data = useMemo(() => filteredData, [filteredData]);

  const columns: ColumnDef<WorkOrderPipelineItem>[] = useMemo(() => [
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
      id: 'partner_billing',
      header: 'Partner Billing Status',
      cell: ({ row }) => <StatusBadge type="partnerBilling" status={getPartnerBillingStatus(row.original)} size="sm" showIcon />,
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
        
        return (
          <div className="space-y-1">
            <FinancialStatusBadge status={statusValue} size="sm" showIcon />
            {item.subcontractor_invoice_amount && (
              <div className="text-xs text-muted-foreground">
                ${item.subcontractor_invoice_amount.toLocaleString()}
              </div>
            )}
          </div>
        );
      },
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
        <CardTitle>Work Order Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mobile Filter Button */}
        <Button 
          variant="outline" 
          onClick={() => setIsMobileFilterOpen(true)}
          className="w-full lg:hidden"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters {filterCount > 0 && `(${filterCount})`}
        </Button>

        {/* Desktop Filter Button */}
        <div className="hidden lg:flex items-center justify-end">
          <Button 
            variant="outline" 
            onClick={() => setIsDesktopFilterOpen(true)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters {filterCount > 0 && `(${filterCount})`}
          </Button>
        </div>

        {/* Mobile Bottom Sheet */}
        <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Work Order Filters</SheetTitle>
              {filterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleClearFilters}
                  className="absolute right-12 top-4"
                >
                  Clear All
                </Button>
              )}
            </SheetHeader>
            
            <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(85vh-8rem)] px-1 pb-20">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Search</label>
                <SmartSearchInput
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search by work order number, title, partner, location..."
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Partner Organization</label>
                <OrganizationSelector
                  value={filters.partner_organization_id || ''}
                  onChange={(value) => setFilters(prev => ({ ...prev, partner_organization_id: value }))}
                  placeholder="Select partner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Operational Status</label>
                <MultiSelectFilter
                  options={operationalStatusOptions}
                  selectedValues={filters.operational_status || []}
                  onSelectionChange={(values) => setFilters(prev => ({ ...prev, operational_status: values }))}
                  placeholder="Select operational status"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Financial Status</label>
                <MultiSelectFilter
                  options={financialStatusOptions}
                  selectedValues={filters.financial_status || []}
                  onSelectionChange={(values) => setFilters(prev => ({ ...prev, financial_status: values }))}
                  placeholder="Select financial status"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Partner Billing Status</label>
                <MultiSelectFilter
                  options={partnerBillingStatusOptions}
                  selectedValues={filters.partner_billing_status || []}
                  onSelectionChange={(values) => setFilters(prev => ({ ...prev, partner_billing_status: values }))}
                  placeholder="Select partner billing status"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Priority</label>
                <MultiSelectFilter
                  options={priorityOptions}
                  selectedValues={filters.priority || []}
                  onSelectionChange={(values) => setFilters(prev => ({ ...prev, priority: values }))}
                  placeholder="Select priority"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Report Status</label>
                <MultiSelectFilter
                  options={reportStatusOptions}
                  selectedValues={filters.report_status || []}
                  onSelectionChange={(values) => setFilters(prev => ({ ...prev, report_status: values }))}
                  placeholder="Select report status"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Location</label>
                <MultiSelectFilter
                  options={locationOptions}
                  selectedValues={filters.location_filter || []}
                  onSelectionChange={(values) => setFilters(prev => ({ ...prev, location_filter: values }))}
                  placeholder="Select locations"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="overdue-filter-mobile"
                  checked={filters.overdue || false}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, overdue: checked }))}
                />
                <Label htmlFor="overdue-filter-mobile" className="text-sm">Show only overdue orders</Label>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
              <Button 
                onClick={() => setIsMobileFilterOpen(false)} 
                className="w-full"
                size="lg"
              >
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Right Sidebar */}
        <Sheet open={isDesktopFilterOpen} onOpenChange={setIsDesktopFilterOpen}>
          <SheetContent side="right" className="w-[480px]">
            <SheetHeader>
              <SheetTitle>Work Order Filters</SheetTitle>
              {filterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleClearFilters}
                  className="absolute right-12 top-4"
                >
                  Clear All
                </Button>
              )}
            </SheetHeader>
            
            <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)] px-1">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Search</label>
                <SmartSearchInput
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search by work order number, title, partner, location..."
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Partner Organization</label>
                <OrganizationSelector
                  value={filters.partner_organization_id || ''}
                  onChange={(value) => setFilters(prev => ({ ...prev, partner_organization_id: value }))}
                  placeholder="Select partner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Operational Status</label>
                <MultiSelectFilter
                  options={operationalStatusOptions}
                  selectedValues={filters.operational_status || []}
                  onSelectionChange={(values) => setFilters(prev => ({ ...prev, operational_status: values }))}
                  placeholder="Select operational status"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Financial Status</label>
                <MultiSelectFilter
                  options={financialStatusOptions}
                  selectedValues={filters.financial_status || []}
                  onSelectionChange={(values) => setFilters(prev => ({ ...prev, financial_status: values }))}
                  placeholder="Select financial status"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Partner Billing Status</label>
                <MultiSelectFilter
                  options={partnerBillingStatusOptions}
                  selectedValues={filters.partner_billing_status || []}
                  onSelectionChange={(values) => setFilters(prev => ({ ...prev, partner_billing_status: values }))}
                  placeholder="Select partner billing status"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Priority</label>
                <MultiSelectFilter
                  options={priorityOptions}
                  selectedValues={filters.priority || []}
                  onSelectionChange={(values) => setFilters(prev => ({ ...prev, priority: values }))}
                  placeholder="Select priority"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Report Status</label>
                <MultiSelectFilter
                  options={reportStatusOptions}
                  selectedValues={filters.report_status || []}
                  onSelectionChange={(values) => setFilters(prev => ({ ...prev, report_status: values }))}
                  placeholder="Select report status"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Location</label>
                <MultiSelectFilter
                  options={locationOptions}
                  selectedValues={filters.location_filter || []}
                  onSelectionChange={(values) => setFilters(prev => ({ ...prev, location_filter: values }))}
                  placeholder="Select locations"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="overdue-filter-desktop"
                  checked={filters.overdue || false}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, overdue: checked }))}
                />
                <Label htmlFor="overdue-filter-desktop" className="text-sm">Show only overdue orders</Label>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={filterCount > 0 ? "No matching work orders" : "No work orders found"}
            description={
              filterCount > 0 
                ? "No work orders match your current filters. Try adjusting your criteria."
                : "No work orders are currently in the pipeline."
            }
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

            {/* Pagination */}
            <div className="flex items-center justify-between space-x-2 py-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {table.getRowModel().rows.length} of {data.length} work orders
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select
                    value={table.getState().pagination.pageSize.toString()}
                    onValueChange={(value) => table.setPageSize(Number(value))}
                  >
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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