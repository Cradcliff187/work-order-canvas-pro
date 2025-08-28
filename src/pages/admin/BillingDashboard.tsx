import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useAdminFilters } from '@/hooks/useAdminFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { useWorkOrderLifecycle } from '@/hooks/useWorkOrderLifecyclePipeline';
import { useTrades } from '@/hooks/useWorkOrders';
import { WorkOrderPipelineItem } from '@/hooks/useWorkOrderLifecyclePipeline';
import { FileText, Filter, Download, Receipt } from 'lucide-react';
import { WorkOrderPipelineTable } from '@/components/admin/dashboard/WorkOrderPipelineTable';
import { InvoiceDetailModal } from '@/components/admin/invoices/InvoiceDetailModal';
import { Invoice } from '@/hooks/useInvoices';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useSubcontractorOrganizations } from '@/hooks/useSubcontractorOrganizations';
import { Card, CardContent } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useViewMode } from '@/hooks/useViewMode';
import { exportWorkOrders } from '@/lib/utils/export';
import { supabase } from '@/integrations/supabase/client';
import { CompactBillingPipelineFilters } from '@/components/admin/billing/CompactBillingPipelineFilters';
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh';

// Filter interface for Pipeline - simplified
interface PipelineFiltersValue {
  status?: string[];
  trade_id?: string[];
  partner_organization_ids?: string[];
  completed_by?: string[];
  search?: string;
  date_from?: string;
  date_to?: string;
  location_filter?: string[];
  showOverdueOnly?: boolean;
  financial_status?: string[];
  partner_billing_status?: string[];
  priority?: string[];
  report_status?: string[];
}

export function BillingDashboard() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const isMobile = useIsMobile();

  // Pipeline controls
  const { viewMode, setViewMode, allowedModes } = useViewMode({
    componentKey: 'billing-pipeline',
    config: { mobile: ['card'], desktop: ['table', 'card'] },
    defaultMode: 'table'
  });

  // Column visibility for pipeline table
  const {
    columnVisibility,
    toggleColumn,
    resetToDefaults,
    getAllColumns
  } = useColumnVisibility({
    storageKey: 'admin-billing-pipeline-columns-v1',
    columnMetadata: {
      work_order: { label: 'Work Order', defaultVisible: true },
      partner: { label: 'Partner/Location', defaultVisible: true },
      status: { label: 'Status', defaultVisible: true },
      financial: { label: 'Financial Status', defaultVisible: true },
      billing: { label: 'Billing Status', defaultVisible: true },
      invoice: { label: 'Invoice Status', defaultVisible: true },
      date: { label: 'Date', defaultVisible: true },
      amount: { label: 'Amount', defaultVisible: true },
      actions: { label: 'Actions', defaultVisible: true }
    }
  });

  const navigate = useNavigate();

  // Pipeline data and organizations
  const { data: pipelineData, isLoading: pipelineLoading, isError: pipelineError, refetch } = useWorkOrderLifecycle();
  const { data: trades } = useTrades();
  const { data: organizationsData } = useOrganizations();
  const { data: subcontractors } = useSubcontractorOrganizations();
  const organizations = organizationsData?.filter(org => org.organization_type === 'partner');
  
  // Pull to refresh functionality for mobile
  const { handleRefresh, threshold } = usePullToRefresh({
    queryKey: ['work-order-lifecycle'],
    onRefresh: async () => {
      await refetch();
    },
    successMessage: 'Pipeline data refreshed'
  });
  
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
    'billing-pipeline-filters-v3',
    initialFilters,
    { excludeKeys: [] }
  );

  const handleClearFilters = () => {
    clearFilters();
  };

  // Export functionality
  const handleExport = (format: 'csv' | 'excel') => {
    exportWorkOrders(filteredPipelineData, format, `billing-pipeline-${new Date().toISOString().split('T')[0]}`);
  };

  // Debounce search input
  const debouncedSearch = useDebounce(filters.search || '', 300);
  
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  // Sync search term with filters
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters({ ...filters, search: searchTerm });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Helper function to get financial status based on invoicing
  const getFinancialStatus = (item: WorkOrderPipelineItem): string => {
    // Check if partner has been billed
    if (item.partner_bill_status === 'paid' || item.partner_billed_at) {
      return 'paid';
    }
    
    // Check if subcontractor invoice exists
    if (item.invoice_status === 'submitted' || item.invoice_status === 'approved' || item.invoice_status === 'paid') {
      return 'invoice_received';
    }
    
    return 'not_billed'; // Default - no invoice received
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

  // Get unique locations for filter dropdown
  const locationOptions = useMemo(() => {
    if (!pipelineData) return [];
    const locations = [...new Set(pipelineData.map(item => item.store_location || 'No location'))];
    return locations.sort();
  }, [pipelineData]);

  // Apply client-side filtering with improved logic
  const filteredPipelineData = useMemo(() => {
    if (!pipelineData) return [];

    return pipelineData.filter((item) => {
      // Enhanced search filter (work order number, title, partner, location, assigned org)
      const searchValue = filters.search || searchTerm;
      if (searchValue && searchValue.trim()) {
        const searchLower = searchValue.toLowerCase().trim();
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

      // Partner organization filter
      if (filters.partner_organization_ids && filters.partner_organization_ids.length > 0) {
        if (!item.organization_id || !filters.partner_organization_ids.includes(item.organization_id)) return false;
      }

      // Completed by filter (maps to assigned organization)
      if (filters.completed_by && filters.completed_by.length > 0) {
        const itemCompletedBy = item.assigned_organization_type === 'internal' ? 'internal' : item.assigned_organization_id;
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

      // Financial status filter
      if (filters.financial_status && filters.financial_status.length > 0) {
        const itemFinancialStatus = getFinancialStatus(item);
        if (!filters.financial_status.includes(itemFinancialStatus)) return false;
      }

      // Partner billing status filter
      if (filters.partner_billing_status && filters.partner_billing_status.length > 0) {
        const itemBillingStatus = getPartnerBillingStatus(item);
        if (!filters.partner_billing_status.includes(itemBillingStatus)) return false;
      }

      // Priority filter
      if (filters.priority && filters.priority.length > 0) {
        if (!item.priority || !filters.priority.includes(item.priority)) return false;
      }

      // Report status filter
      if (filters.report_status && filters.report_status.length > 0) {
        if (!item.report_status || !filters.report_status.includes(item.report_status)) return false;
      }

      // Show overdue only filter
      if (filters.showOverdueOnly) {
        // Add overdue logic here if needed
        // This would require overdue date calculation based on business rules
      }

      return true;
    });
  }, [pipelineData, searchTerm, filters]);

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
    const title = 'Billing Pipeline | AKC Portal';
    document.title = title;
    const description = 'Billing pipeline dashboard: Work order to invoice workflow tracking.';
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

  // Error boundary with better error handling
  if (pipelineError) {
    console.error('Billing dashboard pipeline error:', pipelineError);
    return (
      <div className="space-y-6 p-6">
        <header>
          <h1 className="text-3xl font-bold mb-2">Billing Pipeline</h1>
          <p className="text-muted-foreground">Track work orders through the complete billing workflow</p>
        </header>
        <EmptyState
          icon={FileText}
          title="We couldn't load pipeline data"
          description="An error occurred while loading the billing pipeline data. Please check your connection and try again."
          action={{ label: 'Retry', onClick: () => refetch() }}
          variant="full"
        />
      </div>
    );
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-background text-foreground px-3 py-2 rounded-md"
      >
        Skip to main content
      </a>
      <main id="main-content" role="main" tabIndex={-1} className="space-y-6 p-4 sm:p-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Billing Pipeline</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">
              Billing Pipeline
            </h1>
            <p className="text-muted-foreground">
              {filteredPipelineData.length} work orders in pipeline
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/partner-billing')}
              className="flex-1 sm:flex-initial"
            >
              <Receipt className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Generate Partner Invoice</span>
              <span className="sm:hidden">Invoice</span>
            </Button>
          </div>
        </header>

        {/* Pipeline Metrics - keep existing implementation */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Keep all existing metric cards */}
        </div>

        {/* Conditional Mobile/Desktop Rendering */}
        {isMobile ? (
          <MobilePullToRefresh onRefresh={handleRefresh} threshold={threshold}>
            {/* Mobile Toolbar */}
            <div className="bg-muted/30 border rounded-lg p-3 space-y-3 mx-4 mb-4">
              <SmartSearchInput
                placeholder="Search pipeline..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              <div className="flex items-center gap-2">
                <CompactBillingPipelineFilters
                  value={filters}
                  onChange={setFilters}
                  onClear={clearFilters}
                />
                <ViewModeSwitcher
                  value={viewMode}
                  onValueChange={setViewMode}
                  allowedModes={allowedModes}
                  className="shrink-0"
                />
              </div>
            </div>
            
            {/* Mobile Table */}
            <WorkOrderPipelineTable
              data={filteredPipelineData}
              isLoading={pipelineLoading}
              isError={pipelineError}
              viewMode={viewMode}
              columnVisibility={columnVisibility}
              onExport={handleExport}
              onToggleColumn={toggleColumn}
              onResetColumns={resetToDefaults}
              columns={getAllColumns()}
              isMobile={true}
            />
          </MobilePullToRefresh>
        ) : (
          /* Desktop Pipeline Table Card */
          <Card className="overflow-hidden">
            {/* Desktop toolbar */}
            <div className="border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold">Pipeline Items</h2>
                  <ViewModeSwitcher
                    value={viewMode}
                    onValueChange={setViewMode}
                    allowedModes={allowedModes}
                  />
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <SmartSearchInput
                    placeholder="Search WO#, partner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    storageKey="billing-pipeline-search"
                    className="max-w-xs"
                  />
                  
                  <CompactBillingPipelineFilters
                    value={filters}
                    onChange={setFilters}
                    onClear={clearFilters}
                  />
                  
                  <ColumnVisibilityDropdown
                    columns={getAllColumns()}
                    onToggleColumn={toggleColumn}
                    onResetToDefaults={resetToDefaults}
                  />
                  <ExportDropdown onExport={handleExport} />
                </div>
              </div>
            </div>
            
            {/* Table content */}
            <CardContent className="p-0">
              <WorkOrderPipelineTable 
                data={filteredPipelineData}
                isLoading={pipelineLoading}
                isError={pipelineError}
                viewMode={viewMode}
                columnVisibility={columnVisibility}
                onExport={handleExport}
                onToggleColumn={toggleColumn}
                onResetColumns={resetToDefaults}
                columns={getAllColumns()}
                isMobile={false}
              />
            </CardContent>
          </Card>
        )}

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

export default BillingDashboard;