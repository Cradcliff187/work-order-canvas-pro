import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

import { usePartnerReadyBills } from '@/hooks/usePartnerReadyBills';
import { usePartnerInvoiceGeneration } from '@/hooks/usePartnerInvoiceGeneration';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { useViewMode } from '@/hooks/useViewMode';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { FileBarChart, Building2, DollarSign, Calendar, Receipt, Percent, CheckSquare, Info, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Eye, Download, X, Filter, Search, Settings, ChevronDown } from 'lucide-react';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { exportToCSV, ExportColumn } from '@/lib/utils/export';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatting';
import { PartnerReadyBill } from '@/hooks/usePartnerReadyBills';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function SelectBills() {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | undefined>(() => {
    const v = localStorage.getItem('pb.selectedPartnerId');
    return v || undefined;
  });
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [markupPercentage, setMarkupPercentage] = useState<number>(() => {
    const v = localStorage.getItem('pb.markupPercentage');
    return v !== null ? Number(v) : 20;
  });
  const [invoiceDate, setInvoiceDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState<string | ''>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Filter states with standardized persistence
  const [isMarkupCollapsed, setIsMarkupCollapsed] = useState(true);
  
  // Use interface compatible with BillingFilters
  interface FilterValue {
    search?: string;
  }
  
  const initialFilters: FilterValue = {};
  const { filters, setFilters, clearFilters, filterCount } = useAdminFilters(
    'partner-billing-bills-v1',
    initialFilters,
    { excludeKeys: [] }
  );

  // View mode management - cards only on mobile, both on desktop
  const { viewMode, setViewMode, allowedModes, isAllowed } = useViewMode({
    componentKey: 'partner-billing-bills',
    config: {
      mobile: ['card'],
      desktop: ['table', 'card']
    },
    defaultMode: 'table'
  });

  // Sorting and pagination for table
  type SortKey = 'bill_number' | 'date' | 'amount';
  const [sortKey, setSortKey] = useState<SortKey>('date');
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
    bill_number: { label: 'Bill Number', description: 'Internal and external bill numbers', defaultVisible: true },
    subcontractor: { label: 'Subcontractor', description: 'Subcontractor organization', defaultVisible: true },
    work_orders: { label: 'Work Orders', description: 'Associated work order numbers', defaultVisible: true },
    date: { label: 'Bill Date', description: 'Date of the bill', defaultVisible: true },
    amount: { label: 'Amount', description: 'Total bill amount', defaultVisible: true }
  };

  const { 
    columnVisibility, 
    toggleColumn, 
    resetToDefaults: resetColumnDefaults,
    getAllColumns 
  } = useColumnVisibility({
    storageKey: 'partner-billing-select-bills-columns',
    columnMetadata,
    legacyKeys: []
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Fetch ready bills for the selected partner
  const { data: bills, isLoading: isLoadingBills, error: billsError } = usePartnerReadyBills(selectedPartnerId);
  const { mutate: generateInvoice, isPending: isGeneratingInvoice } = usePartnerInvoiceGeneration();

  // Apply filters to bills with inline filtering logic
  const filteredBills = useMemo(() => {
    if (!bills) return [];
    
    return bills.filter(bill => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = 
          bill.internal_bill_number?.toLowerCase().includes(searchLower) ||
          bill.external_bill_number?.toLowerCase().includes(searchLower) ||
          bill.subcontractor_org_name?.toLowerCase().includes(searchLower) ||
          bill.work_order_numbers?.some(woNum => woNum.toLowerCase().includes(searchLower));
        if (!matches) return false;
      }
      
      return true;
    });
  }, [bills, filters]);

  // Sort and paginate the filtered bills
  const filteredAndSortedBills = useMemo(() => {
    if (!filteredBills) return [];
    
    const sorted = [...filteredBills].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortKey) {
        case 'bill_number':
          aVal = a.internal_bill_number || '';
          bVal = b.internal_bill_number || '';
          break;
        case 'date':
          aVal = new Date(a.bill_date);
          bVal = new Date(b.bill_date);
          break;
        case 'amount':
          aVal = a.total_amount || 0;
          bVal = b.total_amount || 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredBills, sortKey, sortDir]);

  // Create paginated bills for display
  const paginatedBills = useMemo(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredAndSortedBills.slice(startIndex, endIndex);
  }, [filteredAndSortedBills, pagination]);

  // Mock table for pagination component
  const mockTable = {
    getRowModel: () => ({ rows: paginatedBills.map((_, i) => ({ id: i })) }),
    getFilteredRowModel: () => ({ rows: filteredAndSortedBills.map((_, i) => ({ id: i })) }),
    getState: () => ({ pagination }),
    setPageSize: (size: number) => setPagination(prev => ({ ...prev, pageSize: size, pageIndex: 0 })),
    previousPage: () => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) })),
    nextPage: () => setPagination(prev => ({ 
      ...prev, 
      pageIndex: Math.min(Math.ceil(filteredAndSortedBills.length / prev.pageSize) - 1, prev.pageIndex + 1) 
    })),
    getCanPreviousPage: () => pagination.pageIndex > 0,
    getCanNextPage: () => (pagination.pageIndex + 1) * pagination.pageSize < filteredAndSortedBills.length,
    getPageCount: () => Math.ceil(filteredAndSortedBills.length / pagination.pageSize)
  } as any;

  // Calculate totals based on selected bills
  const calculations = useMemo(() => {
    if (!filteredAndSortedBills) return { subtotal: 0, markupAmount: 0, total: 0, selectedBills: [] };
    
    const selectedBills = filteredAndSortedBills.filter(bill => selectedBillIds.has(bill.bill_id));
    const subtotal = selectedBills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
    const markupAmount = subtotal * (markupPercentage / 100);
    const total = subtotal + markupAmount;
    
    return { subtotal, markupAmount, total, selectedBills };
  }, [filteredAndSortedBills, selectedBillIds, markupPercentage]);

  const handleBillToggle = (billId: string, checked: boolean) => {
    const newSet = new Set(selectedBillIds);
    if (checked) {
      newSet.add(billId);
    } else {
      newSet.delete(billId);
    }
    setSelectedBillIds(newSet);
  };

  const handleSelectAll = () => {
    if (!filteredAndSortedBills) return;
    if (selectedBillIds.size === filteredAndSortedBills.length) {
      setSelectedBillIds(new Set());
    } else {
      setSelectedBillIds(new Set(filteredAndSortedBills.map(b => b.bill_id)));
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
      if (!bills || selectedBillIds.size === 0) return;

      const selectedBills = bills.filter(bill => selectedBillIds.has(bill.bill_id));
      
      // Prepare export data
      const exportData = selectedBills.map(bill => ({
        bill_number: bill.internal_bill_number,
        external_bill_number: bill.external_bill_number || '-',
        subcontractor: bill.subcontractor_org_name,
        work_orders: bill.work_order_numbers.join(', '),
        work_order_count: bill.work_order_count,
        bill_date: format(new Date(bill.bill_date), 'yyyy-MM-dd'),
        amount: bill.total_amount,
        status: 'Approved'
      }));

      const columns: ExportColumn[] = [
        { key: 'bill_number', label: 'Internal Bill #', type: 'string' },
        { key: 'external_bill_number', label: 'External Bill #', type: 'string' },
        { key: 'subcontractor', label: 'Subcontractor', type: 'string' },
        { key: 'work_orders', label: 'Work Orders', type: 'string' },
        { key: 'work_order_count', label: 'WO Count', type: 'number' },
        { key: 'bill_date', label: 'Bill Date', type: 'string' },
        { key: 'amount', label: 'Bill Amount', type: 'currency' },
        { key: 'status', label: 'Status', type: 'string' }
      ];

      const baseFilename = `selected_bills_${format(new Date(), 'yyyy-MM-dd')}`;
      const filename = exportFormat === 'csv' ? `${baseFilename}.csv` : `${baseFilename}.xlsx`;
      
      exportToCSV(exportData, columns, filename);
      toast({
        title: "Export Complete",
        description: `${selectedBills.length} bills exported as ${exportFormat.toUpperCase()} successfully`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export selected bills",
        variant: "destructive"
      });
    }
  };

  const handleGenerateInvoice = () => {
    if (!selectedPartnerId || selectedBillIds.size === 0) return;
    
    // Validate minimum invoice amount
    if (calculations.subtotal < 0.01) {
      toast({
        title: "Cannot Generate Invoice",
        description: "Selected bills have no associated costs.",
        variant: "destructive"
      });
      return;
    }
    
    generateInvoice({
      partnerOrganizationId: selectedPartnerId,
      selectedBillIds: Array.from(selectedBillIds),
      markupPercentage,
      subtotal: calculations.subtotal,
      totalAmount: calculations.total,
      invoiceDate,
      dueDate: dueDate || undefined,
    }, {
      onSuccess: (result) => {
        // Clear selection
        setSelectedBillIds(new Set());
        setShowConfirmDialog(false);
        // Navigate to invoice detail
        navigate(`/admin/partner-billing/invoices/${result.invoiceId}`);
      },
      onError: () => {
        // Errors are handled by usePartnerInvoiceGeneration toast logic
      }
    });
  };

  const totalApprovedBillAmount = bills?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0;

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
              <BreadcrumbLink href="/admin/partner-billing/invoices">Partner Invoices</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Create Invoice</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Partner Invoices</h1>
            <p className="text-muted-foreground">
              Select approved subcontractor bills to generate partner invoices
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/partner-billing/invoices')}
            className="gap-2"
          >
            <Receipt className="h-4 w-4" />
            View Invoices
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
                  Partner selected. Showing approved subcontractor bills ready for invoicing.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compact Markup Configuration */}
        {selectedPartnerId && bills && bills.length > 0 && (
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

        {/* Bills Display */}
        {selectedPartnerId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileBarChart className="w-5 h-5" />
                  Approved Subcontractor Bills ({filteredAndSortedBills?.length || 0})
                </CardTitle>
                
                {/* Integrated Control Bar */}
                <div className="flex items-center gap-2">
                  <SmartSearchInput
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search bills..."
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
                  
                  {filteredAndSortedBills && filteredAndSortedBills.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        disabled={!filteredAndSortedBills || filteredAndSortedBills.length === 0}
                      >
                        {selectedBillIds.size === filteredAndSortedBills?.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      {selectedBillIds.size > 0 && (
                        <ExportDropdown 
                          onExport={handleExportSelected} 
                          disabled={selectedBillIds.size === 0}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {billsError ? (
                <EmptyState
                  icon={FileBarChart}
                  title="Error loading bills"
                  description="We couldn't load bills. Please try again."
                  action={{ label: 'Retry', onClick: () => window.location.reload() }}
                />
              ) : isLoadingBills ? (
                <EnhancedTableSkeleton rows={5} columns={5} showHeader />
              ) : !filteredAndSortedBills || filteredAndSortedBills.length === 0 ? (
                filterCount > 0 ? (
                  <EmptyState
                    icon={Search}
                    title="No matching bills"
                    description="No bills match your current filters. Try adjusting your search criteria."
                    action={{ label: 'Clear filters', onClick: clearFilters }}
                  />
                ) : (
                  <EmptyState
                    icon={FileBarChart}
                    title="No bills ready for invoicing"
                    description="There are no approved subcontractor bills ready for partner invoicing for this organization."
                  />
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
                                  checked={paginatedBills.length > 0 && paginatedBills.every(bill => selectedBillIds.has(bill.bill_id))}
                                  onCheckedChange={handleSelectAll}
                                  aria-label="Select all visible bills"
                                />
                              </TableHead>
                              {columnVisibility.bill_number && (
                                <TableHead className="min-w-[120px] cursor-pointer" onClick={() => toggleSort('bill_number')}>
                                  <div className="flex items-center gap-1">
                                    Bill Number
                                    {sortKey === 'bill_number' && (
                                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                    )}
                                  </div>
                                </TableHead>
                              )}
                              {columnVisibility.subcontractor && <TableHead className="min-w-[150px]">Subcontractor</TableHead>}
                              {columnVisibility.work_orders && <TableHead className="min-w-[200px]">Work Orders</TableHead>}
                              {columnVisibility.date && (
                                <TableHead className="min-w-[120px] cursor-pointer" onClick={() => toggleSort('date')}>
                                  <div className="flex items-center gap-1">
                                    Bill Date
                                    {sortKey === 'date' && (
                                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                    )}
                                  </div>
                                </TableHead>
                              )}
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
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedBills.map((bill) => {
                              const isSelected = selectedBillIds.has(bill.bill_id);
                              
                              return (
                                <TableRow 
                                  key={bill.bill_id}
                                  className={cn(isSelected && "bg-muted/50")}
                                >
                                  <TableCell>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => handleBillToggle(bill.bill_id, checked as boolean)}
                                      aria-label={`Select bill ${bill.internal_bill_number}`}
                                    />
                                  </TableCell>
                                  
                                  {columnVisibility.bill_number && (
                                    <TableCell>
                                      <div>
                                        <div className="font-medium">{bill.internal_bill_number}</div>
                                        {bill.external_bill_number && (
                                          <div className="text-xs text-muted-foreground">
                                            Ext: {bill.external_bill_number}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  )}
                                  
                                  {columnVisibility.subcontractor && (
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {bill.subcontractor_org_initials}
                                        </Badge>
                                        <span className="font-medium">{bill.subcontractor_org_name}</span>
                                      </div>
                                    </TableCell>
                                  )}
                                  
                                  {columnVisibility.work_orders && (
                                    <TableCell>
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary" className="text-xs">
                                            {bill.work_order_count} WO{bill.work_order_count !== 1 ? 's' : ''}
                                          </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {bill.work_order_numbers.slice(0, 3).join(', ')}
                                          {bill.work_order_numbers.length > 3 && ' +' + (bill.work_order_numbers.length - 3) + ' more'}
                                        </div>
                                      </div>
                                    </TableCell>
                                  )}
                                  
                                  {columnVisibility.date && (
                                    <TableCell>
                                      <span className="text-sm">
                                        {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
                                      </span>
                                    </TableCell>
                                  )}
                                  
                                  {columnVisibility.amount && (
                                    <TableCell className="text-right">
                                      <span className="font-medium">
                                        {formatCurrency(bill.total_amount)}
                                      </span>
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
                    <div className="space-y-4">
                      {paginatedBills.map((bill) => {
                        const isSelected = selectedBillIds.has(bill.bill_id);
                        
                        return (
                          <MobileTableCard 
                            key={bill.bill_id}
                            selected={isSelected}
        onSelect={(checked) => handleBillToggle(bill.bill_id, checked)}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-medium">{bill.internal_bill_number}</div>
                                  {bill.external_bill_number && (
                                    <div className="text-xs text-muted-foreground">
                                      External: {bill.external_bill_number}
                                    </div>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {bill.subcontractor_org_initials}
                                </Badge>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Subcontractor:</span>
                                  <span>{bill.subcontractor_org_name}</span>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Work Orders:</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {bill.work_order_count} WO{bill.work_order_count !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Date:</span>
                                  <span>{format(new Date(bill.bill_date), 'MMM dd, yyyy')}</span>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Amount:</span>
                                  <span className="font-medium">{formatCurrency(bill.total_amount)}</span>
                                </div>
                              </div>
                              
                              <div className="text-xs text-muted-foreground">
                                Work Orders: {bill.work_order_numbers.slice(0, 2).join(', ')}
                                {bill.work_order_numbers.length > 2 && ' +' + (bill.work_order_numbers.length - 2) + ' more'}
                              </div>
                            </div>
                          </MobileTableCard>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="mt-4 border-t pt-4">
                    <TablePagination table={mockTable} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Selection Summary and Generate Invoice */}
        {selectedBillIds.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedBillIds.size}</div>
                    <div className="text-sm text-muted-foreground">Selected Bills</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatCurrency(calculations.subtotal)}</div>
                    <div className="text-sm text-muted-foreground">Subtotal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatCurrency(calculations.markupAmount)}</div>
                    <div className="text-sm text-muted-foreground">Markup ({markupPercentage}%)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{formatCurrency(calculations.total)}</div>
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="invoiceDate">Invoice Date</Label>
                    <Input
                      id="invoiceDate"
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="dueDate">Due Date (Optional)</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        className="gap-2" 
                        disabled={selectedBillIds.size === 0 || isGeneratingInvoice}
                      >
                        <Receipt className="h-4 w-4" />
                        Generate Partner Invoice
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Generate Partner Invoice</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will create a new partner invoice for {selectedBillIds.size} selected bill{selectedBillIds.size !== 1 ? 's' : ''} 
                          totaling {formatCurrency(calculations.total)}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleGenerateInvoice}
                          disabled={isGeneratingInvoice}
                        >
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