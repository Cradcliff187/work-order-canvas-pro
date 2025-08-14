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
import { usePartnerUnbilledReports } from '@/hooks/usePartnerUnbilledReports';
import { usePartnerInvoiceGeneration } from '@/hooks/usePartnerInvoiceGeneration';
import { usePartnerReportStats } from '@/hooks/usePartnerReportStats';
import { useReportInvoiceDetails } from '@/hooks/useReportInvoiceDetails';
import { ReportPipelineEmptyState } from '@/components/admin/partner-billing/ReportPipelineEmptyState';
import { FileBarChart, Building2, DollarSign, Calendar, Receipt, Percent, CheckSquare, Info, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Eye, Download, X, Filter, Search } from 'lucide-react';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { exportToCSV, ExportColumn } from '@/lib/utils/export';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatting';
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
    amount: { label: 'Amount', description: 'Subcontractor cost amount', defaultVisible: true },
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
        const amount = report.subcontractor_costs || 0;
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
        av = Number(a.subcontractor_costs || 0);
        bv = Number(b.subcontractor_costs || 0);
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
    const subtotal = selectedReports.reduce((sum, report) => sum + (report.subcontractor_costs || 0), 0);
    const markupAmount = subtotal * (markupPercentage / 100);
    const total = subtotal + markupAmount;
    
    return { subtotal, markupAmount, total, selectedReports };
  }, [filteredAndSortedReports, selectedReportIds, markupPercentage]);

  const totalSubcontractorCosts = reports?.reduce((sum, report) => sum + (report.subcontractor_costs || 0), 0) || 0;

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
    localStorage.removeItem('pb.selectedPartnerId');
    localStorage.removeItem('pb.markupPercentage');
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
        amount: report.subcontractor_costs || 0,
        status: 'Approved'
      }));

      const columns: ExportColumn[] = [
        { key: 'work_order_number', label: 'Work Order #', type: 'string' },
        { key: 'work_order_title', label: 'Title', type: 'string' },
        { key: 'description', label: 'Description', type: 'string' },
        { key: 'location', label: 'Location', type: 'string' },
        { key: 'subcontractor', label: 'Subcontractor', type: 'string' },
        { key: 'submitted_date', label: 'Submitted Date', type: 'string' },
        { key: 'amount', label: 'Amount', type: 'currency' },
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
            Select approved reports to include in partner invoices
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
                Partner selected. Showing unbilled approved reports below.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Markup Controls */}
      {selectedPartnerId && reports && reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              Markup Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="markup" className="text-sm font-medium">
                  Markup Percentage:
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="markup"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={markupPercentage}
                    onChange={(e) => setMarkupPercentage(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Standard markup helps cover administrative costs and provides profit margin on subcontractor work.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports Display */}
      {selectedPartnerId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileBarChart className="w-5 h-5" />
                Unbilled Approved Reports
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
                <ColumnVisibilityDropdown
                  columns={getAllColumns()}
                  onToggleColumn={toggleColumn}
                  onResetToDefaults={resetColumnDefaults}
                  variant="outline"
                  size="sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Advanced Filters */}
            <div className="space-y-4 mb-6">
              {/* Basic Search */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search work orders, descriptions, locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="px-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Amount Range</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={amountRange.min}
                        onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                        className="w-20"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={amountRange.max}
                        onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                        className="w-20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Submitted Date Range</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-32"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                        {formatCurrency(totalSubcontractorCosts)} available
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

                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <ResponsiveTableWrapper stickyFirstColumn>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedReportIds.size === filteredAndSortedReports.length && filteredAndSortedReports.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          {columnVisibility.work_order !== false && (
                            <TableHead>
                              <button type="button" onClick={() => toggleSort('work_order')} className="inline-flex items-center gap-2" aria-label={`Sort by Work Order${sortKey==='work_order'?` (${sortDir})`:''}`}>
                                <span>Work Order</span>
                                {sortKey==='work_order' ? (sortDir==='asc'? <ArrowUp className="h-4 w-4 text-muted-foreground"/> : <ArrowDown className="h-4 w-4 text-muted-foreground"/>) : <ArrowUpDown className="h-4 w-4 text-muted-foreground"/>}
                              </button>
                            </TableHead>
                          )}
                          {columnVisibility.description !== false && (
                            <TableHead>Description</TableHead>
                          )}
                          {columnVisibility.subcontractor !== false && (
                            <TableHead>Subcontractor</TableHead>
                          )}
                          {columnVisibility.location !== false && (
                            <TableHead>Location</TableHead>
                          )}
                          {columnVisibility.submitted !== false && (
                            <TableHead>
                              <button type="button" onClick={() => toggleSort('submitted')} className="inline-flex items-center gap-2" aria-label={`Sort by Submitted${sortKey==='submitted'?` (${sortDir})`:''}`}>
                                <span>Submitted</span>
                                {sortKey==='submitted' ? (sortDir==='asc'? <ArrowUp className="h-4 w-4 text-muted-foreground"/> : <ArrowDown className="h-4 w-4 text-muted-foreground"/>) : <ArrowUpDown className="h-4 w-4 text-muted-foreground"/>}
                              </button>
                            </TableHead>
                          )}
                          {columnVisibility.invoices !== false && (
                            <TableHead>Invoices</TableHead>
                          )}
                          {columnVisibility.amount !== false && (
                            <TableHead>
                              <button type="button" onClick={() => toggleSort('amount')} className="inline-flex items-center gap-2" aria-label={`Sort by Amount${sortKey==='amount'?` (${sortDir})`:''}`}>
                                <span>Amount</span>
                                {sortKey==='amount' ? (sortDir==='asc'? <ArrowUp className="h-4 w-4 text-muted-foreground"/> : <ArrowDown className="h-4 w-4 text-muted-foreground"/>) : <ArrowUpDown className="h-4 w-4 text-muted-foreground"/>}
                              </button>
                            </TableHead>
                          )}
                          {columnVisibility.status !== false && (
                            <TableHead>Status</TableHead>
                          )}
                          <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedReports.map((report) => {
                          const isSelected = selectedReportIds.has(report.id);
                          return (
                            <TableRow 
                              key={report.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Toggle selection for work order ${report.work_orders?.work_order_number || report.id}`}
                              className={`cursor-pointer hover:bg-muted/50 ${
                                isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                              }`}
                              onClick={() => handleReportToggle(report.id, !isSelected)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleReportToggle(report.id, !isSelected);
                                }
                              }}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleReportToggle(report.id, checked === true)}
                                />
                              </TableCell>
                              {columnVisibility.work_order !== false && (
                                <TableCell className="font-medium">
                                  {report.work_orders?.work_order_number || 'N/A'}
                                </TableCell>
                              )}
                              {columnVisibility.description !== false && (
                                <TableCell className="max-w-[200px]">
                                  <div className="space-y-2">
                                    <p className="font-medium truncate">
                                      {report.work_orders?.title || 'No title'}
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {report.work_orders?.description || 'No description'}
                                    </p>
                                  </div>
                                </TableCell>
                              )}
                              {columnVisibility.subcontractor !== false && (
                                <TableCell>
                                  {(() => {
                                    const subcontractor = report.subcontractor;
                                    const subcontractorOrg = report.subcontractor_organization;
                                    const submittedBy = report.submitted_by;
                                    
                                    // Determine what to display based on organization type
                                    let displayName = 'N/A';
                                    
                                    // Check if subcontractor is from internal organization
                                    const isInternalSubcontractor = subcontractor?.organization_members?.some(
                                      (om) => om.organizations?.organization_type === 'internal'
                                    );
                                    
                                    if (subcontractorOrg) {
                                      // Organization-level assignment - always show organization name for subcontractors
                                      displayName = subcontractorOrg.name;
                                    } else if (subcontractor && isInternalSubcontractor) {
                                      // Individual internal user - show their name
                                      displayName = `${subcontractor.first_name} ${subcontractor.last_name}`;
                                    } else if (subcontractor) {
                                      // Individual subcontractor from subcontractor org - this shouldn't happen but fallback to org name
                                      const subcontractorOrgFromMember = subcontractor.organization_members?.find(
                                        (om) => om.organizations?.organization_type === 'subcontractor'
                                      );
                                      displayName = subcontractorOrgFromMember?.organizations?.name || `${subcontractor.first_name} ${subcontractor.last_name}`;
                                    }

                                    return (
                                      <div>
                                        <div className="font-medium">
                                          {displayName}
                                        </div>
                                        {submittedBy && submittedBy.organization_members?.some((om) => om.organizations?.organization_type === 'internal') && (
                                          <div className="text-xs text-muted-foreground font-medium">
                                            Submitted by Admin: {submittedBy.first_name} {submittedBy.last_name}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                              )}
                              {columnVisibility.location !== false && (
                                <TableCell>
                                  {report.work_orders?.store_location || '-'}
                                </TableCell>
                              )}
                              {columnVisibility.submitted !== false && (
                                <TableCell>
                                  {format(new Date(report.submitted_at), 'MMM d, yyyy')}
                                </TableCell>
                              )}
                              {columnVisibility.invoices !== false && (
                                <TableCell>
                                  {(() => {
                                    const reportInvoiceDetail = invoiceDetails?.find(detail => detail.report_id === report.id);
                                    const invoiceCount = reportInvoiceDetail?.invoice_count || 0;
                                    
                                    return (
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="h-5 text-[10px] px-2">
                                          {invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''}
                                        </Badge>
                                        {invoiceCount > 0 && (
                                          <Badge variant="default" className="h-5 text-[10px] px-2">
                                            Approved
                                          </Badge>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                              )}
                              {columnVisibility.amount !== false && (
                                <TableCell>
                                  {report.subcontractor_costs ? (
                                    (() => {
                                      const reportInvoiceDetail = invoiceDetails?.find(detail => detail.report_id === report.id);
                                      const invoiceCount = reportInvoiceDetail?.invoice_count || 0;
                                      
                                      return (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2 cursor-help">
                                              <Badge variant={isSelected ? "default" : "secondary"} className="h-5 text-[10px] px-2">
                                                {formatCurrency(report.subcontractor_costs)}
                                              </Badge>
                                              {invoiceCount > 1 && (
                                                <Info className="w-3 h-3 text-muted-foreground" />
                                              )}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent className="z-50 bg-popover">
                                            {invoiceCount > 1 ? (
                                              <div className="space-y-2 text-xs">
                                                <p className="font-medium">Invoice Breakdown:</p>
                                                {reportInvoiceDetail?.invoices.map((invoice, index) => (
                                                  <div key={invoice.invoice_id} className="flex justify-between gap-4">
                                                    <span>{invoice.invoice_number}</span>
                                                    <span>{formatCurrency(invoice.amount)}</span>
                                                  </div>
                                                ))}
                                                <div className="border-t pt-2 flex justify-between gap-4 font-medium">
                                                  <span>Total:</span>
                                                  <span>{formatCurrency(reportInvoiceDetail?.total_amount || 0)}</span>
                                                </div>
                                              </div>
                                            ) : (
                                              <p>Cost from approved subcontractor invoice</p>
                                            )}
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    })()
                                  ) : (
                                    '-'
                                 )}
                                </TableCell>
                              )}
                              {columnVisibility.status !== false && (
                                <TableCell>
                                  <ReportStatusBadge status="approved" size="sm" />
                                </TableCell>
                              )}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <TableActionsDropdown
                                  actions={[
                                    {
                                      label: 'View Details',
                                      icon: Eye,
                                      onClick: () => {
                                        // Navigate to work order detail or report detail
                                        navigate(`/admin/work-orders/${report.work_order_id}`);
                                      },
                                    },
                                    {
                                      label: 'Remove from Selection',
                                      icon: X,
                                      onClick: () => handleReportToggle(report.id, false),
                                      show: isSelected,
                                    },
                                  ]}
                                  align="end"
                                  itemName={`report ${report.work_orders?.work_order_number || report.id}`}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ResponsiveTableWrapper>
                </div>

                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-4">
                  {filteredAndSortedReports.map((report) => {
                    const isSelected = selectedReportIds.has(report.id);
                    const reportInvoiceDetail = invoiceDetails?.find(detail => detail.report_id === report.id);
                    const invoiceCount = reportInvoiceDetail?.invoice_count || 0;

                    return (
                      <MobileTableCard
                        key={report.id}
                        data={{
                          'Work Order': report.work_orders?.work_order_number || 'N/A',
                          'Title': report.work_orders?.title || 'No title',
                          'Location': report.work_orders?.store_location || '-',
                          'Submitted': format(new Date(report.submitted_at), 'MMM d, yyyy'),
                          'Amount': report.subcontractor_costs ? formatCurrency(report.subcontractor_costs) : '-',
                          'Status': 'Approved'
                        }}
                        badge={
                          <ReportStatusBadge status="approved" size="sm" />
                        }
                        actions={[
                          {
                            label: 'View Details',
                            icon: Eye,
                            onClick: () => navigate(`/admin/work-orders/${report.work_order_id}`),
                          },
                          {
                            label: 'Remove from Selection',
                            icon: X,
                            onClick: () => handleReportToggle(report.id, false),
                            show: isSelected,
                          },
                        ]}
                        className={isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : ''}
                      />
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
      </main>
    </TooltipProvider>
  );
}