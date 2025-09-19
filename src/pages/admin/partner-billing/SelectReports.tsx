import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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

import { usePartnerReadyBills, PartnerReadyData } from '@/hooks/usePartnerReadyBills';
import { usePartnerInvoiceGeneration } from '@/hooks/usePartnerInvoiceGeneration';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { useViewMode } from '@/hooks/useViewMode';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { FileBarChart, Building2, DollarSign, Calendar, Receipt, Percent, CheckSquare, Info, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Eye, Download, X, Filter, Search, Settings, ChevronDown, Clock, FileText } from 'lucide-react';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { exportToCSV, ExportColumn } from '@/lib/utils/export';
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/utils/date';
import { formatCurrency } from '@/utils/formatting';
import { PartnerReadyBill, PartnerReadyInternalReport } from '@/hooks/usePartnerReadyBills';
import { cn } from '@/lib/utils';
import { getWorkOrderReference, getWorkOrderDisplay } from '@/utils/workOrderUtils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface UnifiedBillableItem {
  id: string;
  type: 'bill' | 'internal' | 'time';
  reference: string;
  description: string;
  date: string;
  amount: number;
  workOrders: Array<{
    id: string;
    number: string;
    title?: string;
  }>;
  originalData: any;
}

export default function SelectBills() {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | undefined>(() => {
    const v = localStorage.getItem('pb.selectedPartnerId');
    return v || undefined;
  });
  // Unified selection state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [markupPercentage, setMarkupPercentage] = useState<number>(() => {
    const v = localStorage.getItem('pb.markupPercentage');
    return v !== null ? Number(v) : 20;
  });
  const [invoiceDate, setInvoiceDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState<string | ''>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Expandable row state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const toggleRowExpansion = (itemId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };
  
  // Filter states with standardized persistence
  const [isMarkupCollapsed, setIsMarkupCollapsed] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'bill' | 'internal' | 'time'>(() => {
    const saved = localStorage.getItem('pb.typeFilter');
    return (saved as 'all' | 'bill' | 'internal' | 'time') || 'all';
  });
  
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
  
  // Fetch ready bills and internal reports for the selected partner
  const { data: partnerData, isLoading: isLoadingBills, error: billsError } = usePartnerReadyBills(selectedPartnerId);
  const bills = partnerData?.bills;
  const internalReports = partnerData?.internalReports || [];
  const employeeTimeEntries = partnerData?.employeeTimeEntries || [];
  const { mutate: generateInvoice, isPending: isGeneratingInvoice } = usePartnerInvoiceGeneration();

  // Transform all billable items into unified format
  const unifiedItems = useMemo(() => {
    const items: UnifiedBillableItem[] = [];
    
    // Transform bills
    bills?.forEach(bill => {
      // Map work order numbers from bill to work order objects
      const workOrders = bill.work_order_numbers?.map((number, index) => ({
        id: `wo-${bill.bill_id}-${index}`, // Generate ID for now, could be improved with actual work order IDs
        number,
        title: undefined // Bills don't have individual work order titles in current structure
      })) || [];

      items.push({
        id: bill.bill_id,
        type: 'bill',
        reference: bill.internal_bill_number,
        description: bill.subcontractor_org_name,
        date: bill.bill_date,
        amount: bill.total_amount || 0,
        workOrders,
        originalData: bill
      });
    });
    
    // Transform internal reports
    internalReports?.forEach(report => {
      const workOrders = [{
        id: report.work_order_id,
        number: report.work_order_number,
        title: report.title
      }];

      items.push({
        id: report.id,
        type: 'internal',
        reference: report.work_order_number,
        description: report.title,
        date: '', // Internal reports don't have dates in current structure
        amount: report.bill_amount || 0,
        workOrders,
        originalData: report
      });
    });
    
    // Transform employee time entries
    employeeTimeEntries?.forEach(entry => {
      const workOrders = [{
        id: entry.work_order_id,
        number: entry.work_order_number,
        title: entry.title
      }];

      items.push({
        id: entry.id,
        type: 'time',
        reference: entry.work_order_number,
        description: `${entry.employee_name} - ${entry.hours_worked}h`,
        date: entry.report_date,
        amount: entry.bill_amount || 0,
        workOrders,
        originalData: entry
      });
    });
    
    return items;
  }, [bills, internalReports, employeeTimeEntries]);

  // Calculate item counts by type
  const typeCounts = useMemo(() => {
    return unifiedItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [unifiedItems]);

  // Apply filters to unified items
  const filteredUnifiedItems = useMemo(() => {
    let filtered = unifiedItems;

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    if (filters.search?.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.reference.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.type.toLowerCase().includes(searchLower) ||
        item.workOrders.some(wo => wo.number.toLowerCase().includes(searchLower) || wo.title?.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [unifiedItems, filters, typeFilter]);

  // Sort and paginate the filtered unified items
  const filteredAndSortedUnifiedItems = useMemo(() => {
    if (!filteredUnifiedItems) return [];
    
    const sorted = [...filteredUnifiedItems].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortKey) {
        case 'bill_number':
          aVal = a.reference || '';
          bVal = b.reference || '';
          break;
        case 'date':
          aVal = a.date ? new Date(a.date) : new Date(0);
          bVal = b.date ? new Date(b.date) : new Date(0);
          break;
        case 'amount':
          aVal = a.amount || 0;
          bVal = b.amount || 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredUnifiedItems, sortKey, sortDir]);

  // Create paginated unified items for display
  const paginatedUnifiedItems = useMemo(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredAndSortedUnifiedItems.slice(startIndex, endIndex);
  }, [filteredAndSortedUnifiedItems, pagination]);

  // Mock table for pagination component
  const mockTable = {
    getRowModel: () => ({ rows: paginatedUnifiedItems.map((_, i) => ({ id: i })) }),
    getFilteredRowModel: () => ({ rows: filteredAndSortedUnifiedItems.map((_, i) => ({ id: i })) }),
    getState: () => ({ pagination }),
    setPageSize: (size: number) => setPagination(prev => ({ ...prev, pageSize: size, pageIndex: 0 })),
    previousPage: () => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) })),
    nextPage: () => setPagination(prev => ({ 
      ...prev, 
      pageIndex: Math.min(Math.ceil(filteredAndSortedUnifiedItems.length / prev.pageSize) - 1, prev.pageIndex + 1) 
    })),
    getCanPreviousPage: () => pagination.pageIndex > 0,
    getCanNextPage: () => (pagination.pageIndex + 1) * pagination.pageSize < filteredAndSortedUnifiedItems.length,
    getPageCount: () => Math.ceil(filteredAndSortedUnifiedItems.length / pagination.pageSize)
  } as any;

  // Calculate totals from unified selection
  const calculations = useMemo(() => {
    const selectedItems = Array.from(selectedItemIds).map(id =>
      unifiedItems.find(item => item.id === id)
    ).filter(Boolean);
    
    const subtotal = selectedItems.reduce((sum, item) => sum + (item?.amount || 0), 0);
    const markupAmount = subtotal * (markupPercentage / 100);
    const total = subtotal + markupAmount;
    
    // Calculate unique work orders from selected items
    const workOrdersMap = new Map();
    selectedItems.forEach(item => {
      item?.workOrders.forEach(wo => {
        if (!workOrdersMap.has(wo.id)) {
          workOrdersMap.set(wo.id, {
            id: wo.id,
            number: wo.number,
            title: wo.title,
            reference: getWorkOrderReference(wo.number, wo.number, wo.id),
            itemCount: 0,
            totalAmount: 0
          });
        }
        const woSummary = workOrdersMap.get(wo.id);
        woSummary.itemCount += 1;
        woSummary.totalAmount += item.amount;
      });
    });
    
    const uniqueWorkOrders = Array.from(workOrdersMap.values());
    
    return { subtotal, markupAmount, total, selectedItems, uniqueWorkOrders };
  }, [selectedItemIds, unifiedItems, markupPercentage]);

  // Unified selection handlers
  const handleUnifiedItemToggle = (id: string, checked: boolean) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!paginatedUnifiedItems) return;
    const allCurrentItemsSelected = paginatedUnifiedItems.every(item => selectedItemIds.has(item.id));
    
    if (allCurrentItemsSelected) {
      // Deselect all current page items
      paginatedUnifiedItems.forEach(item => {
        setSelectedItemIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      });
    } else {
      // Select all current page items
      paginatedUnifiedItems.forEach(item => {
        setSelectedItemIds(prev => new Set(prev).add(item.id));
      });
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

  useEffect(() => {
    localStorage.setItem('pb.typeFilter', typeFilter);
  }, [typeFilter]);

  const handleExportSelected = (exportFormat: 'csv' | 'excel') => {
    try {
      if (selectedItemIds.size === 0) return;

      const selectedItems = Array.from(selectedItemIds).map(id => 
        unifiedItems.find(item => item.id === id)
      ).filter(Boolean);
      
      // Prepare export data
      const exportData = selectedItems.map(item => ({
        type: item?.type === 'bill' ? 'Bill' : item?.type === 'internal' ? 'Internal' : 'Time',
        reference: item?.reference,
        description: item?.description,
        date: item?.date ? format(new Date(item.date), 'yyyy-MM-dd') : 'N/A',
        amount: item?.amount
      }));

      const columns: ExportColumn[] = [
        { key: 'type', label: 'Type', type: 'string' },
        { key: 'reference', label: 'Reference', type: 'string' },
        { key: 'description', label: 'Description', type: 'string' },
        { key: 'date', label: 'Date', type: 'string' },
        { key: 'amount', label: 'Amount', type: 'currency' }
      ];

      const baseFilename = `selected_billable_items_${format(new Date(), 'yyyy-MM-dd')}`;
      const filename = exportFormat === 'csv' ? `${baseFilename}.csv` : `${baseFilename}.xlsx`;
      
      exportToCSV(exportData, columns, filename);
      toast({
        title: "Export Complete",
        description: `${selectedItems.length} items exported as ${exportFormat.toUpperCase()} successfully`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export selected items",
        variant: "destructive"
      });
    }
  };

  const handleGenerateInvoice = () => {
    if (!selectedPartnerId || selectedItemIds.size === 0) return;
    
    // Validate minimum invoice amount
    if (calculations.subtotal < 0.01) {
      toast({
        title: "Cannot Generate Invoice",
        description: "Selected items have no associated costs.",
        variant: "destructive"
      });
      return;
    }

    // Extract IDs by type from unified selection
    const billIds: string[] = [];
    const reportIds: string[] = [];
    const employeeTimeIds: string[] = [];

    Array.from(selectedItemIds).forEach(id => {
      const item = unifiedItems.find(item => item.id === id);
      if (item) {
        switch (item.type) {
          case 'bill':
            billIds.push(id);
            break;
          case 'internal':
            reportIds.push(id);
            break;
          case 'time':
            employeeTimeIds.push(id);
            break;
        }
      }
    });
    
    generateInvoice({
      partnerOrganizationId: selectedPartnerId,
      selectedBillIds: billIds,
      internalReportIds: reportIds,
      employeeTimeIds: employeeTimeIds,
      markupPercentage,
      subtotal: calculations.subtotal,
      totalAmount: calculations.total,
      invoiceDate,
      dueDate: dueDate || undefined,
    }, {
      onSuccess: (result) => {
        // Clear selection
        setSelectedItemIds(new Set());
        setShowConfirmDialog(false);
        // Navigate to invoice detail
        navigate(`/admin/partner-billing/invoices/${result.invoiceId}`);
      },
      onError: () => {
        // Errors are handled by usePartnerInvoiceGeneration toast logic
      }
    });
  };

  const totalApprovedBillAmount = unifiedItems?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

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

        {/* Unified Billable Items Display */}
        {selectedPartnerId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileBarChart className="w-5 h-5" />
                  Billable Items ({unifiedItems?.length || 0})
                </CardTitle>
                
                {/* Integrated Control Bar */}
                <div className="flex items-center gap-2">
                  <SmartSearchInput
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search items..."
                    className="w-64"
                  />
                  
                  <ViewModeSwitcher
                    value={viewMode}
                    onValueChange={setViewMode}
                    allowedModes={allowedModes}
                  />
                  
                  {filteredAndSortedUnifiedItems && filteredAndSortedUnifiedItems.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        disabled={!paginatedUnifiedItems || paginatedUnifiedItems.length === 0}
                      >
                        {paginatedUnifiedItems?.every(item => selectedItemIds.has(item.id)) ? 'Deselect All' : 'Select All'}
                      </Button>
                      {selectedItemIds.size > 0 && (
                        <ExportDropdown 
                          onExport={handleExportSelected} 
                          disabled={selectedItemIds.size === 0}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Type Filter */}
              <div className="mb-4">
                <ToggleGroup 
                  type="single" 
                  value={typeFilter} 
                  onValueChange={(value) => setTypeFilter(value as 'all' | 'bill' | 'internal' | 'time' || 'all')}
                  className="justify-start"
                >
                  <ToggleGroupItem value="all">All ({unifiedItems.length})</ToggleGroupItem>
                  <ToggleGroupItem value="bill">Bills ({typeCounts.bill || 0})</ToggleGroupItem>
                  <ToggleGroupItem value="internal">Internal ({typeCounts.internal || 0})</ToggleGroupItem>
                  <ToggleGroupItem value="time">Time ({typeCounts.time || 0})</ToggleGroupItem>
                </ToggleGroup>
              </div>
              
              {billsError ? (
                <EmptyState
                  icon={FileBarChart}
                  title="Error loading items"
                  description="We couldn't load billable items. Please try again."
                  action={{ label: 'Retry', onClick: () => window.location.reload() }}
                />
              ) : isLoadingBills ? (
                <EnhancedTableSkeleton rows={5} columns={6} showHeader />
              ) : !filteredAndSortedUnifiedItems || filteredAndSortedUnifiedItems.length === 0 ? (
                filterCount > 0 ? (
                  <EmptyState
                    icon={Search}
                    title="No matching items"
                    description="No items match your current filters. Try adjusting your search criteria."
                    action={{ label: 'Clear filters', onClick: clearFilters }}
                  />
                ) : (
                  <EmptyState
                    icon={FileBarChart}
                    title="No items ready to invoice"
                    description="There are no billable items ready for partner invoicing for this organization."
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
                                  checked={paginatedUnifiedItems.length > 0 && paginatedUnifiedItems.every(item => selectedItemIds.has(item.id))}
                                  onCheckedChange={handleSelectAll}
                                  aria-label="Select all visible items"
                                />
                              </TableHead>
                              <TableHead className="min-w-[80px]">Type</TableHead>
                              <TableHead className="min-w-[120px] cursor-pointer" onClick={() => toggleSort('bill_number')}>
                                <div className="flex items-center gap-1">
                                  Reference
                                  {sortKey === 'bill_number' && (
                                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                  )}
                                </div>
                              </TableHead>
                              <TableHead className="min-w-[200px]">Description</TableHead>
                              <TableHead className="min-w-[150px]">Work Orders</TableHead>
                              <TableHead className="min-w-[120px] cursor-pointer" onClick={() => toggleSort('date')}>
                                <div className="flex items-center gap-1">
                                  Date
                                  {sortKey === 'date' && (
                                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                  )}
                                </div>
                              </TableHead>
                              <TableHead className="min-w-[130px] cursor-pointer text-right" onClick={() => toggleSort('amount')}>
                                <div className="flex items-center justify-end gap-1">
                                  Amount
                                  {sortKey === 'amount' && (
                                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                  )}
                                </div>
                              </TableHead>
                              <TableHead className="w-12">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    const allExpanded = paginatedUnifiedItems.every(item => expandedRows.has(item.id));
                                    if (allExpanded) {
                                      setExpandedRows(new Set());
                                    } else {
                                      setExpandedRows(new Set(paginatedUnifiedItems.map(item => item.id)));
                                    }
                                  }}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedUnifiedItems.map((item) => {
                              const isSelected = selectedItemIds.has(item.id);
                              const isExpanded = expandedRows.has(item.id);
                              
                              return (
                                <React.Fragment key={item.id}>
                                  <TableRow 
                                    className={cn(
                                      "cursor-pointer transition-colors hover:bg-muted/50",
                                      isSelected && "bg-muted/50"
                                    )}
                                    onClick={() => handleUnifiedItemToggle(item.id, !isSelected)}
                                  >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => handleUnifiedItemToggle(item.id, checked as boolean)}
                                        aria-label={`Select item ${item.reference}`}
                                      />
                                    </TableCell>
                                    
                                    <TableCell>
                                      <Badge 
                                        className={cn(
                                          "text-white",
                                          item.type === 'bill' && "bg-blue-500 hover:bg-blue-600",
                                          item.type === 'internal' && "bg-green-500 hover:bg-green-600",
                                          item.type === 'time' && "bg-purple-500 hover:bg-purple-600"
                                        )}
                                      >
                                        {item.type === 'bill' ? 'Bill' : item.type === 'internal' ? 'Internal' : 'Time'}
                                      </Badge>
                                    </TableCell>
                                    
                                    <TableCell className="font-medium">
                                      {item.reference}
                                    </TableCell>
                                    
                                    <TableCell>
                                      <div className="max-w-[200px] truncate">
                                        {item.description}
                                      </div>
                                    </TableCell>
                                    
                                    <TableCell>
                                      <div className="space-y-1">
                                        {item.workOrders.slice(0, 2).map((wo, index) => (
                                          <Badge key={index} variant="outline" className="text-xs">
                                            {getWorkOrderReference(wo.number, wo.number, wo.id)}
                                          </Badge>
                                        ))}
                                        {item.workOrders.length > 2 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{item.workOrders.length - 2} more
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    
                                    <TableCell>
                                      {item.date ? format(new Date(item.date), 'MMM dd, yyyy') : 'N/A'}
                                    </TableCell>
                                    
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(item.amount)}
                                    </TableCell>
                                    
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => toggleRowExpansion(item.id)}
                                      >
                                        <ChevronDown className={cn(
                                          "h-3 w-3 transition-transform",
                                          isExpanded && "rotate-180"
                                        )} />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                  
                                  {/* Expanded Row Content */}
                                  {isExpanded && (
                                    <TableRow>
                                      <TableCell colSpan={8} className="bg-muted/25">
                                        <div className="py-4 space-y-3">
                                          <h4 className="font-medium text-sm">Work Order Details</h4>
                                          <div className="grid gap-2">
                                            {item.workOrders.map((wo, index) => (
                                              <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                                                <div>
                                                  <div className="font-medium text-sm">
                                                    {getWorkOrderDisplay(wo.number, wo.number, wo.id, wo.title)}
                                                  </div>
                                                  {wo.title && (
                                                    <div className="text-xs text-muted-foreground">{wo.title}</div>
                                                  )}
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                  ID: {wo.id}
                                                </Badge>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ResponsiveTableWrapper>
                    </div>
                  ) : (
                    /* Card View */
                    <div className="space-y-4">
                      {paginatedUnifiedItems.map((item) => {
                        const isSelected = selectedItemIds.has(item.id);
                        
                        return (
                          <MobileTableCard 
                            key={item.id}
                            selected={isSelected}
                            onSelect={(checked) => handleUnifiedItemToggle(item.id, checked)}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-medium">{item.reference}</div>
                                </div>
                                <Badge 
                                  className={cn(
                                    "text-white text-xs",
                                    item.type === 'bill' && "bg-blue-500",
                                    item.type === 'internal' && "bg-green-500",
                                    item.type === 'time' && "bg-purple-500"
                                  )}
                                >
                                  {item.type === 'bill' ? 'Bill' : item.type === 'internal' ? 'Internal' : 'Time'}
                                </Badge>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="text-sm truncate">{item.description}</div>
                                
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Work Orders:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {item.workOrders.slice(0, 2).map((wo, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {getWorkOrderReference(wo.number, wo.number, wo.id)}
                                      </Badge>
                                    ))}
                                    {item.workOrders.length > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{item.workOrders.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Date:</span>
                                  <span>{item.date ? format(new Date(item.date), 'MMM dd, yyyy') : 'N/A'}</span>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Amount:</span>
                                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                                </div>
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
        {selectedItemIds.size > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Work Orders Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Work Orders Included ({calculations.uniqueWorkOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {calculations.uniqueWorkOrders.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No work orders selected
                    </div>
                  ) : (
                    calculations.uniqueWorkOrders.map((wo) => (
                      <div key={wo.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {getWorkOrderDisplay(wo.number, wo.number, wo.id, wo.title)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {wo.itemCount} billable item{wo.itemCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">{formatCurrency(wo.totalAmount)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Right: Invoice Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  Invoice Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedItemIds.size}</div>
                      <div className="text-sm text-muted-foreground">Selected Items</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{calculations.uniqueWorkOrders.length}</div>
                      <div className="text-sm text-muted-foreground">Work Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatCurrency(calculations.subtotal)}</div>
                      <div className="text-sm text-muted-foreground">Subtotal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatCurrency(calculations.markupAmount)}</div>
                      <div className="text-sm text-muted-foreground">Markup ({markupPercentage}%)</div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{formatCurrency(calculations.total)}</div>
                      <div className="text-sm text-muted-foreground">Total Invoice Amount</div>
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
                          disabled={selectedItemIds.size === 0 || isGeneratingInvoice}
                        >
                          <Receipt className="h-4 w-4" />
                          Generate Partner Invoice
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Generate Partner Invoice</AlertDialogTitle>
                          <AlertDialogDescription>
                             This will create a new partner invoice for {selectedItemIds.size} selected item{selectedItemIds.size !== 1 ? 's' : ''} 
                            across {calculations.uniqueWorkOrders.length} work order{calculations.uniqueWorkOrders.length !== 1 ? 's' : ''}, 
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
          </div>
        )}
      </main>
    </TooltipProvider>
  );
}