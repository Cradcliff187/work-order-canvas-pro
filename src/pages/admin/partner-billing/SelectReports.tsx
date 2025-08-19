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
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { usePartnerUnbilledReports } from '@/hooks/usePartnerUnbilledReports';
import { usePartnerInvoiceGeneration } from '@/hooks/usePartnerInvoiceGeneration';
import { usePartnerReportStats } from '@/hooks/usePartnerReportStats';
import { useReportInvoiceDetails } from '@/hooks/useReportInvoiceDetails';
import { ReportPipelineEmptyState } from '@/components/admin/partner-billing/ReportPipelineEmptyState';
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
  
  // Filter sheet states
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMarkupCollapsed, setIsMarkupCollapsed] = useState(true);
  
  // Advanced filtering states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [amountRange, setAmountRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Sorting for table
  type SortKey = 'work_order' | 'submitted' | 'amount';
  const [sortKey, setSortKey] = useState<SortKey>('submitted');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
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
  const { data: reports, isLoading, error, refetch } = usePartnerUnbilledReports(selectedPartnerId);
  const { data: reportStats } = usePartnerReportStats(selectedPartnerId);
  const { data: invoiceDetails } = useReportInvoiceDetails(reports?.map(r => r.id) || []);
  const generateInvoice = usePartnerInvoiceGeneration();

  const filteredAndSortedReports = useMemo(() => {
    if (!reports) return [];
    
    let filtered = [...reports];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report => 
        report.work_orders?.work_order_number?.toLowerCase().includes(query) ||
        report.work_orders?.title?.toLowerCase().includes(query) ||
        report.work_orders?.description?.toLowerCase().includes(query) ||
        report.work_orders?.store_location?.toLowerCase().includes(query)
      );
    }
    
    // Apply amount range filter
    if (amountRange.min || amountRange.max) {
      filtered = filtered.filter(report => {
        const amount = report.approved_subcontractor_invoice_amount || 0;
        const min = amountRange.min ? parseFloat(amountRange.min) : 0;
        const max = amountRange.max ? parseFloat(amountRange.max) : Infinity;
        return amount >= min && amount <= max;
      });
    }
    
    // Apply date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(report => {
        const submittedDate = new Date(report.submitted_at);
        const startDate = dateRange.start ? new Date(dateRange.start) : new Date('1900-01-01');
        const endDate = dateRange.end ? new Date(dateRange.end) : new Date('2100-12-31');
        return submittedDate >= startDate && submittedDate <= endDate;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let av: any = 0; let bv: any = 0;
      if (sortKey === 'work_order') {
        const an = a.work_orders?.work_order_number || '';
        const bn = b.work_orders?.work_order_number || '';
        return (an.toLowerCase() < bn.toLowerCase() ? (sortDir==='asc'? -1:1) : an.toLowerCase() > bn.toLowerCase() ? (sortDir==='asc'? 1:-1) : 0);
      }
      if (sortKey === 'submitted') {
        av = new Date(a.submitted_at).getTime();
        bv = new Date(b.submitted_at).getTime();
      }
      if (sortKey === 'amount') {
        av = Number(a.approved_subcontractor_invoice_amount || 0);
        bv = Number(b.approved_subcontractor_invoice_amount || 0);
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [reports, searchQuery, amountRange, dateRange, sortKey, sortDir]);

  // Calculate totals based on selected reports
  const calculations = useMemo(() => {
    if (!filteredAndSortedReports) return { subtotal: 0, markupAmount: 0, total: 0, selectedReports: [] };
    
    const selectedReports = filteredAndSortedReports.filter(report => selectedReportIds.has(report.id));
    const subtotal = selectedReports.reduce((sum, report) => sum + (report.approved_subcontractor_invoice_amount || 0), 0);
    const markupAmount = subtotal * (markupPercentage / 100);
    const total = subtotal + markupAmount;
    
    return { subtotal, markupAmount, total, selectedReports };
  }, [filteredAndSortedReports, selectedReportIds, markupPercentage]);

  const totalApprovedInvoiceAmount = reports?.reduce((sum, report) => sum + (report.approved_subcontractor_invoice_amount || 0), 0) || 0;

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

  const clearFilters = () => {
    setSelectedPartnerId(undefined);
    setMarkupPercentage(20);
    setSelectedReportIds(new Set());
    setSearchQuery('');
    setAmountRange({ min: '', max: '' });
    setDateRange({ start: '', end: '' });
    setShowAdvancedFilters(false);
    setIsDesktopFilterOpen(false);
    setIsMobileFilterOpen(false);
    localStorage.removeItem('pb.selectedPartnerId');
    localStorage.removeItem('pb.markupPercentage');
  };

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (amountRange.min || amountRange.max) count++;
    if (dateRange.start || dateRange.end) count++;
    return count;
  }, [searchQuery, amountRange, dateRange]);

  // Helper function for variance calculation
  const getVarianceData = (report: PartnerUnbilledReport) => {
    const estimateAmount = report.work_orders?.internal_estimate_amount || 0;
    const actualAmount = report.approved_subcontractor_invoice_amount || 0;
    
    if (estimateAmount === 0) {
      return { hasEstimate: false, variance: null };
    }
    
    const variance = calculateEstimateVariance(estimateAmount, actualAmount);
    return { 
      hasEstimate: true, 
      variance,
      percentageVariance: variance.percentage 
    };
  };

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
    
    // Phase 3: Validate minimum invoice amount
    if (calculations.subtotal < 0.01) {
      toast({
        title: "Cannot Generate Invoice",
        description: "Selected reports have no associated costs. Please ensure subcontractor invoices are approved.",
        variant: "destructive"
      });
      return;
    }
    
    generateInvoice.mutate({
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
        {(selectedPartnerId || markupPercentage !== 20 || searchQuery || amountRange.min || amountRange.max || dateRange.start || dateRange.end) && (
          <Button variant="outline" size="sm" onClick={clearFilters} aria-label="Clear all filters">
            Clear all filters
          </Button>
        )}
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

      {/* Modern Top Controls */}
      {selectedPartnerId && (
        <>
          {/* Desktop Layout */}
          <div className="hidden lg:flex gap-4 mb-6">
            <div className="flex flex-1 gap-2">
              <SmartSearchInput
                placeholder="Search work orders, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={() => setIsDesktopFilterOpen(true)}>
                <Filter className="h-4 w-4 mr-2" />
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="default"
                disabled={selectedReportIds.size === 0}
                onClick={() => setShowConfirmDialog(true)}
              >
                Generate Invoice ({selectedReportIds.size})
              </Button>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden space-y-3 mb-6">
            <SmartSearchInput
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsMobileFilterOpen(true)}
                className="flex-1"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>
              <Button 
                variant="default"
                disabled={selectedReportIds.size === 0}
                onClick={() => setShowConfirmDialog(true)}
                className="flex-1"
              >
                Generate ({selectedReportIds.size})
              </Button>
            </div>
          </div>
        </>
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
              <ColumnVisibilityDropdown
                columns={getAllColumns()}
                onToggleColumn={toggleColumn}
                onResetToDefaults={resetColumnDefaults}
                variant="outline"
                size="sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <EmptyState
                icon={FileBarChart}
                title="Error loading reports"
                description="We couldn't load reports. Please try again."
                action={{ label: 'Retry', onClick: () => refetch() }}
              />
            ) : isLoading ? (
              <EnhancedTableSkeleton rows={5} columns={8} showHeader />
            ) : !filteredAndSortedReports || filteredAndSortedReports.length === 0 ? (
              searchQuery || amountRange.min || amountRange.max || dateRange.start || dateRange.end ? (
                <EmptyState
                  icon={Search}
                  title="No matching reports"
                  description="No reports match your current filters. Try adjusting your search criteria."
                  action={{ label: 'Clear filters', onClick: clearFilters }}
                />
              ) : (
                <ReportPipelineEmptyState reportStats={reportStats} />
              )
            ) : (
              <>
                {/* Table Actions Header */}
                {filteredAndSortedReports && filteredAndSortedReports.length > 0 && (
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        className="flex items-center gap-2"
                      >
                        <CheckSquare className="w-4 h-4" />
                        {selectedReportIds.size === filteredAndSortedReports.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      <Badge variant="secondary" className="h-5 text-[10px] px-2">
                        {filteredAndSortedReports.length} of {reports?.length || 0} report{(reports?.length || 0) !== 1 ? 's' : ''} shown
                      </Badge>
                      <Badge variant="outline" className="h-5 text-[10px] px-2 flex items-center gap-2">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(totalApprovedInvoiceAmount)} available
                      </Badge>
                      {selectedReportIds.size > 0 && (
                        <div className="flex gap-2">
                          <ExportDropdown 
                            onExport={handleExportSelected}
                            variant="outline"
                            size="sm"
                          />
                          <TableActionsDropdown
                            actions={[
                              {
                                label: 'Clear Selection',
                                icon: X,
                                onClick: () => setSelectedReportIds(new Set()),
                              },
                            ]}
                            align="end"
                            itemName="selected reports"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Desktop Table */}
                <div className="hidden md:block">
                  <ResponsiveTableWrapper>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={filteredAndSortedReports.length > 0 && selectedReportIds.size === filteredAndSortedReports.length}
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
                        {filteredAndSortedReports.map((report) => {
                          const isSelected = selectedReportIds.has(report.id);
                          const variance = calculateEstimateVariance(report.work_orders?.internal_estimate_amount, report.approved_subcontractor_invoice_amount);
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
                                        {formatVariance(variance.percentage)}
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

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filteredAndSortedReports.map((report) => {
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
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoice Summary - Only show when reports are selected */}
      {selectedReportIds.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Selected Reports</p>
                  <p className="text-2xl font-bold">{selectedReportIds.size}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="text-2xl font-bold">{formatCurrency(calculations.subtotal)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total with Markup</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(calculations.total)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Markup: {formatCurrency(calculations.markupAmount)} ({markupPercentage}%)</p>
                  <p className="text-xs text-muted-foreground">Ready to generate partner invoice</p>
                </div>
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <AlertDialogTrigger asChild>
                    <Button size="lg" className="px-8">
                      Generate Invoice
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
                    <div className="grid grid-cols-2 gap-4 py-4">
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
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleGenerateInvoice} disabled={generateInvoice.isPending}>
                        {generateInvoice.isPending ? 'Generating...' : 'Generate Invoice'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop Filter Sidebar */}
      <Sheet open={isDesktopFilterOpen} onOpenChange={setIsDesktopFilterOpen}>
        <SheetContent side="right" className="w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Billing Filters</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="absolute right-12 top-4"
            >
              Clear All
            </Button>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Amount Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount Range</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={amountRange.min}
                  onChange={(e) => setAmountRange({...amountRange, min: e.target.value})}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={amountRange.max}
                  onChange={(e) => setAmountRange({...amountRange, max: e.target.value})}
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                />
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Filter Bottom Sheet */}
      <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Billing Filters</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="absolute right-12 top-4"
            >
              Clear All
            </Button>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Amount Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount Range</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={amountRange.min}
                  onChange={(e) => setAmountRange({...amountRange, min: e.target.value})}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={amountRange.max}
                  onChange={(e) => setAmountRange({...amountRange, max: e.target.value})}
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                />
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      </main>
    </TooltipProvider>
  );
}