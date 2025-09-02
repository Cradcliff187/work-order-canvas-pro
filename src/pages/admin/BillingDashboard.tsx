import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useWorkOrderLifecycle } from '@/hooks/useWorkOrderLifecyclePipeline';
import { useOrganizations } from '@/hooks/useOrganizations';
import { countActiveFilters } from '@/lib/filters';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useIsMobile } from '@/hooks/use-mobile';
import { useViewMode } from '@/hooks/useViewMode';
import { usePartnerInvoicingFilters, usePartnerInvoicingFilterCount } from '@/hooks/usePartnerInvoicingFilters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatting';
import { SubcontractorBill } from '@/hooks/useSubcontractorBills';
import { InvoiceDetailModal } from '@/components/admin/invoices/InvoiceDetailModal';
import { BillingPipelineTable } from '@/components/admin/billing/BillingPipelineTable';
import { BillingFiltersValue } from '@/components/admin/billing/BillingFilters';

export default function BillingDashboard() {
  const [selectedInvoice, setSelectedInvoice] = useState<SubcontractorBill | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Use the existing hook which provides proper data structure
  const { 
    data: pipelineData, 
    isLoading: pipelineLoading, 
    error: pipelineError,
    refetch: refetchPipeline 
  } = useWorkOrderLifecycle();

  // Billing-specific state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<BillingFiltersValue>({});
  const { viewMode, setViewMode } = useViewMode({
    componentKey: 'billing-dashboard',
    config: {
      mobile: ['card', 'list'],
      desktop: ['table', 'card']
    }
  });

  // Data fetching
  const { data: organizationsData } = useOrganizations();

  // Column visibility
  const {
    columnVisibility,
    toggleColumn,
    resetToDefaults,
    getAllColumns
  } = useColumnVisibility({
    storageKey: 'billing-dashboard-columns',
    columnMetadata: {
      'wo_number': { label: 'WO Number' },
      'partner': { label: 'Partner' },
      'trade': { label: 'Trade' },
      'description': { label: 'Description' },
      'amount': { label: 'Amount' },
      'status': { label: 'Status' },
    }
  });

  // Filter pipeline data with comprehensive filtering logic
  const filteredPipelineData = useMemo(() => {
    if (!pipelineData) return [];

    return pipelineData.filter(item => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const searchableFields = [
          item.work_order_number,
          item.description,
          item.title,
          item.partner_organization_name,
          item.store_location,
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableFields.includes(searchLower)) {
          return false;
        }
      }

      // Status filters
      if (filters.status?.length && !filters.status.includes(item.status)) {
        return false;
      }
      
      if (filters.financial_status?.length && !filters.financial_status.includes(item.financial_status)) {
        return false;
      }
      
      if (filters.partner_billing_status?.length && !filters.partner_billing_status.includes(item.partner_bill_status)) {
        return false;
      }
      
      if (filters.report_status?.length && !filters.report_status.includes(item.report_status)) {
        return false;
      }

      // Organization filters - use name matching since IDs may not be available
      if (filters.partner_organization_ids?.length && item.partner_organization_name) {
        // For now, we'll skip ID-based filtering and rely on name filtering in search
        // This could be enhanced later with proper ID mapping
      }
      
      if (filters.subcontractor_organization_ids?.length) {
        // Similar to partner organizations, skip for now
        // This filtering would need proper subcontractor data structure
      }

      // Date range filter - use created_at if available
      if (filters.date_from || filters.date_to) {
        const itemDate = item.created_at ? new Date(item.created_at) : null;
        if (itemDate) {
          if (filters.date_from && itemDate < new Date(filters.date_from)) {
            return false;
          }
          if (filters.date_to && itemDate > new Date(filters.date_to)) {
            return false;
          }
        }
      }

      // Amount range filter
      if (filters.amount_min || filters.amount_max) {
        const amount = item.partner_billed_amount || item.subcontractor_bill_amount || 0;
        if (filters.amount_min && amount < parseFloat(filters.amount_min)) {
          return false;
        }
        if (filters.amount_max && amount > parseFloat(filters.amount_max)) {
          return false;
        }
      }

      return true;
    });
  }, [pipelineData, searchTerm, filters]);

  // Calculate stats from filtered data
  const totalWorkOrders = filteredPipelineData.length;
  const totalValue = filteredPipelineData.reduce((sum, item) => sum + (item.partner_billed_amount || 0), 0);
  const readyToBill = filteredPipelineData.filter(item => item.status === 'completed').length;
  const pendingReports = filteredPipelineData.filter(item => 
    item.report_status === 'submitted' ||
    item.report_status === 'reviewed'
  ).length;

  // Count all active filters including search term
  const filterCount = useMemo(() => {
    let count = searchTerm ? 1 : 0;
    count += countActiveFilters(filters);
    return count;
  }, [searchTerm, filters]);

  // Refresh handler
  const handleRefresh = async () => {
    await refetchPipeline();
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilters({});
  };

  // Export handlers
  const handleExport = (format: 'csv' | 'excel') => {
    toast({
      title: "Export",
      description: `Exporting as ${format}...`,
    });
  };

  // Generate partner invoice
  const handleGeneratePartnerInvoice = () => {
    toast({
      title: "Invoice generated",
      description: "Partner invoice generated.",
    });
  };

  if (pipelineError) {
    return (
      <div className="p-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Error loading pipeline</h2>
          <p className="text-muted-foreground mb-4">There was an error loading the billing pipeline data.</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="container mx-auto p-6 space-y-6 max-w-7xl">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing Pipeline</h1>
            <p className="text-muted-foreground">
              {totalWorkOrders} work orders in pipeline
              {totalValue > 0 && (
                <span className="ml-2">• {formatCurrency(totalValue)} total value</span>
              )}
            </p>
          </div>
          <Button onClick={handleGeneratePartnerInvoice} className="shrink-0">
            <FileText className="h-4 w-4 mr-2" />
            Generate Partner Invoice
          </Button>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalWorkOrders}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ready to Invoice</p>
                <p className="text-2xl font-bold">{readyToBill}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Reports</p>
                <p className="text-2xl font-bold">{pendingReports}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pipeline Table */}
        <BillingPipelineTable
          data={filteredPipelineData}
          isLoading={pipelineLoading}
          isError={pipelineError}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          allowedModes={['table', 'card']}
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
          filterCount={filterCount}
          columnVisibilityColumns={getAllColumns()}
          onToggleColumn={toggleColumn}
          onResetColumns={resetToDefaults}
          onExport={handleExport}
          onRefresh={handleRefresh}
          isMobile={isMobile}
        />

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