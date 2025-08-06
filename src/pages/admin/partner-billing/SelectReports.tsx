import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
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
          <h1 className="text-3xl font-bold tracking-tight">Partner Billing</h1>
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
                  <Badge variant="secondary">
                    {reports.length} report{reports.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
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
              <TableSkeleton rows={3} columns={2} />
            ) : !reports || reports.length === 0 ? (
              <EmptyState
                icon={FileBarChart}
                title="No unbilled reports found"
                description="All approved reports for this partner have already been billed, or there are no approved reports yet."
              />
            ) : (
              <div className="space-y-3">
                {reports.map((report) => {
                  const isSelected = selectedReportIds.has(report.id);
                  return (
                    <div
                      key={report.id}
                      className={`relative transition-all duration-200 ${
                        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                      }`}
                    >
                      <div className="absolute top-4 left-4 z-10">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleReportToggle(report.id, checked === true)}
                          className="bg-background border-2"
                        />
                      </div>
                      <MobileTableCard
                        title={`Work Order ${report.work_orders?.work_order_number || 'N/A'}`}
                        subtitle={report.work_orders?.title || 'No title'}
                        onClick={() => handleReportToggle(report.id, !isSelected)}
                        status={
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Approved
                            </Badge>
                            {report.subcontractor_costs && (
                              <Badge 
                                variant={isSelected ? "default" : "secondary"}
                                className={`text-xs ${isSelected ? 'bg-primary text-primary-foreground' : ''}`}
                              >
                                {formatCurrency(report.subcontractor_costs)}
                              </Badge>
                            )}
                          </div>
                        }
                      >
                        <div className="space-y-2 ml-6">
                          {/* Work Order Details */}
                          <div className="text-sm text-muted-foreground">
                            <p className="truncate">
                              {report.work_orders?.description || 'No description'}
                            </p>
                          </div>
                          
                          {/* Dates and Location */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                Submitted: {format(new Date(report.submitted_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                            {report.work_orders?.store_location && (
                              <span className="truncate">
                                {report.work_orders.store_location}
                              </span>
                            )}
                          </div>

                          {/* Subcontractor Info */}
                          {report.subcontractor_organization && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Completed by: </span>
                              <span className="font-medium">
                                {report.subcontractor_organization.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </MobileTableCard>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Footer - Fixed at bottom when reports are selected */}
      {calculations.selectedReports.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {calculations.selectedReports.length} report{calculations.selectedReports.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Subtotal: </span>
                        <span className="font-medium">{formatCurrency(calculations.subtotal)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Markup ({markupPercentage}%): </span>
                        <span className="font-medium">{formatCurrency(calculations.markupAmount)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total: </span>
                        <span className="font-bold text-lg">{formatCurrency(calculations.total)}</span>
                      </div>
                    </div>
                  </div>
                  
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
                          <p className="text-amber-600 text-sm">This action cannot be undone. The selected reports will be marked as billed.</p>
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
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Spacer to prevent content from being hidden behind fixed footer */}
      {calculations.selectedReports.length > 0 && (
        <div className="h-24" />
      )}
    </div>
  );
}