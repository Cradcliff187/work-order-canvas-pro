import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportStatusBadge } from '@/components/ui/status-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { TablePagination } from '@/components/admin/shared/TablePagination';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAdminFilters } from '@/hooks/useAdminFilters';

import { usePartnerUnbilledReports } from '@/hooks/usePartnerUnbilledReports';
import { usePartnerInvoiceGeneration } from '@/hooks/usePartnerInvoiceGeneration';
import { usePartnerReportStats } from '@/hooks/usePartnerReportStats';
import { useReportInvoiceDetails } from '@/hooks/useReportInvoiceDetails';
import { ReportPipelineEmptyState } from '@/components/admin/partner-billing/ReportPipelineEmptyState';
import { CompactBillingPipelineFilters } from '@/components/admin/billing/CompactBillingPipelineFilters';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { useViewMode } from '@/hooks/useViewMode';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { FileBarChart, Building2, DollarSign, Calendar, Receipt, Percent, CheckSquare, Info, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Eye, Download, X, Filter, Search, Settings, ChevronDown } from 'lucide-react';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { exportToCSV, ExportColumn } from '@/lib/utils/export';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatting';
import { calculateEstimateVariance, formatVariance } from '@/lib/validations/estimate-validations';
import { PartnerUnbilledReport } from '@/hooks/usePartnerUnbilledReports';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function SelectReports() {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | undefined>(() => {
    const v = localStorage.getItem('pb.selectedPartnerId');
    return v || undefined;
  });
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [markupPercentage, setMarkupPercentage] = useState<number>(() => {
    const v = localStorage.getItem('pb.markupPercentage');
    return v !== null ? Number(v) : 20;
  });
  const [invoiceDate, setInvoiceDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState<string | ''>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Filter states with standardized persistence
  const [isMarkupCollapsed, setIsMarkupCollapsed] = useState(true);
  
  // Use interface compatible with CompactBillingPipelineFilters
  interface FilterValue {
    search?: string;
    status?: string[];
    trade_id?: string[];
    partner_organization_ids?: string[];
    completed_by?: string[];
    date_from?: string;
    date_to?: string;
    location_filter?: string[];
    showOverdueOnly?: boolean;
    financial_status?: string[];
    partner_billing_status?: string[];
    priority?: string[];
    report_status?: string[];
  }
  
  const initialFilters: FilterValue = {};
  const { filters, setFilters, clearFilters, filterCount } = useAdminFilters(
    'partner-billing-filters-v2',
    initialFilters,
    { excludeKeys: [] }
  );

  // View mode management - cards only on mobile, both on desktop
  const { viewMode, setViewMode, allowedModes, isAllowed } = useViewMode({
    componentKey: 'partner-billing-reports',
    config: {
      mobile: ['card'],
      desktop: ['table', 'card']
    },
    defaultMode: 'table'
  });

  // Sorting and pagination for table
  type SortKey = 'work_order' | 'submitted' | 'amount';
  const [sortKey, setSortKey] = useState<SortKey>('submitted');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });
  
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Column visibility management
  const columnMetadata = {
    work_order: { label: 'Work Order', description: 'Work order number and information', defaultVisible: true },
    description: { label: 'Description', description: 'Work order title and description', defaultVisible: true },
    subcontractor: { label: 'Subcontractor', description: 'Assigned subcontractor or organization', defaultVisible: true },
    location: { label: 'Location', description: 'Store or work location', defaultVisible: true },
    submitted: { label: 'Submitted', description: 'Date when report was submitted', defaultVisible: true },
    invoices: { label: 'Invoices', description: 'Related invoice information', defaultVisible: true },
    amount: { label: 'Approved Invoice Amount', description: 'Approved subcontractor invoice amount', defaultVisible: true },
    variance: { label: 'Estimate Variance', description: 'Variance between estimate and actual cost', defaultVisible: true },
    status: { label: 'Status', description: 'Report approval status', defaultVisible: true }
  };

  const { 
    columnVisibility, 
    toggleColumn, 
    resetToDefaults: resetColumnDefaults,
    getAllColumns 
  } = useColumnVisibility({
    storageKey: 'partner-billing-select-reports-columns',
    columnMetadata,
    legacyKeys: []
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Fetch reports for the selected partner
  const { data: reports, isLoading: isLoadingReports, error: reportsError } = usePartnerUnbilledReports(selectedPartnerId);
  const { mutate: generateInvoice, isPending: isGeneratingInvoice } = usePartnerInvoiceGeneration();
  const { data: statsData } = usePartnerReportStats(selectedPartnerId);

  // Apply filters to reports with inline filtering logic
  const filteredReports = useMemo(() => {
    if (!reports) return [];
    
    return reports.filter(report => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = 
          report.work_orders?.work_order_number?.toLowerCase().includes(searchLower) ||
          report.work_orders?.title?.toLowerCase().includes(searchLower) ||
          report.work_orders?.description?.toLowerCase().includes(searchLower) ||
          report.work_orders?.store_location?.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      
      // Add other filter logic as needed based on CompactBillingPipelineFilters structure
      return true;
    });
  }, [reports, filters]);

  // Sort and paginate the filtered reports
  const filteredAndSortedReports = useMemo(() => {
    if (!filteredReports) return [];
    
    const sorted = [...filteredReports].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortKey) {
        case 'work_order':
          aVal = a.work_orders?.work_order_number || '';
          bVal = b.work_orders?.work_order_number || '';
          break;
        case 'submitted':
          aVal = new Date(a.submitted_at);
          bVal = new Date(b.submitted_at);
          break;
        case 'amount':
          aVal = a.approved_subcontractor_invoice_amount || 0;
          bVal = b.approved_subcontractor_invoice_amount || 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredReports, sortKey, sortDir]);

  // Create paginated reports for display
  const paginatedReports = useMemo(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredAndSortedReports.slice(startIndex, endIndex);
  }, [filteredAndSortedReports, pagination]);

  // Mock table for pagination component
  const mockTable = {
    getRowModel: () => ({ rows: paginatedReports.map((_, i) => ({ id: i })) }),
    getFilteredRowModel: () => ({ rows: filteredAndSortedReports.map((_, i) => ({ id: i })) }),
    getState: () => ({ pagination }),
    setPageSize: (size: number) => setPagination(prev => ({ ...prev, pageSize: size, pageIndex: 0 })),
    previousPage: () => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) })),
    nextPage: () => setPagination(prev => ({ 
      ...prev, 
      pageIndex: Math.min(Math.ceil(filteredAndSortedReports.length / prev.pageSize) - 1, prev.pageIndex + 1) 
    })),
    getCanPreviousPage: () => pagination.pageIndex > 0,
    getCanNextPage: () => (pagination.pageIndex + 1) * pagination.pageSize < filteredAndSortedReports.length,
    getPageCount: () => Math.ceil(filteredAndSortedReports.length / pagination.pageSize)
  };

  // Calculate totals based on selected reports
  const calculations = useMemo(() => {
    if (!filteredAndSortedReports) return { subtotal: 0, markupAmount: 0, total: 0, selectedReports: [] };
    
    const selectedReports = filteredAndSortedReports.filter(report => selectedReportIds.has(report.id));
    const subtotal = selectedReports.reduce((sum, report) => sum + (report.approved_subcontractor_invoice_amount || 0), 0);
    const markupAmount = subtotal * (markupPercentage / 100);
    const total = subtotal + markupAmount;
    
    return { subtotal, markupAmount, total, selectedReports };
  }, [filteredAndSortedReports, selectedReportIds, markupPercentage]);

  // Fetch invoice details for all reports
  const { data: invoiceDetails } = useReportInvoiceDetails(reports?.map(r => r.id) || []);

  const handleReportToggle = (reportId: string, checked: boolean) => {
    const newSet = new Set(selectedReportIds);
    if (checked) {
      newSet.add(reportId);
    } else {
      newSet.delete(reportId);
    }
    setSelectedReportIds(newSet);
  };

  const handleSelectAll = () => {
    if (!filteredAndSortedReports) return;
    if (selectedReportIds.size === filteredAndSortedReports.length) {
      setSelectedReportIds(new Set());
    } else {
      setSelectedReportIds(new Set(filteredAndSortedReports.map(r => r.id)));
    }
  };

  useEffect(() => {
    if (selectedPartnerId) {
      localStorage.setItem('pb.selectedPartnerId', selectedPartnerId);
    } else {
      localStorage.removeItem('pb.selectedPartnerId');
    }
  }, [selectedPartnerId]);

  useEffect(() => {
    localStorage.setItem('pb.markupPercentage', String(markupPercentage));
  }, [markupPercentage]);

  const handleExportSelected = (exportFormat: 'csv' | 'excel') => {
    try {
      if (!reports || selectedReportIds.size === 0) return;

      const selectedReports = reports.filter(report => selectedReportIds.has(report.id));
      
      // Prepare export data
      const exportData = selectedReports.map(report => ({
        work_order_number: report.work_orders?.work_order_number || 'N/A',
        work_order_title: report.work_orders?.title || 'No title',
        description: report.work_orders?.description || 'No description',
        location: report.work_orders?.store_location || '-',
        subcontractor: (() => {
          const subcontractor = report.subcontractor;
          const subcontractorOrg = report.subcontractor_organization;
          
          if (subcontractorOrg) {
            return subcontractorOrg.name;
          } else if (subcontractor) {
            return `${subcontractor.first_name} ${subcontractor.last_name}`;
          }
          return 'N/A';
        })(),
        submitted_date: format(new Date(report.submitted_at), 'yyyy-MM-dd'),
        amount: report.approved_subcontractor_invoice_amount || 0,
        status: 'Approved'
      }));

      const columns: ExportColumn[] = [
        { key: 'work_order_number', label: 'Work Order #', type: 'string' },
        { key: 'work_order_title', label: 'Title', type: 'string' },
        { key: 'description', label: 'Description', type: 'string' },
        { key: 'location', label: 'Location', type: 'string' },
        { key: 'subcontractor', label: 'Subcontractor', type: 'string' },
        { key: 'submitted_date', label: 'Submitted Date', type: 'string' },
        { key: 'amount', label: 'Approved Invoice Amount', type: 'currency' },
        { key: 'status', label: 'Status', type: 'string' }
      ];

      const baseFilename = `selected_reports_${format(new Date(), 'yyyy-MM-dd')}`;
      const filename = exportFormat === 'csv' ? `${baseFilename}.csv` : `${baseFilename}.xlsx`;
      
      exportToCSV(exportData, columns, filename);
      toast({
        title: "Export Complete",
        description: `${selectedReports.length} reports exported as ${exportFormat.toUpperCase()} successfully`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export selected reports",
        variant: "destructive"
      });
    }
  };

  const handleGenerateInvoice = () => {
    if (!selectedPartnerId || selectedReportIds.size === 0) return;
    
    // Validate minimum invoice amount
    if (calculations.subtotal < 0.01) {
      toast({
        title: "Cannot Generate Invoice",
        description: "Selected reports have no associated costs. Please ensure subcontractor invoices are approved.",
        variant: "destructive"
      });
      return;
    }
    
    generateInvoice({
      partnerOrganizationId: selectedPartnerId,
      selectedReportIds: Array.from(selectedReportIds),
      markupPercentage,
      subtotal: calculations.subtotal,
      totalAmount: calculations.total,
      invoiceDate,
      dueDate: dueDate || undefined,
    }, {
      onSuccess: (result) => {
        // Clear selection
        setSelectedReportIds(new Set());
        setShowConfirmDialog(false);
        // Navigate to invoice detail
        navigate(`/admin/partner-billing/invoices/${result.invoiceId}`);
      },
      onError: () => {
        // Errors are handled by usePartnerInvoiceGeneration toast logic
      }
    });
  };

  const totalApprovedInvoiceAmount = reports?.reduce((sum, report) => sum + (report.approved_subcontractor_invoice_amount || 0), 0) || 0;

  return (
    <TooltipProvider>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-popover text-foreground border rounded px-3 py-2 shadow">Skip to main content</a>
      <main id="main-content" role="main" tabIndex={-1} className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Partner Billing</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Select Reports</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Partner Billing</h1>
            <p className="text-muted-foreground">
              Select reports with approved subcontractor invoices to bill partners
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/partner-billing/invoices')}
            className="gap-2"
          >
            <Receipt className="h-4 w-4" />
            Select Reports
          </Button>
        </div>

        {/* Partner Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Select Partner Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <OrganizationSelector
                value={selectedPartnerId}
                onChange={setSelectedPartnerId}
                organizationType="partner"
                placeholder="Choose a partner organization..."
                className="w-full max-w-md"
              />
              {selectedPartnerId && (
                <p className="text-sm text-muted-foreground">
                  Partner selected. Showing reports with approved subcontractor invoices ready for billing.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compact Markup Configuration */}
        {selectedPartnerId && reports && reports.length > 0 && (
          <Collapsible open={!isMarkupCollapsed} onOpenChange={(open) => setIsMarkupCollapsed(!open)}>
            <Card className="mb-6">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <CardTitle className="text-base">Markup Configuration</CardTitle>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">
                        Current: {markupPercentage}%
                      </Badge>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        isMarkupCollapsed && "rotate-180"
                      )} />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 max-w-xs">
                      <Label>Markup Percentage</Label>
                      <Input 
                        type="number" 
                        value={markupPercentage}
                        onChange={(e) => setMarkupPercentage(Math.max(0, Math.min(100, Number(e.target.value))))}
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground max-w-md">
                      Standard markup helps cover administrative costs and provides profit margin on subcontractor work.
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Reports Display */}
        {selectedPartnerId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileBarChart className="w-5 h-5" />
                  Unbilled Approved Reports ({filteredAndSortedReports?.length || 0})
                </CardTitle>
                
                {/* Integrated Control Bar */}
                <div className="flex items-center gap-2">
                  <CompactBillingPipelineFilters
                    value={filters}
                    onChange={setFilters}
                    onClear={clearFilters}
                  />
                  
                  <SmartSearchInput
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search reports..."
                    className="w-64"
                  />
                  
                  <ViewModeSwitcher
                    value={viewMode}
                    onValueChange={setViewMode}
                    allowedModes={allowedModes}
                  />
                  
                  <ColumnVisibilityDropdown
                    columns={getAllColumns()}
                    onToggleColumn={toggleColumn}
                    onResetToDefaults={resetColumnDefaults}
                    variant="outline"
                    size="sm"
                  />
                  
                  {filteredAndSortedReports && filteredAndSortedReports.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="flex items-center gap-2"
                    >
                      <CheckSquare className="w-4 h-4" />
                      {selectedReportIds.size === filteredAndSortedReports.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                  
                  {selectedReportIds.size > 0 && (
                    <ExportDropdown 
                      onExport={handleExportSelected}
                      variant="outline"
                      size="sm"
                    />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reportsError ? (
                <EmptyState
                  icon={FileBarChart}
                  title="Error loading reports"
                  description="We couldn't load reports. Please try again."
                  action={{ label: 'Retry', onClick: () => window.location.reload() }}
                />
              ) : isLoadingReports ? (
                <EnhancedTableSkeleton rows={5} columns={8} showHeader />
              ) : !filteredAndSortedReports || filteredAndSortedReports.length === 0 ? (
                filterCount > 0 ? (
                  <EmptyState
                    icon={Search}
                    title="No matching reports"
                    description="No reports match your current filters. Try adjusting your search criteria."
                    action={{ label: 'Clear filters', onClick: clearFilters }}
                  />
                ) : (
                  <ReportPipelineEmptyState reportStats={statsData} />
                )
              ) : (
                <>
                  {/* Table or Cards based on view mode */}
                  {viewMode === 'table' ? (
                    <div className="hidden md:block">
                      <ResponsiveTableWrapper>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={paginatedReports.length > 0 && paginatedReports.every(report => selectedReportIds.has(report.id))}
                                  onCheckedChange={handleSelectAll}
                                  aria-label="Select all visible reports"
                                />
                              </TableHead>
                              {columnVisibility.work_order && (
                                <TableHead className="min-w-[120px] cursor-pointer" onClick={() => toggleSort('work_order')}>
                                  <div className="flex items-center gap-1">
                                    Work Order
                                    {sortKey === 'work_order' && (
                                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                    )}
                                  </div>
                                </TableHead>
                              )}
                              {columnVisibility.description && <TableHead className="min-w-[200px]">Description</TableHead>}
                              {columnVisibility.subcontractor && <TableHead className="min-w-[150px]">Subcontractor</TableHead>}
                              {columnVisibility.location && <TableHead className="min-w-[120px]">Location</TableHead>}
                              {columnVisibility.submitted && (
                                <TableHead className="min-w-[120px] cursor-pointer" onClick={() => toggleSort('submitted')}>
                                  <div className="flex items-center gap-1">
                                    Submitted
                                    {sortKey === 'submitted' && (
                                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                    )}
                                  </div>
                                </TableHead>
                              )}
                              {columnVisibility.invoices && <TableHead className="min-w-[100px]">Invoices</TableHead>}
                              {columnVisibility.amount && (
                                <TableHead className="min-w-[130px] cursor-pointer text-right" onClick={() => toggleSort('amount')}>
                                  <div className="flex items-center justify-end gap-1">
                                    Amount
                                    {sortKey === 'amount' && (
                                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                    )}
                                  </div>
                                </TableHead>
                              )}
                              {columnVisibility.variance && <TableHead className="min-w-[120px] text-right">Variance</TableHead>}
                              {columnVisibility.status && <TableHead className="min-w-[100px]">Status</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedReports.map((report) => {
                              const isSelected = selectedReportIds.has(report.id);
                              const reportInvoiceDetails = invoiceDetails?.find(inv => inv.report_id === report.id);

                              return (
                                <TableRow 
                                  key={report.id} 
                                  className={cn(
                                    "cursor-pointer hover:bg-muted/50",
                                    isSelected && "bg-primary/10 border-l-2 border-l-primary"
                                  )}
                                  onClick={() => handleReportToggle(report.id, !isSelected)}
                                >
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => handleReportToggle(report.id, !!checked)}
                                      aria-label={`Select report ${report.work_orders?.work_order_number}`}
                                    />
                                  </TableCell>
                                  {columnVisibility.work_order && (
                                    <TableCell className="font-medium">
                                      <div className="space-y-1">
                                        <div className="font-semibold">{report.work_orders?.work_order_number}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {report.work_orders?.title}
                                        </div>
                                      </div>
                                    </TableCell>
                                  )}
                                  {columnVisibility.description && (
                                    <TableCell>
                                      <div className="max-w-[200px] truncate" title={report.work_orders?.description || 'No description'}>
                                        {report.work_orders?.description || 'No description'}
                                      </div>
                                    </TableCell>
                                  )}
                                  {columnVisibility.subcontractor && (
                                    <TableCell>
                                      {report.subcontractor_organization ? (
                                        <div className="space-y-1">
                                          <div className="font-medium">{report.subcontractor_organization.name}</div>
                                          <div className="text-xs text-muted-foreground">Organization</div>
                                        </div>
                                      ) : report.subcontractor ? (
                                        <div className="space-y-1">
                                          <div className="font-medium">
                                            {report.subcontractor.first_name} {report.subcontractor.last_name}
                                          </div>
                                          <div className="text-xs text-muted-foreground">Individual</div>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">N/A</span>
                                      )}
                                    </TableCell>
                                  )}
                                  {columnVisibility.location && (
                                    <TableCell>
                                      <div className="max-w-[120px] truncate" title={report.work_orders?.store_location || 'No location'}>
                                        {report.work_orders?.store_location || '-'}
                                      </div>
                                    </TableCell>
                                  )}
                                  {columnVisibility.submitted && (
                                    <TableCell>
                                      <div className="space-y-1">
                                        <div>{format(new Date(report.submitted_at), 'MMM dd, yyyy')}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {format(new Date(report.submitted_at), 'h:mm a')}
                                        </div>
                                      </div>
                                    </TableCell>
                                  )}
                                  {columnVisibility.invoices && (
                                    <TableCell>
                                      {reportInvoiceDetails && reportInvoiceDetails.invoice_count > 0 ? (
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Badge variant="secondary" className="cursor-help">
                                              {reportInvoiceDetails.invoice_count} invoice{reportInvoiceDetails.invoice_count !== 1 ? 's' : ''}
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <div className="space-y-1">
                                              {reportInvoiceDetails.invoices.map((inv) => (
                                                <div key={inv.invoice_id} className="text-xs">
                                                  {inv.invoice_number}: {formatCurrency(inv.amount)}
                                                </div>
                                              ))}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">None</span>
                                      )}
                                    </TableCell>
                                  )}
                                  {columnVisibility.amount && (
                                    <TableCell className="text-right">
                                      <div className="space-y-1">
                                        <div className="font-semibold">
                                          {formatCurrency(report.approved_subcontractor_invoice_amount || 0)}
                                        </div>
                                        {report.work_orders?.internal_estimate_amount && (
                                          <div className="text-xs text-muted-foreground">
                                            Est: {formatCurrency(report.work_orders.internal_estimate_amount)}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  )}
                                  {columnVisibility.variance && (
                                    <TableCell className="text-right">
                                      {(() => {
                                        const estimateAmount = report.work_orders?.internal_estimate_amount || 0;
                                        const actualAmount = report.approved_subcontractor_invoice_amount || 0;
                                        
                                        if (estimateAmount === 0) {
                                          return <span className="text-xs text-muted-foreground">No estimate</span>;
                                        }
                                        
                                        const variance = calculateEstimateVariance(estimateAmount, actualAmount);
                                        return (
                                          <div className={cn(
                                            "text-sm font-medium",
                                            variance.percentage > 10 && "text-destructive",
                                            variance.percentage < -10 && "text-green-600"
                                          )}>
                                            {variance.percentage > 0 ? '+' : ''}{variance.percentage.toFixed(1)}%
                                          </div>
                                        );
                                      })()}
                                    </TableCell>
                                  )}
                                  {columnVisibility.status && (
                                    <TableCell>
                                      <ReportStatusBadge status="approved" />
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ResponsiveTableWrapper>
                    </div>
                  ) : (
                    /* Card View */
                    <div className="space-y-3">
                      {paginatedReports.map((report) => {
                        const isSelected = selectedReportIds.has(report.id);

                        return (
                          <MobileTableCard
                            key={report.id}
                            title={report.work_orders?.work_order_number || 'N/A'}
                            subtitle={report.work_orders?.title}
                            data={{
                              'Location': report.work_orders?.store_location || '-',
                              'Subcontractor': report.subcontractor_organization?.name || 
                                (report.subcontractor ? `${report.subcontractor.first_name} ${report.subcontractor.last_name}` : 'N/A'),
                              'Submitted': format(new Date(report.submitted_at), 'MMM dd, yyyy'),
                              'Amount': formatCurrency(report.approved_subcontractor_invoice_amount || 0),
                              'Status': 'Approved'
                            }}
                            onClick={() => handleReportToggle(report.id, !isSelected)}
                            actions={[
                              {
                                label: isSelected ? 'Deselect' : 'Select',
                                icon: isSelected ? X : CheckSquare,
                                onClick: () => handleReportToggle(report.id, !isSelected),
                                show: true,
                              },
                            ]}
                            className={isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : ''}
                          >
                            {isSelected && (
                              <div className="flex items-center gap-2 text-xs text-primary">
                                <CheckSquare className="w-3 h-3" />
                                Selected for invoice
                              </div>
                            )}
                          </MobileTableCard>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Pagination */}
                  {filteredAndSortedReports.length > 0 && (
                    <TablePagination
                      table={mockTable as any}
                      totalCount={filteredAndSortedReports.length}
                      itemName="reports"
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Generate Invoice Floating Action */}
        {selectedReportIds.size > 0 && (
          <div className="fixed bottom-6 right-6 z-40">
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <AlertDialogTrigger asChild>
                <Button size="lg" className="shadow-lg hover:shadow-xl transition-shadow gap-2">
                  <Receipt className="h-4 w-4" />
                  Generate Invoice ({selectedReportIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Generate Partner Invoice</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create a partner invoice for {selectedReportIds.size} selected report{selectedReportIds.size !== 1 ? 's' : ''} 
                    with a total amount of {formatCurrency(calculations.total)}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Reports</p>
                      <p className="text-xl font-bold">{selectedReportIds.size}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Subtotal</p>
                      <p className="text-xl font-bold">{formatCurrency(calculations.subtotal)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(calculations.total)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoice-date">Invoice Date</Label>
                      <Input
                        id="invoice-date"
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due-date">Due Date (Optional)</Label>
                      <Input
                        id="due-date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Markup: {formatCurrency(calculations.markupAmount)} ({markupPercentage}%)
                  </p>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleGenerateInvoice} disabled={isGeneratingInvoice}>
                    {isGeneratingInvoice ? 'Generating...' : 'Generate Invoice'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </main>
    </TooltipProvider>
  );
}