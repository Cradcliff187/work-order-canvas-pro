import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { ReportStatusBadge, FinancialStatusBadge, ComputedFinancialStatusBadge } from '@/components/ui/status-badge';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { useViewMode, type ViewModeConfig } from '@/hooks/useViewMode';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWorkOrderLifecycle } from '@/hooks/useWorkOrderLifecyclePipeline';
import { formatDate } from '@/lib/utils/date';
import { formatCurrency } from '@/utils/formatting';
import { 
  ClipboardList, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Clock,
  AlertCircle,
  TrendingUp,
  Package,
  CreditCard,
  Receipt,
  Filter
} from 'lucide-react';

// Mobile card component for pipeline data
interface PipelineMobileCardProps {
  item: any;
  onSelect: (item: any) => void;
}

function PipelineMobileCard({
  item,
  onSelect
}: PipelineMobileCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSelect(item)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{item.work_order_number}</p>
              <p className="text-sm text-muted-foreground">{item.title}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {item.age_days}d
            </Badge>
          </div>
          
          {/* Location */}
          <div>
            <p className="text-sm">{item.partner_organization_name}</p>
            <p className="text-xs text-muted-foreground">{item.store_location}</p>
          </div>
          
          {/* Status Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <WorkOrderStatusBadge status={item.status} showEstimateIndicator workOrder={item} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Report</p>
              <ReportStatusBadge status={item.report_status || "not_submitted"} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Invoice</p>
              <FinancialStatusBadge status={item.invoice_status || "pending"} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Billing</p>
              <ComputedFinancialStatusBadge status={item.financial_status || "not_billed"} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PipelineDashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: pipelineData, isLoading, error } = useWorkOrderLifecycle();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Configure view modes - mobile gets list only, desktop gets table and card options
  const viewModeConfig: ViewModeConfig = {
    mobile: ['list'],
    desktop: ['table', 'card']
  };
  
  const { viewMode, setViewMode, allowedModes } = useViewMode({
    componentKey: 'pipeline-dashboard',
    config: viewModeConfig,
    defaultMode: 'table'
  });
  
  // Comprehensive filters
  const [filters, setFilters] = useState({
    search: '',
    operationalStatus: [] as string[],
    reportStatus: [] as string[],
    invoiceStatus: [] as string[],
    billingStatus: [] as string[],
    partnerId: '',
    subcontractorId: '',
    location: [] as string[],
    showOnlyActionable: false
  });

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

  // Calculate pipeline metrics
  const metrics = useMemo(() => {
    if (!pipelineData) return null;
    
    const data = pipelineData;
    return {
      // Operational metrics
      newOrders: data.filter(d => d.status === 'received').length,
      estimatesNeeded: data.filter(d => d.status === 'estimate_needed').length,
      inProgress: data.filter(d => d.status === 'in_progress').length,
      
      // Financial metrics
      awaitingReports: data.filter(d => d.status === 'completed' && !d.report_status).length,
      awaitingInvoices: data.filter(d => d.report_status === 'approved' && !d.invoice_status).length,
      readyToBill: data.filter(d => d.invoice_status === 'approved' && !d.partner_billed_at).length,
      
      // Totals with proper markup calculation
      totalPending: data.filter(d => d.invoice_status === 'submitted').reduce((sum, d) => sum + (d.subcontractor_bill_amount || 0), 0),
      totalReadyToBill: (() => {
        const readyToBillItems = data.filter(d => d.invoice_status === 'approved' && !d.partner_billed_at);
        return readyToBillItems.reduce((sum, wo) => {
          const cost = wo.subcontractor_bill_amount || 0;
          const markupPercent = wo.internal_markup_percentage || 30;
          const revenue = cost * (1 + markupPercent / 100);
          return sum + revenue;
        }, 0);
      })()
    };
  }, [pipelineData]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!pipelineData) return [];
    
    let filtered = [...pipelineData];
    
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.work_order_number?.toLowerCase().includes(search) ||
        item.title?.toLowerCase().includes(search) ||
        item.store_location?.toLowerCase().includes(search)
      );
    }
    
    // Status filters
    if (filters.operationalStatus.length > 0) {
      filtered = filtered.filter(item => filters.operationalStatus.includes(item.status));
    }
    
    // Location filter
    if (filters.location.length > 0) {
      filtered = filtered.filter(item => {
        const itemLocation = item.store_location || 'No location';
        return filters.location.includes(itemLocation);
      });
    }
    
    if (filters.showOnlyActionable) {
      filtered = filtered.filter(item => 
        item.status === 'received' ||
        item.status === 'estimate_needed' ||
        (item.status === 'completed' && !item.report_status) ||
        (item.report_status === 'approved' && !item.invoice_status) ||
        (item.invoice_status === 'approved' && !item.partner_billed_at)
      );
    }
    
    return filtered;
  }, [pipelineData, filters]);


  if (isLoading) return <TableSkeleton />;
  
  if (error) {
    return <EmptyState icon={AlertCircle} title="Error loading pipeline" description="Please try again" />;
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Orders</p>
                <p className="text-2xl font-bold">{metrics?.newOrders || 0}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimates Needed</p>
                <p className="text-2xl font-bold">{metrics?.estimatesNeeded || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready to Bill</p>
                <p className="text-2xl font-bold">{metrics?.readyToBill || 0}</p>
              </div>
              <CreditCard className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Ready</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics?.totalReadyToBill || 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Filters */}
      <div className="lg:hidden">
        <AdminFilterBar 
          title="Pipeline Filters"
          filterCount={Object.values(filters).filter(v => 
            Array.isArray(v) ? v.length > 0 : 
            typeof v === 'string' ? v !== '' : 
            typeof v === 'boolean' ? v === true : 
            false
          ).length}
          onClear={() => setFilters({
            search: '',
            operationalStatus: [],
            reportStatus: [],
            invoiceStatus: [],
            billingStatus: [],
            partnerId: '',
            subcontractorId: '',
            location: [],
            showOnlyActionable: false
          })}
        >
          <Input
            placeholder="Search work orders..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full md:w-64"
          />

          <MultiSelectFilter
            options={locationOptions}
            selectedValues={filters.location}
            onSelectionChange={(values) => setFilters(prev => ({ ...prev, location: values }))}
            placeholder="All locations"
            maxDisplayCount={2}
          />
          
          <MultiSelectFilter
            options={[
              { value: 'received', label: 'New' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'estimate_needed', label: 'Estimate Needed' },
              { value: 'estimate_approved', label: 'Estimate Approved' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' }
            ]}
            selectedValues={filters.operationalStatus}
            onSelectionChange={(values) => setFilters(prev => ({ ...prev, operationalStatus: values }))}
            placeholder="All statuses"
          />
          
          <Button
            variant={filters.showOnlyActionable ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, showOnlyActionable: !prev.showOnlyActionable }))}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Action Required
          </Button>
          
          {/* View Mode Switcher - only show on desktop with multiple allowed modes */}
          {!isMobile && (
            <ViewModeSwitcher
              value={viewMode}
              onValueChange={setViewMode}
              allowedModes={allowedModes}
            />
          )}
        </AdminFilterBar>
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setIsFilterOpen(true)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {Object.values(filters).filter(v => 
              Array.isArray(v) ? v.length > 0 : 
              typeof v === 'string' ? v !== '' : 
              typeof v === 'boolean' ? v === true : 
              false
            ).length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {Object.values(filters).filter(v => 
                  Array.isArray(v) ? v.length > 0 : 
                  typeof v === 'string' ? v !== '' : 
                  typeof v === 'boolean' ? v === true : 
                  false
                ).length}
              </Badge>
            )}
          </Button>
        </div>

        <ViewModeSwitcher
          value={viewMode}
          onValueChange={setViewMode}
          allowedModes={allowedModes}
        />
      </div>

      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="right" className="w-[480px]">
          <SheetHeader>
            <SheetTitle>Pipeline Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <AdminFilterBar 
              title=""
              filterCount={Object.values(filters).filter(v => 
                Array.isArray(v) ? v.length > 0 : 
                typeof v === 'string' ? v !== '' : 
                typeof v === 'boolean' ? v === true : 
                false
              ).length}
              onClear={() => setFilters({
                search: '',
                operationalStatus: [],
                reportStatus: [],
                invoiceStatus: [],
                billingStatus: [],
                partnerId: '',
                subcontractorId: '',
                location: [],
                showOnlyActionable: false
              })}
              collapsible={false}
            >
              <Input
                placeholder="Search work orders..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full"
              />

              <MultiSelectFilter
                options={locationOptions}
                selectedValues={filters.location}
                onSelectionChange={(values) => setFilters(prev => ({ ...prev, location: values }))}
                placeholder="All locations"
                maxDisplayCount={2}
              />
              
              <MultiSelectFilter
                options={[
                  { value: 'received', label: 'New' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'estimate_needed', label: 'Estimate Needed' },
                  { value: 'estimate_approved', label: 'Estimate Approved' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' }
                ]}
                selectedValues={filters.operationalStatus}
                onSelectionChange={(values) => setFilters(prev => ({ ...prev, operationalStatus: values }))}
                placeholder="All statuses"
              />
              
              <Button
                variant={filters.showOnlyActionable ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, showOnlyActionable: !prev.showOnlyActionable }))}
                className="w-full justify-start"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Action Required
              </Button>
            </AdminFilterBar>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content - Responsive Views */}
      {viewMode === 'table' ? (
        <Card>
          <CardHeader>
            <CardTitle>Complete Work Order Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveTableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order</TableHead>
                    <TableHead>Partner / Location</TableHead>
                    <TableHead>Operational Status</TableHead>
                    <TableHead>Report</TableHead>
                    <TableHead>SC Invoice</TableHead>
                    <TableHead>Partner Invoicing</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow 
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/work-orders/${item.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.work_order_number}</p>
                          <p className="text-sm text-muted-foreground">{item.title}</p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <p className="text-sm">{item.partner_organization_name}</p>
                          <p className="text-xs text-muted-foreground">{item.store_location}</p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <WorkOrderStatusBadge status={item.status} showEstimateIndicator workOrder={item} />
                      </TableCell>
                      
                      <TableCell>
                        <ReportStatusBadge status={item.report_status || "not_submitted"} />
                      </TableCell>
                      
                      <TableCell>
                        <FinancialStatusBadge status={item.invoice_status || "pending"} />
                      </TableCell>
                      
                      <TableCell>
                        <ComputedFinancialStatusBadge status={item.financial_status || "not_billed"} />
                      </TableCell>
                      
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {item.age_days}d
                        </p>
                      </TableCell>
                      
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/work-orders/${item.id}`);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTableWrapper>
            
            {filteredData.length === 0 && (
              <EmptyState
                icon={ClipboardList}
                title="No work orders found"
                description="Adjust your filters or create a new work order"
              />
            )}
          </CardContent>
        </Card>
      ) : (
        /* Card/List View */
        <div className={`
          ${viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}
        `}>
          {filteredData.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={ClipboardList}
                title="No work orders found"
                description="Adjust your filters or create a new work order"
              />
            </div>
          ) : (
            filteredData.map((item) => (
                      <PipelineMobileCard
                        key={item.id}
                        item={item}
                        onSelect={(item) => navigate(`/admin/work-orders/${item.id}`)}
                      />
            ))
          )}
        </div>
      )}
    </div>
  );
}