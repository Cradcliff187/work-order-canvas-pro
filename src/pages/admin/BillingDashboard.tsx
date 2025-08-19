import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh';
import { CompactMobileCard } from '@/components/admin/shared/CompactMobileCard';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useAdminFilters } from '@/hooks/useAdminFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { useWorkOrderLifecycle } from '@/hooks/useWorkOrderLifecyclePipeline';
import { useTrades } from '@/hooks/useWorkOrders';
import { WorkOrderPipelineItem } from '@/hooks/useWorkOrderLifecyclePipeline';
import { 
  FileText, 
  Plus, 
  DollarSign,
  Clock,
  ReceiptText,
  Building2,
  Filter,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { KPICard } from '@/components/analytics/KPICard';
import { WorkOrderPipelineTable } from '@/components/admin/dashboard/WorkOrderPipelineTable';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InvoiceDetailModal } from '@/components/admin/invoices/InvoiceDetailModal';
import { Invoice } from '@/hooks/useInvoices';

interface DashboardMetrics {
  unbilledReports: {
    count: number;
    totalValue: number;
  };
  recentPartnerInvoices: Array<{
    id: string;
    invoice_number: string;
    invoice_date: string;
    total_amount: number;
    partner_organization: { name: string };
    status: string;
  }>;
  recentSubcontractorInvoices: Array<{
    id: string;
    internal_invoice_number: string;
    total_amount: number;
    submitted_at: string;
    status: string;
    subcontractor_organization: { name: string };
    work_order_numbers: string[];
  }>;
  monthlyTotals: {
    partnerInvoices: number;
    subcontractorInvoices: number;
    totalValue: number;
  };
}

async function fetchBillingMetrics(): Promise<DashboardMetrics> {
  // Fetch unbilled approved reports
  const { data: unbilledReports, error: reportsError } = await supabase
    .from('work_order_reports')
    .select('id, partner_billed_amount')
    .eq('status', 'approved')
    .is('partner_invoice_id', null);

  if (reportsError) throw reportsError;

  // Fetch recent partner invoices
  const { data: partnerInvoices, error: partnerError } = await supabase
    .from('partner_invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      total_amount,
      status,
      partner_organization:organizations!partner_organization_id(name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (partnerError) throw partnerError;

  // Fetch recent subcontractor invoices with work order numbers
  const { data: subcontractorInvoices, error: subError } = await supabase
    .from('invoices')
    .select(`
      id,
      internal_invoice_number,
      total_amount,
      submitted_at,
      status,
      subcontractor_organization:organizations!subcontractor_organization_id(name),
      invoice_work_orders(
        work_orders(work_order_number)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (subError) throw subError;

  // Transform subcontractor invoices to include work order numbers
  const transformedSubcontractorInvoices = subcontractorInvoices?.map(invoice => ({
    ...invoice,
    work_order_numbers: invoice.invoice_work_orders?.map(
      (iwo: any) => iwo.work_orders?.work_order_number
    ).filter(Boolean) || []
  })) || [];

  // Calculate monthly totals
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: monthlyPartner } = await supabase
    .from('partner_invoices')
    .select('total_amount')
    .gte('created_at', startOfMonth.toISOString());

  const { data: monthlySub } = await supabase
    .from('invoices')
    .select('total_amount')
    .gte('created_at', startOfMonth.toISOString());

  const unbilledCount = unbilledReports?.length || 0;
  const unbilledValue = unbilledReports?.reduce((sum, report) => sum + (report.partner_billed_amount || 0), 0) || 0;

  return {
    unbilledReports: {
      count: unbilledCount,
      totalValue: unbilledValue
    },
    recentPartnerInvoices: partnerInvoices || [],
    recentSubcontractorInvoices: transformedSubcontractorInvoices,
    monthlyTotals: {
      partnerInvoices: monthlyPartner?.length || 0,
      subcontractorInvoices: monthlySub?.length || 0,
      totalValue: (monthlyPartner?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0) + 
                  (monthlySub?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0)
    }
  };
}

function useBillingMetrics() {
  return useQuery({
    queryKey: ['billing-metrics'],
    queryFn: fetchBillingMetrics,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 60 * 1000, // Cache for 1 minute to reduce churn
  });
}

// Filter interface for Pipeline tab - adapted to WorkOrderFilters format
interface PipelineFiltersValue {
  status?: string[];
  trade_id?: string[];
  partner_organization_ids?: string[];
  completed_by?: string[];
  search?: string;
  date_from?: string;
  date_to?: string;
  location_filter?: string[];
}

// Filter options for Pipeline
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

export default function BillingDashboard() {
  const navigate = useNavigate();
  const { data: metrics, isLoading, error, refetch } = useBillingMetrics();
  const isMobile = useIsMobile();
  
  // Pull to refresh functionality for mobile
  const { handleRefresh, threshold } = usePullToRefresh({
    queryKey: ['billing-metrics'],
    onRefresh: async () => {
      await refetch();
    },
    successMessage: 'Billing data refreshed'
  });
  
  // Modal state for invoice details
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = React.useState(false);

  // Pipeline filter state
  const { data: pipelineData, isLoading: pipelineLoading, isError: pipelineError } = useWorkOrderLifecycle();
  const { data: trades } = useTrades();
  
  // Default filters - show all work orders
  const initialFilters: PipelineFiltersValue = {
    status: [],
    trade_id: [],
    partner_organization_ids: [],
    completed_by: [],
    search: '',
    date_from: undefined,
    date_to: undefined,
    location_filter: []
  };

  const { filters, setFilters, clearFilters, filterCount } = useAdminFilters(
    'billing-pipeline-filters',
    initialFilters,
    { excludeKeys: [] }
  );

  const handleClearFilters = () => {
    clearFilters();
  };

  // Debounce search input
  const debouncedSearch = useDebounce(filters.search || '', 300);
  
  // Track search separately for WorkOrderFilters
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

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
  const filteredPipelineData = useMemo(() => {
    if (!pipelineData) return [];

    return pipelineData.filter((item) => {
      // Enhanced search filter (work order number, title, partner, location, assigned org)
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        const matchesSearch = 
          item.work_order_number?.toLowerCase().includes(searchLower) ||
          item.title?.toLowerCase().includes(searchLower) ||
          item.partner_organization_name?.toLowerCase().includes(searchLower) ||
          item.store_location?.toLowerCase().includes(searchLower) ||
          item.assigned_organization_name?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter (maps to operational status)
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(item.status)) return false;
      }

      // Trade filter - Skip for now as trade info not in pipeline data
      // if (filters.trade_id && filters.trade_id.length > 0) {
      //   // Trade filtering would require additional join in pipeline query
      // }

      // Partner organization filter
      if (filters.partner_organization_ids && filters.partner_organization_ids.length > 0) {
        if (!item.organization_id || !filters.partner_organization_ids.includes(item.organization_id)) return false;
      }

      // Completed by filter (maps to assigned organization)
      if (filters.completed_by && filters.completed_by.length > 0) {
        const itemCompletedBy = item.assigned_organization_id === 'internal' ? 'internal' : item.assigned_organization_id;
        if (!itemCompletedBy || !filters.completed_by.includes(itemCompletedBy)) return false;
      }

      // Date range filter
      if (filters.date_from || filters.date_to) {
        const itemDate = new Date(item.created_at);
        if (filters.date_from && itemDate < new Date(filters.date_from)) return false;
        if (filters.date_to && itemDate > new Date(filters.date_to)) return false;
      }

      // Location filter
      if (filters.location_filter && filters.location_filter.length > 0) {
        const itemLocation = item.store_location || 'No location';
        if (!filters.location_filter.includes(itemLocation)) return false;
      }

      return true;
    });
  }, [pipelineData, searchTerm, filters]);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Handler for opening invoice modal
  const handleInvoiceClick = async (invoiceId: string) => {
    try {
      // Fetch the full invoice data
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          *,
          subcontractor_organization:organizations!subcontractor_organization_id(*),
          submitted_by_user:profiles!submitted_by(id, first_name, last_name),
          approved_by_user:profiles!approved_by(id, first_name, last_name),
          invoice_work_orders(
            id,
            work_order_id,
            amount,
            description,
            work_order:work_orders(
              id,
              work_order_number,
              title
            )
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      
      setSelectedInvoice(invoice);
      setInvoiceModalOpen(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    }
  };

  React.useEffect(() => {
    const title = 'Billing Dashboard | AKC Portal';
    document.title = title;
    const description = 'Admin billing dashboard: KPIs, recent invoices, and transactions.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description.slice(0, 160));

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);
  }, []);

if (error) {
  return (
    <EmptyState
      icon={FileText}
      title="We couldn't load billing data"
      description="Please check your connection and try again."
      action={{ label: 'Retry', onClick: () => refetch() }}
      variant="full"
    />
  );
}

  const renderMobileInvoiceCard = (invoice: any, type: 'partner' | 'subcontractor') => {
    const isPartner = type === 'partner';
    const title = isPartner ? invoice.invoice_number : invoice.internal_invoice_number;
    const subtitle = isPartner 
      ? `${invoice.partner_organization?.name} • ${format(new Date(invoice.invoice_date), 'MMM d, yyyy')}`
      : `${invoice.subcontractor_organization?.name} • ${format(new Date(invoice.submitted_at), 'MMM d, yyyy')}`;
    
    const handleClick = () => {
      if (isPartner) {
        navigate(`/admin/partner-billing/invoices/${invoice.id}`);
      } else {
        handleInvoiceClick(invoice.id);
      }
    };

    return (
      <CompactMobileCard
        key={invoice.id}
        title={title}
        subtitle={subtitle}
        badge={
          <FinancialStatusBadge 
            status={invoice.status} 
          />
        }
        trailing={
          <span className="text-sm font-medium text-right">
            {formatCurrency(invoice.total_amount)}
          </span>
        }
        onClick={handleClick}
      />
    );
  };

  return (
    <>
      <LoadingOverlay isVisible={isLoading} message="Loading billing data..." />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-background text-foreground px-3 py-2 rounded-md"
      >
        Skip to main content
      </a>
      <main id="main-content" role="main" tabIndex={-1} className={`space-y-6 ${isMobile ? 'p-4' : 'p-6'}`}>
        <header>
          <h1 className={`font-bold mb-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>Billing Dashboard</h1>
          <p className="text-muted-foreground">Monitor billing activities and manage invoices</p>
        </header>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="min-w-max px-0 overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className={`space-y-6 mt-6`}>
          {isMobile && (
            <div className="min-h-screen"
              onTouchStart={(e) => {
                if (window.scrollY === 0) {
                  const touch = e.touches[0];
                  const startY = touch.clientY;
                  const handleTouchMove = (moveEvent: TouchEvent) => {
                    const currentTouch = moveEvent.touches[0];
                    const pullDistance = currentTouch.clientY - startY;
                    if (pullDistance > threshold) {
                      handleRefresh();
                      document.removeEventListener('touchmove', handleTouchMove);
                    }
                  };
                  document.addEventListener('touchmove', handleTouchMove, { passive: true });
                  const handleTouchEnd = () => {
                    document.removeEventListener('touchmove', handleTouchMove);
                    document.removeEventListener('touchend', handleTouchEnd);
                  };
                  document.addEventListener('touchend', handleTouchEnd, { once: true });
                }
              }}
            >
              <div className="space-y-6">
                {/* Mobile KPI Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <KPICard
                    title="Unbilled Reports"
                    value={isLoading ? 0 : (metrics?.unbilledReports.count || 0)}
                    icon={Clock}
                    isLoading={isLoading}
                  />
                  <KPICard
                    title="Partner Invoices"
                    value={isLoading ? 0 : (metrics?.monthlyTotals.partnerInvoices || 0)}
                    icon={Building2}
                    isLoading={isLoading}
                  />
                  <KPICard
                    title="Subcontractor Invoices"
                    value={isLoading ? 0 : (metrics?.monthlyTotals.subcontractorInvoices || 0)}
                    icon={ReceiptText}
                    isLoading={isLoading}
                  />
                  <KPICard
                    title="Monthly Total"
                    value={isLoading ? 0 : (metrics?.monthlyTotals.totalValue || 0)}
                    format="currency"
                    icon={DollarSign}
                    isLoading={isLoading}
                  />
                </div>

                {/* Mobile Quick Actions */}
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    onClick={() => navigate('/admin/invoices')}
                    className="h-12 justify-start"
                    size="lg"
                  >
                    <Plus className="h-4 w-4 mr-3" />
                    Enter Subcontractor Invoice
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/admin/partner-billing/select-reports')}
                    className="h-12 justify-start"
                    size="lg"
                  >
                    <Building2 className="h-4 w-4 mr-3" />
                    Generate Partner Invoices
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/admin/invoices')}
                    className="h-12 justify-start"
                    size="lg"
                  >
                    <FileText className="h-4 w-4 mr-3" />
                    View All Invoices
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/admin/reports?status=approved&billing_status=unbilled')}
                    className="h-12 justify-start"
                    size="lg"
                  >
                    <Clock className="h-4 w-4 mr-3" />
                    View Unbilled Reports
                  </Button>
                </div>

                {/* Mobile Recent Activity */}
                <div className="space-y-6">
                  {/* Recent Partner Invoices - Mobile */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Recent Partner Invoices</h3>
                    {isLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="p-3 rounded-lg border">
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : metrics?.recentPartnerInvoices && metrics.recentPartnerInvoices.length > 0 ? (
                      <div className="space-y-3">
                        {metrics.recentPartnerInvoices.slice(0, 3).map((invoice) => 
                          renderMobileInvoiceCard(invoice, 'partner')
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">No partner invoices</p>
                      </div>
                    )}
                  </div>

                  {/* Recent Subcontractor Invoices - Mobile */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Recent Subcontractor Invoices</h3>
                    {isLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="p-3 rounded-lg border">
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : metrics?.recentSubcontractorInvoices && metrics.recentSubcontractorInvoices.length > 0 ? (
                      <div className="space-y-3">
                        {metrics.recentSubcontractorInvoices.slice(0, 3).map((invoice) => 
                          renderMobileInvoiceCard(invoice, 'subcontractor')
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ReceiptText className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">No subcontractor invoices</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isMobile && (
            <>
              {/* Desktop KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Unbilled Reports"
              value={isLoading ? 0 : (metrics?.unbilledReports.count || 0)}
              icon={Clock}
              isLoading={isLoading}
            />
            <KPICard
              title="Partner Invoices"
              value={isLoading ? 0 : (metrics?.monthlyTotals.partnerInvoices || 0)}
              icon={Building2}
              isLoading={isLoading}
            />
            <KPICard
              title="Subcontractor Invoices"
              value={isLoading ? 0 : (metrics?.monthlyTotals.subcontractorInvoices || 0)}
              icon={ReceiptText}
              isLoading={isLoading}
            />
            <KPICard
              title="Monthly Total"
              value={isLoading ? 0 : (metrics?.monthlyTotals.totalValue || 0)}
              format="currency"
              icon={DollarSign}
              isLoading={isLoading}
            />
          </div>

              {/* Desktop Quick Actions */}
              <div role="region" aria-label="Quick actions" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Button
              onClick={() => navigate('/admin/invoices')}
              aria-label="Enter Subcontractor Invoice"
            >
              <Plus className="h-4 w-4 mr-2" />
              Enter Subcontractor Invoice
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/partner-billing/select-reports')}
              aria-label="Generate Partner Invoices"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Generate Partner Invoices
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/invoices')}
              aria-label="View All Invoices"
            >
              <FileText className="h-4 w-4 mr-2" />
              View All Invoices
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/reports?status=approved&billing_status=unbilled')}
              aria-label="View Unbilled Reports"
            >
              <Clock className="h-4 w-4 mr-2" />
              View Unbilled Reports
            </Button>
          </div>

              {/* Desktop Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Partner Invoices */}
            <Card role="region" aria-label="Recent Partner Invoices">
              <CardHeader>
                <CardTitle>Recent Partner Invoices</CardTitle>
                <CardDescription>Latest partner invoices generated</CardDescription>
              </CardHeader>
              <CardContent aria-busy={isLoading}>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                    ))}
                  </div>
                ) : metrics?.recentPartnerInvoices && metrics.recentPartnerInvoices.length > 0 ? (
                  <div className="space-y-4">
                    {metrics.recentPartnerInvoices.map((invoice) => (
                      <button
                        key={invoice.id}
                        type="button"
                        onClick={() => navigate(`/admin/partner-billing/invoices/${invoice.id}`)}
                        className="w-full flex justify-between items-center rounded-md px-2 py-2 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none"
                        aria-label={`View partner invoice ${invoice.invoice_number} for ${invoice.partner_organization.name} dated ${format(new Date(invoice.invoice_date), 'MMM d, yyyy')}`}
                      >
                        <div className="text-left">
                          <p className="font-medium text-sm">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.partner_organization.name} • {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatCurrency(invoice.total_amount)}</p>
                          <FinancialStatusBadge status={invoice.status} size="sm" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Building2}
                    title="No recent partner invoices"
                    description="Generate partner invoices from approved reports."
                    action={{ label: 'Generate Partner Invoices', onClick: () => navigate('/admin/partner-billing/select-reports') }}
                    variant="card"
                  />
                )}
              </CardContent>
            </Card>

            {/* Recent Subcontractor Invoices */}
            <Card role="region" aria-label="Recent Subcontractor Invoices">
              <CardHeader>
                <CardTitle>Recent Subcontractor Invoices</CardTitle>
                <CardDescription>Latest subcontractor invoices processed</CardDescription>
              </CardHeader>
              <CardContent aria-busy={isLoading}>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                    ))}
                  </div>
                ) : metrics?.recentSubcontractorInvoices && metrics.recentSubcontractorInvoices.length > 0 ? (
                  <div className="space-y-4">
                    {metrics.recentSubcontractorInvoices.map((invoice) => (
                      <button
                        key={invoice.id}
                        type="button"
                        onClick={() => handleInvoiceClick(invoice.id)}
                        className="w-full flex justify-between items-center rounded-md px-2 py-2 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none"
                        aria-label={`View subcontractor invoice ${invoice.internal_invoice_number} for ${invoice.subcontractor_organization?.name || 'Unknown'} dated ${format(new Date(invoice.submitted_at), 'MMM d, yyyy')}`}
                      >
                        <div className="text-left">
                          <p className="font-medium text-sm">{invoice.internal_invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.subcontractor_organization?.name || 'Unknown'} • {format(new Date(invoice.submitted_at), 'MMM d, yyyy')}
                          </p>
                          {invoice.work_order_numbers.length > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              WO: {invoice.work_order_numbers.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatCurrency(invoice.total_amount || 0)}</p>
                          <FinancialStatusBadge status={invoice.status} size="sm" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={ReceiptText}
                    title="No recent subcontractor invoices"
                    description="Enter a subcontractor invoice to see it here."
                    action={{ label: 'Enter Subcontractor Invoice', onClick: () => navigate('/admin/invoices') }}
                    variant="card"
                  />
                )}
              </CardContent>
            </Card>
              </div>
            </>
          )}

        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search and Filter Group */}
            <div className="flex flex-1 gap-2">
              <SmartSearchInput
                placeholder="Search work orders..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="flex-1"
                storageKey="billing-pipeline-search"
              />
              
              <AdminFilterBar
                title="Filters"
                filterCount={filterCount}
                onClear={handleClearFilters}
                collapsible={true}
                sections={{
                  essential: (
                    <>
                      <div className="space-y-2">
                        <Label>Operational Status</Label>
                        <MultiSelectFilter
                          options={operationalStatusOptions}
                          selectedValues={filters.status || []}
                          onSelectionChange={(status) => setFilters({ ...filters, status })}
                          placeholder="Select operational status"
                          maxDisplayCount={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Partner Organization</Label>
                        <MultiSelectFilter
                          options={[]} // Will be populated by actual data
                          selectedValues={filters.partner_organization_ids || []}
                          onSelectionChange={(ids) => setFilters({ ...filters, partner_organization_ids: ids })}
                          placeholder="Select partners"
                          maxDisplayCount={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Completed By</Label>
                        <MultiSelectFilter
                          options={[
                            { value: 'internal', label: 'Internal' },
                            // Subcontractor options would be populated here
                          ]}
                          selectedValues={filters.completed_by || []}
                          onSelectionChange={(completed_by) => setFilters({ ...filters, completed_by })}
                          placeholder="Select assignee type"
                          maxDisplayCount={1}
                        />
                      </div>
                    </>
                  ),
                  advanced: (
                    <>
                      <div className="space-y-2">
                        <Label>Trade</Label>
                        <MultiSelectFilter
                          options={trades?.map(trade => ({ value: trade.id, label: trade.name })) || []}
                          selectedValues={filters.trade_id || []}
                          onSelectionChange={(trade_id) => setFilters({ ...filters, trade_id })}
                          placeholder="Select trade"
                          maxDisplayCount={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <MultiSelectFilter
                          options={locationOptions}
                          selectedValues={filters.location_filter || []}
                          onSelectionChange={(location_filter) => setFilters({ ...filters, location_filter })}
                          placeholder="Select location"
                          maxDisplayCount={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date Range</Label>
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !filters.date_from && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.date_from ? format(new Date(filters.date_from), 'PPP') : 'From date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={filters.date_from ? new Date(filters.date_from) : undefined}
                                onSelect={(date) => setFilters({ ...filters, date_from: date ? format(date, 'yyyy-MM-dd') : undefined })}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !filters.date_to && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.date_to ? format(new Date(filters.date_to), 'PPP') : 'To date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={filters.date_to ? new Date(filters.date_to) : undefined}
                                onSelect={(date) => setFilters({ ...filters, date_to: date ? format(date, 'yyyy-MM-dd') : undefined })}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </>
                  )
                }}
              />
            </div>
            
            {/* Action Buttons Group */}
            <div className="flex gap-2 flex-wrap lg:flex-nowrap">
              <ExportDropdown onExport={() => {}} variant="outline" size="sm" />
              <Button onClick={() => navigate('/admin/work-orders/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Work Order
              </Button>
            </div>
          </div>

          <WorkOrderPipelineTable 
            data={filteredPipelineData}
            isLoading={pipelineLoading}
            isError={pipelineError}
          />

        </TabsContent>
      </Tabs>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={invoiceModalOpen}
        onClose={() => {
          setInvoiceModalOpen(false);
          setSelectedInvoice(null);
        }}
      />
      </main>
    </>
  );
}
