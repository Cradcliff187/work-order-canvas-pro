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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PartnerBillingFilters, PartnerBillingFiltersValue } from '@/components/admin/partner-billing/PartnerBillingFilters';
import { usePartnerBillingFilters, usePartnerBillingFilterCount } from '@/hooks/usePartnerBillingFilters';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
  
  // Filter states
  const [isMarkupCollapsed, setIsMarkupCollapsed] = useState(true);
  const [filters, setFilters] = useState<PartnerBillingFiltersValue>({});

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
  
  // Fetch reports for the selected partner
  const { data: reports, isLoading: isLoadingReports, error: reportsError } = usePartnerUnbilledReports(selectedPartnerId);
  const { mutate: generateInvoice, isPending: isGeneratingInvoice } = usePartnerInvoiceGeneration();
  const { data: statsData } = usePartnerReportStats(selectedPartnerId);

  // Apply filters to reports
  const filteredReports = usePartnerBillingFilters(reports, filters);
  const filterCount = usePartnerBillingFilterCount(filters);

  // Sort the filtered reports
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

  // Clear all filters function
  const clearFilters = () => {
    setFilters({});
  };

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
          {filterCount > 0 && (
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

        {/* Modern Control Bar */}
        {selectedPartnerId && (
          <>
            {/* Desktop Layout */}
            <div className="hidden lg:flex gap-4 mb-6">
              <div className="flex flex-1 gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search reports..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filter{filterCount > 0 && ` (${filterCount})`}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                    <PartnerBillingFilters
                      value={filters}
                      onChange={setFilters}
                      onClear={clearFilters}
                      filterCount={filterCount}
                      partnerOrgId={selectedPartnerId}
                    />
                  </SheetContent>
                </Sheet>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="default"
                  disabled={selectedReportIds.size === 0}
                  onClick={handleGenerateInvoice}
                  className="gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Generate Invoice ({selectedReportIds.size})
                </Button>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden space-y-3 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search reports..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="flex-1 gap-2">
                      <Filter className="h-4 w-4" />
                      Filter{filterCount > 0 && ` (${filterCount})`}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh]">
                    <PartnerBillingFilters
                      value={filters}
                      onChange={setFilters}
                      onClear={clearFilters}
                      filterCount={filterCount}
                      partnerOrgId={selectedPartnerId}
                    />
                  </SheetContent>
                </Sheet>
                <Button 
                  variant="default"
                  disabled={selectedReportIds.size === 0}
                  onClick={handleGenerateInvoice}
                  className="flex-1 gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Generate Invoice ({selectedReportIds.size})
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
                        <AlertDialogAction onClick={handleGenerateInvoice} disabled={isGeneratingInvoice}>
                          {isGeneratingInvoice ? 'Generating...' : 'Generate Invoice'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </TooltipProvider>
  );
}