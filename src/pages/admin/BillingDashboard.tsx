import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useWorkOrderLifecycle } from '@/hooks/useWorkOrderLifecyclePipeline';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAdminFilters } from '@/hooks/useAdminFilters';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useIsMobile } from '@/hooks/use-mobile';
import { useViewMode } from '@/hooks/useViewMode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatting';
import { StandardDashboardStats, StatCard } from '@/components/dashboard/StandardDashboardStats';
import { SubcontractorBill } from '@/hooks/useSubcontractorBills';
import { InvoiceDetailModal } from '@/components/admin/invoices/InvoiceDetailModal';
import { BillingPipelineTable } from '@/components/admin/billing/BillingPipelineTable';
import { BillingFiltersValue } from '@/components/admin/billing/BillingFilters';

export default function BillingDashboard() {
  // Despite the name, this contains subcontractor bill data
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

  // Standardized filter management with persistence
  const initialFilters: BillingFiltersValue = {
    search: '',
    status: [],
    financial_status: [],
    partner_billing_status: [],
    report_status: [],
    partner_organization_ids: [],
    subcontractor_organization_ids: [],
    date_from: '',
    date_to: '',
    amount_min: '',
    amount_max: ''
  };

  const {
    filters,
    setFilters,
    clearFilters: clearAllFilters,
    filterCount
  } = useAdminFilters('billing-dashboard-filters-v1', initialFilters, {
    excludeKeys: ['search'] // Exclude search from filter count as it's handled separately
  });

  const { viewMode, setViewMode } = useViewMode({
    componentKey: 'billing-dashboard',
    config: {
      mobile: ['card', 'list'],
      desktop: ['table', 'card']
    }
  });

  // Data fetching
  const { data: organizationsData } = useOrganizations();

  // Create organization mapping for efficient filtering
  const organizationMap = useMemo(() => {
    if (!organizationsData) return new Map();
    return new Map(organizationsData.map(org => [org.id, org]));
  }, [organizationsData]);

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
      if (filters.search?.trim()) {
        const searchLower = filters.search.toLowerCase();
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

      // Partner organization filter - now functional with ID-based filtering
      if (filters.partner_organization_ids?.length && filters.partner_organization_ids.length > 0) {
        // Try ID-based filtering first
        if (item.organization_id && filters.partner_organization_ids.includes(item.organization_id)) {
          // Match found by ID
        } else if (item.partner_organization_name) {
          // Fallback to name-based filtering
          const matchingOrg = Array.from(organizationMap.values()).find(org => 
            org.organization_type === 'partner' && 
            org.name === item.partner_organization_name &&
            filters.partner_organization_ids?.includes(org.id)
          );
          if (!matchingOrg) {
            return false;
          }
        } else {
          return false;
        }
      }
      
      // Subcontractor organization filter - now functional
      if (filters.subcontractor_organization_ids?.length && filters.subcontractor_organization_ids.length > 0) {
        // Check if item has subcontractor information
        if (item.assigned_organization_id && filters.subcontractor_organization_ids.includes(item.assigned_organization_id)) {
          // Match found by assigned organization ID
        } else {
          // For now, we don't have reliable subcontractor name mapping in pipeline data
          // This could be enhanced when subcontractor organization names are added to the data structure
          return false;
        }
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
      if (filters.amount_min?.trim() || filters.amount_max?.trim()) {
        const amount = item.partner_billed_amount || item.subcontractor_bill_amount || 0;
        if (filters.amount_min?.trim() && amount < parseFloat(filters.amount_min)) {
          return false;
        }
        if (filters.amount_max?.trim() && amount > parseFloat(filters.amount_max)) {
          return false;
        }
      }

      return true;
    });
  }, [pipelineData, filters, organizationMap]);

  // Calculate stats from filtered data
  const totalWorkOrders = filteredPipelineData.length;
  const totalValue = filteredPipelineData.reduce((sum, item) => sum + (item.partner_billed_amount || 0), 0);
  const readyToBill = filteredPipelineData.filter(item => item.status === 'completed').length;
  const pendingReports = filteredPipelineData.filter(item => 
    item.report_status === 'submitted' ||
    item.report_status === 'reviewed'
  ).length;

  // Total filter count including search (already handled by useAdminFilters hook)
  const totalFilterCount = useMemo(() => {
    let count = filterCount;
    // Add search to count if it has a value
    if (filters.search?.trim()) {
      count += 1;
    }
    return count;
  }, [filterCount, filters.search]);

  // Prepare stats cards
  const statsCards: StatCard[] = useMemo(() => [
    {
      icon: TrendingUp,
      label: 'Total Items',
      value: totalWorkOrders,
      variant: 'default'
    },
    {
      icon: CheckCircle,
      label: 'Ready to Invoice',
      value: readyToBill,
      variant: 'success'
    },
    {
      icon: Clock,
      label: 'Pending Reports',
      value: pendingReports,
      variant: 'warning'
    },
    {
      icon: AlertTriangle,
      label: 'Total Value',
      value: formatCurrency(totalValue),
      variant: 'destructive'
    }
  ], [totalWorkOrders, readyToBill, pendingReports, totalValue]);

  // Refresh handler
  const handleRefresh = async () => {
    await refetchPipeline();
  };

  // Clear all filters - now uses standardized clearing
  const clearFilters = () => {
    clearAllFilters();
  };

  // Export handlers
  const handleExport = (format: 'csv' | 'excel') => {
    toast({
      title: "Export",
      description: `Exporting as ${format}...`,
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
      <div className="space-y-6">
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
        </header>

        {/* Stats Cards */}
        <StandardDashboardStats 
          stats={statsCards}
          loading={pipelineLoading}
        />

        {/* Pipeline Table */}
        <BillingPipelineTable
          data={filteredPipelineData}
          isLoading={pipelineLoading}
          isError={pipelineError}
          searchValue={filters.search || ''}
          onSearchChange={(value) => setFilters({ ...filters, search: value })}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          allowedModes={['table', 'card']}
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
          filterCount={totalFilterCount}
          columnVisibilityColumns={getAllColumns()}
          onToggleColumn={toggleColumn}
          onResetColumns={resetToDefaults}
          onExport={handleExport}
          onRefresh={handleRefresh}
          isMobile={isMobile}
        />
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={invoiceModalOpen}
        onClose={() => {
          setInvoiceModalOpen(false);
          setSelectedInvoice(null);
        }}
      />
    </>
  );
}