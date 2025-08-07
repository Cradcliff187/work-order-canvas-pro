import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportStatusBadge } from '@/components/ui/status-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { usePartnerUnbilledReports } from '@/hooks/usePartnerUnbilledReports';
import { usePartnerInvoiceGeneration } from '@/hooks/usePartnerInvoiceGeneration';
import { FileBarChart, Building2, DollarSign, Calendar, Receipt, Percent, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function SelectReports() {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>();
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [markupPercentage, setMarkupPercentage] = useState<number>(20);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const navigate = useNavigate();
  const { data: reports, isLoading, error } = usePartnerUnbilledReports(selectedPartnerId);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleGenerateInvoice = () => {
    if (!selectedPartnerId || selectedReportIds.size === 0) return;
    
    generateInvoice.mutate({
      partnerOrganizationId: selectedPartnerId,
      selectedReportIds: Array.from(selectedReportIds),
      markupPercentage,
      subtotal: calculations.subtotal,
      totalAmount: calculations.total
    }, {
      onSuccess: (result) => {
        // Clear selection
        setSelectedReportIds(new Set());
        setShowConfirmDialog(false);
        
        // Navigate to invoice detail
        navigate(`/admin/partner-billing/invoices/${result.invoiceId}`);
      }
    });
  };

  return (
    <div className="space-y-6">
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
                  <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                    {reports.length} report{reports.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="h-5 text-[10px] px-1.5 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {formatCurrency(totalSubcontractorCosts)} available
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <EmptyState
                icon={FileBarChart}
                title="Error loading reports"
                description={error.message}
              />
            ) : isLoading ? (
              <TableSkeleton rows={3} columns={8} />
            ) : !reports || reports.length === 0 ? (
              <EmptyState
                icon={FileBarChart}
                title="No unbilled reports found"
                description="All approved reports for this partner have already been billed, or there are no approved reports yet."
              />
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
                          <TableHead>Work Order</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Subcontractor</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((report) => {
                          const isSelected = selectedReportIds.has(report.id);
                          return (
                            <TableRow 
                              key={report.id}
                              className={`cursor-pointer hover:bg-muted/50 ${
                                isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                              }`}
                              onClick={() => handleReportToggle(report.id, !isSelected)}
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
                                <div className="space-y-1">
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
                                    (om: any) => om.organizations?.organization_type === 'internal'
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
                                      (om: any) => om.organizations?.organization_type === 'subcontractor'
                                    );
                                    displayName = subcontractorOrgFromMember?.organizations?.name || `${subcontractor.first_name} ${subcontractor.last_name}`;
                                  }

                                  return (
                                    <div>
                                      <div className="font-medium">
                                        {displayName}
                                      </div>
                                      {submittedBy && submittedBy.organization_members?.some((om: any) => om.organizations?.organization_type === 'internal') && (
                                        <div className="text-xs text-orange-600 font-medium">
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
                                {report.subcontractor_costs ? (
                                  <Badge variant={isSelected ? "default" : "secondary"} className="h-5 text-[10px] px-1.5">
                                    {formatCurrency(report.subcontractor_costs)}
                                  </Badge>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>
                                <ReportStatusBadge status="approved" size="sm" />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ResponsiveTableWrapper>
                </div>

                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-3">
                  {reports.map((report) => {
                    const isSelected = selectedReportIds.has(report.id);
                    return (
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
                              <Badge variant={isSelected ? "default" : "secondary"} className="h-5 text-[10px] px-1.5">
                                {formatCurrency(report.subcontractor_costs)}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {(() => {
                                const subcontractor = report.subcontractor;
                                const subcontractorOrg = report.subcontractor_organization;
                                const submittedBy = report.submitted_by;
                                
                                // Determine what to display based on organization type
                                let displayName = 'N/A';
                                
                                // Check if subcontractor is from internal organization
                                const isInternalSubcontractor = subcontractor?.organization_members?.some(
                                  (om: any) => om.organizations?.organization_type === 'internal'
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
                                    (om: any) => om.organizations?.organization_type === 'subcontractor'
                                  );
                                  displayName = subcontractorOrgFromMember?.organizations?.name || `${subcontractor.first_name} ${subcontractor.last_name}`;
                                }

                                return (
                                  <div>
                                    <div className="font-medium">
                                      {displayName}
                                    </div>
                                    {submittedBy && submittedBy.organization_members?.some((om: any) => om.organizations?.organization_type === 'internal') && (
                                      <div className="text-xs text-orange-600 font-medium">
                                        Submitted by Admin: {submittedBy.first_name} {submittedBy.last_name}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(report.submitted_at), 'MMM d, yyyy')}
                            </div>
                            {report.work_orders?.store_location && (
                              <div className="flex items-center gap-1">
                                <span>📍</span>
                                {report.work_orders.store_location}
                              </div>
                            )}
                          </div>
                        </div>
                      </MobileTableCard>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Section - Show when reports are selected */}
      {calculations.selectedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Reports Selected</p>
                  <p className="text-lg font-semibold">
                    {calculations.selectedReports.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(calculations.subtotal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Markup ({markupPercentage}%)</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(calculations.markupAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(calculations.total)}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="default" 
                      size="lg"
                      disabled={selectedReportIds.size === 0 || generateInvoice.isPending}
                    >
                      {generateInvoice.isPending ? 'Generating...' : 'Generate Invoice'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Generate Partner Invoice</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>You are about to generate an invoice with the following details:</p>
                        <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                          <p><strong>Partner:</strong> {selectedPartnerId ? 'Selected Partner' : 'Unknown'}</p>
                          <p><strong>Reports:</strong> {selectedReportIds.size} selected</p>
                          <p><strong>Subtotal:</strong> {formatCurrency(calculations.subtotal)}</p>
                          <p><strong>Markup ({markupPercentage}%):</strong> {formatCurrency(calculations.markupAmount)}</p>
                          <p><strong>Total Amount:</strong> {formatCurrency(calculations.total)}</p>
                        </div>
                        <p className="text-sm">This action cannot be undone. The selected reports will be marked as billed.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={generateInvoice.isPending}>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleGenerateInvoice}
                        disabled={generateInvoice.isPending}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
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
    </div>
  );
}