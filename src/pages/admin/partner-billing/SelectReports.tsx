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
import { FileBarChart, Building2, DollarSign, Calendar, Receipt, Percent, CheckSquare, Info, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Eye, Download, X } from 'lucide-react';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
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
  // Sorting for table
  type SortKey = 'work_order' | 'submitted' | 'amount';
  const [sortKey, setSortKey] = useState<SortKey>('submitted');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: reports, isLoading, error, refetch } = usePartnerUnbilledReports(selectedPartnerId);
  const { data: reportStats } = usePartnerReportStats(selectedPartnerId);
  const { data: invoiceDetails } = useReportInvoiceDetails(reports?.map(r => r.id) || []);
  const generateInvoice = usePartnerInvoiceGeneration();

  // Calculate totals based on selected reports
  const calculations = useMemo(() => {
    if (!reports) return { subtotal: 0, markupAmount: 0, total: 0, selectedReports: [] };
    
    const selectedReports = reports.filter(report => selectedReportIds.has(report.id));
    const subtotal = selectedReports.reduce((sum, report) => sum + (report.subcontractor_costs || 0), 0);
    const markupAmount = subtotal * (markupPercentage / 100);
    const total = subtotal + markupAmount;
    
    return { subtotal, markupAmount, total, selectedReports };
  }, [reports, selectedReportIds, markupPercentage]);

  const totalSubcontractorCosts = reports?.reduce((sum, report) => sum + (report.subcontractor_costs || 0), 0) || 0;

  const sortedReports = useMemo(() => {
    const list = [...(reports || [])];
    list.sort((a, b) => {
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
    return list;
  }, [reports, sortKey, sortDir]);

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
    if (!reports) return;
    if (selectedReportIds.size === reports.length) {
      setSelectedReportIds(new Set());
    } else {
      setSelectedReportIds(new Set(reports.map(r => r.id)));
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
    localStorage.removeItem('pb.selectedPartnerId');
    localStorage.removeItem('pb.markupPercentage');
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
        {(selectedPartnerId || markupPercentage !== 20) && (
          <Button variant="outline" size="sm" onClick={clearFilters} aria-label="Clear filters">
            Clear filters
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
              {reports && reports.length > 0 && (
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="flex items-center gap-2"
                  >
                    <CheckSquare className="w-4 h-4" />
                    {selectedReportIds.size === reports.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Badge variant="secondary" className="h-5 text-[10px] px-2">
                    {reports.length} report{reports.length !== 1 ? 's' : ''}
                  </Badge>
                   <Badge variant="outline" className="h-5 text-[10px] px-2 flex items-center gap-2">
                     <DollarSign className="w-3 h-3" />
                     {formatCurrency(totalSubcontractorCosts)} available
                   </Badge>
                   {selectedReportIds.size > 0 && (
                     <TableActionsDropdown
                       actions={[
                         {
                           label: `Export Selected (${selectedReportIds.size})`,
                           icon: Download,
                           onClick: () => {
                             // Export selected reports functionality
                             console.log('Export selected reports:', Array.from(selectedReportIds));
                           },
                         },
                         {
                           label: 'Clear Selection',
                           icon: X,
                           onClick: () => setSelectedReportIds(new Set()),
                         },
                       ]}
                       align="end"
                       itemName="selected reports"
                     />
                   )}
                 </div>
               )}
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
            ) : !reports || reports.length === 0 ? (
              <ReportPipelineEmptyState reportStats={reportStats} />
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <ResponsiveTableWrapper stickyFirstColumn>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedReportIds.size === reports.length && reports.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>
                            <button type="button" onClick={() => toggleSort('work_order')} className="inline-flex items-center gap-2" aria-label={`Sort by Work Order${sortKey==='work_order'?` (${sortDir})`:''}`}>
                              <span>Work Order</span>
                              {sortKey==='work_order' ? (sortDir==='asc'? <ArrowUp className="h-4 w-4 text-muted-foreground"/> : <ArrowDown className="h-4 w-4 text-muted-foreground"/>) : <ArrowUpDown className="h-4 w-4 text-muted-foreground"/>}
                            </button>
                          </TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Subcontractor</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>
                            <button type="button" onClick={() => toggleSort('submitted')} className="inline-flex items-center gap-2" aria-label={`Sort by Submitted${sortKey==='submitted'?` (${sortDir})`:''}`}>
                              <span>Submitted</span>
                              {sortKey==='submitted' ? (sortDir==='asc'? <ArrowUp className="h-4 w-4 text-muted-foreground"/> : <ArrowDown className="h-4 w-4 text-muted-foreground"/>) : <ArrowUpDown className="h-4 w-4 text-muted-foreground"/>}
                            </button>
                          </TableHead>
                           <TableHead>Invoices</TableHead>
                           <TableHead>
                            <button type="button" onClick={() => toggleSort('amount')} className="inline-flex items-center gap-2" aria-label={`Sort by Amount${sortKey==='amount'?` (${sortDir})`:''}`}>
                              <span>Amount</span>
                              {sortKey==='amount' ? (sortDir==='asc'? <ArrowUp className="h-4 w-4 text-muted-foreground"/> : <ArrowDown className="h-4 w-4 text-muted-foreground"/>) : <ArrowUpDown className="h-4 w-4 text-muted-foreground"/>}
                            </button>
                           </TableHead>
                           <TableHead>Status</TableHead>
                           <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedReports.map((report) => {
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
                              <TableCell className="font-medium">
                                {report.work_orders?.work_order_number || 'N/A'}
                              </TableCell>
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
                              <TableCell>
                                {report.work_orders?.store_location || '-'}
                              </TableCell>
                              <TableCell>
                                {format(new Date(report.submitted_at), 'MMM d, yyyy')}
                              </TableCell>
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
                               <TableCell>
                                 <ReportStatusBadge status="approved" size="sm" />
                               </TableCell>
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
                  {sortedReports.map((report) => {
                    const isSelected = selectedReportIds.has(report.id);
                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Toggle selection for work order ${report.work_orders?.work_order_number || report.id}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleReportToggle(report.id, !isSelected);
                          }
                        }}
                      >
                        <MobileTableCard
                          key={report.id}
                          title={report.work_orders?.work_order_number || 'N/A'}
                          subtitle={`${report.work_orders?.title || 'No title'} • ${report.work_orders?.description || 'No description'}`}
                          status={<ReportStatusBadge status="approved" size="sm" />}
                          onClick={() => handleReportToggle(report.id, !isSelected)}
                        >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleReportToggle(report.id, checked === true)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                 {report.subcontractor_costs && (
                                   (() => {
                                     const reportInvoiceDetail = invoiceDetails?.find(detail => detail.report_id === report.id);
                                     const invoiceCount = reportInvoiceDetail?.invoice_count || 0;
                                     
                                     return (
                                       <div className="flex items-center gap-1">
                                         <Badge variant={isSelected ? "default" : "secondary"} className="h-5 text-[10px] px-2">
                                           {formatCurrency(report.subcontractor_costs)}
                                         </Badge>
                                         {invoiceCount > 1 && (
                                           <Info className="w-3 h-3 text-muted-foreground" />
                                         )}
                                       </div>
                                     );
                                   })()
                                 )}
                              </div>
                               <div className="flex items-center gap-2 pt-2">
                                 {(() => {
                                   const reportInvoiceDetail = invoiceDetails?.find(detail => detail.report_id === report.id);
                                   const invoiceCount = reportInvoiceDetail?.invoice_count || 0;
                                   
                                   return (
                                     <>
                                       <Badge variant="outline" className="h-4 text-[9px] px-2">
                                         {invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''}
                                       </Badge>
                                       {invoiceCount > 0 && (
                                         <Badge variant="default" className="h-4 text-[9px] px-2">
                                           Approved
                                         </Badge>
                                       )}
                                     </>
                                   );
                                 })()}
                               </div>
                            <div className="text-xs text-muted-foreground space-y-2">
                               <div className="flex items-center gap-2">
                                <Building2 className="w-3 h-3" />
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
                                    // Individual subcontractor from subcontractor org - fallback to org name
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
                              </div>
                               <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(report.submitted_at), 'MMM d, yyyy')}
                              </div>
                              {report.work_orders?.store_location && (
                                 <div className="flex items-center gap-2">
                                  <span>📍</span>
                                  {report.work_orders.store_location}
                                </div>
                              )}
                            </div>
                          </div>
                        </MobileTableCard>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Section - Show when reports are selected */}
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
              {/* Phase 3: Warning for edge cases */}
              {calculations.subtotal < 0.01 && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">Cannot generate invoice</p>
                    <p className="text-muted-foreground">Selected reports have no associated costs. Minimum $0.01 required.</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Subcontractor Costs
                  </Label>
                  <div className="text-lg font-bold">
                    {formatCurrency(calculations.subtotal)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {calculations.selectedReports.length} approved invoice{calculations.selectedReports.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Markup ({markupPercentage}%)
                  </Label>
                  <div className="text-lg font-bold">
                    +{formatCurrency(calculations.markupAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Administrative costs & profit margin
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Total Invoice Amount
                  </Label>
                  <div className="text-xl font-bold text-primary">
                    {formatCurrency(calculations.total)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ready for partner billing
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      className="w-full md:w-auto"
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={!selectedPartnerId || selectedReportIds.size === 0 || generateInvoice.isPending || calculations.subtotal < 0.01}
                    >
                      {generateInvoice.isPending ? (
                        "Generating Invoice..."
                      ) : (
                        `Generate Partner Invoices (${selectedReportIds.size} report${selectedReportIds.size !== 1 ? 's' : ''})`
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Generate Partner Invoices</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-4">
                        <p>You are about to generate an invoice with the following details:</p>
                        <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
                          <p><strong>Partner:</strong> {selectedPartnerId ? 'Selected Partner' : 'Unknown'}</p>
                          <p><strong>Reports:</strong> {selectedReportIds.size} selected</p>
                          <p><strong>Subtotal:</strong> {formatCurrency(calculations.subtotal)}</p>
                          <p><strong>Markup ({markupPercentage}%):</strong> {formatCurrency(calculations.markupAmount)}</p>
                          <p><strong>Total Amount:</strong> {formatCurrency(calculations.total)}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="invoice_date">Invoice date</Label>
                            <Input id="invoice_date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="due_date">Due date (optional)</Label>
                            <Input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                          </div>
                        </div>
                        <p className="text-sm">This action cannot be undone. The selected reports will be marked as billed.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={generateInvoice.isPending}>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleGenerateInvoice}
                        disabled={generateInvoice.isPending}
                      >
                        {generateInvoice.isPending ? 'Generating...' : 'Generate Partner Invoices'}
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