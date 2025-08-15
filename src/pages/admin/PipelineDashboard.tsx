import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useWorkOrderLifecycle } from '@/hooks/useWorkOrderLifecyclePipeline';
import { formatDate } from '@/lib/utils/date';
import { formatCurrency } from '@/utils/formatting';
import { 
  ClipboardList, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Clock,
  AlertCircle,
  TrendingUp,
  Package,
  CreditCard,
  Receipt
} from 'lucide-react';

export default function PipelineDashboard() {
  const navigate = useNavigate();
  const { data: pipelineData, isLoading, error } = useWorkOrderLifecycle();
  
  // Comprehensive filters
  const [filters, setFilters] = useState({
    search: '',
    operationalStatus: [] as string[],
    reportStatus: [] as string[],
    invoiceStatus: [] as string[],
    billingStatus: [] as string[],
    partnerId: '',
    subcontractorId: '',
    showOnlyActionable: false
  });

  // Calculate pipeline metrics
  const metrics = useMemo(() => {
    if (!pipelineData) return null;
    
    const data = pipelineData;
    return {
      // Operational metrics
      newOrders: data.filter(d => d.status === 'received').length,
      estimatesNeeded: data.filter(d => d.status === 'estimate_needed').length,
      inProgress: data.filter(d => d.status === 'in_progress').length,
      
      // Financial metrics
      awaitingReports: data.filter(d => d.status === 'completed' && !d.report_status).length,
      awaitingInvoices: data.filter(d => d.report_status === 'approved' && !d.invoice_status).length,
      readyToBill: data.filter(d => d.invoice_status === 'approved' && !d.partner_bill_status).length,
      
      // Totals
      totalPending: data.filter(d => d.invoice_status === 'submitted').reduce((sum, d) => sum + (d.subcontractor_invoice_amount || 0), 0),
      totalReadyToBill: data.filter(d => d.invoice_status === 'approved' && !d.partner_bill_status).reduce((sum, d) => sum + (d.subcontractor_invoice_amount || 0), 0)
    };
  }, [pipelineData]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!pipelineData) return [];
    
    let filtered = [...pipelineData];
    
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.work_order_number?.toLowerCase().includes(search) ||
        item.title?.toLowerCase().includes(search) ||
        item.store_location?.toLowerCase().includes(search)
      );
    }
    
    // Status filters
    if (filters.operationalStatus.length > 0) {
      filtered = filtered.filter(item => filters.operationalStatus.includes(item.status));
    }
    
    if (filters.showOnlyActionable) {
      filtered = filtered.filter(item => 
        item.status === 'received' ||
        item.status === 'estimate_needed' ||
        (item.status === 'completed' && !item.report_status) ||
        (item.report_status === 'approved' && !item.invoice_status) ||
        (item.invoice_status === 'approved' && !item.partner_bill_status)
      );
    }
    
    return filtered;
  }, [pipelineData, filters]);

  // Get status badge for each pipeline stage
  const getOperationalBadge = (item: any) => {
    if (item.status === 'estimate_needed' && !item.subcontractor_estimate_amount) {
      return <Badge variant="warning">Awaiting SC Estimate</Badge>;
    }
    if (item.status === 'estimate_needed' && item.subcontractor_estimate_amount && !item.internal_estimate_amount) {
      return <Badge variant="warning">Needs Internal Markup</Badge>;
    }
    if (item.status === 'estimate_needed' && item.internal_estimate_amount && !item.partner_estimate_approved) {
      return <Badge variant="warning">Awaiting Partner Approval</Badge>;
    }
    return <WorkOrderStatusBadge status={item.status} />;
  };

  const getReportStatusBadge = (item: any) => {
    if (!item.report_status) {
      return <Badge variant="outline">-</Badge>;
    }
    
    switch (item.report_status) {
      case 'submitted':
        return <Badge variant="warning">Submitted</Badge>;
      case 'reviewed':
        return <Badge variant="warning">Reviewed</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{item.report_status}</Badge>;
    }
  };

  const getInvoiceStatusBadge = (item: any) => {
    if (!item.invoice_status) {
      return <Badge variant="outline">-</Badge>;
    }
    
    switch (item.invoice_status) {
      case 'submitted':
        return <Badge variant="warning">Submitted</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{item.invoice_status}</Badge>;
    }
  };

  const getFinancialBadge = (item: any) => {
    // Not ready for billing
    if (item.status !== 'completed') {
      return <Badge variant="outline">Not Started</Badge>;
    }
    
    // Report stage
    if (!item.report_status) {
      return <Badge variant="destructive">Report Missing</Badge>;
    }
    if (item.report_status === 'submitted' || item.report_status === 'reviewed') {
      return <Badge variant="warning">Report Pending</Badge>;
    }
    if (item.report_status === 'rejected') {
      return <Badge variant="destructive">Report Rejected</Badge>;
    }
    
    // Invoice stage
    if (!item.invoice_status) {
      return <Badge variant="warning">Invoice Needed</Badge>;
    }
    if (item.invoice_status === 'submitted') {
      return <Badge variant="warning">Invoice Pending</Badge>;
    }
    if (item.invoice_status === 'rejected') {
      return <Badge variant="destructive">Invoice Rejected</Badge>;
    }
    
    // Billing stage
    if (item.invoice_status === 'approved' && !item.partner_bill_status) {
      return <Badge variant="success">Ready to Bill</Badge>;
    }
    if (item.partner_bill_status === 'billed') {
      return <Badge variant="success">Billed</Badge>;
    }
    if (item.partner_bill_status === 'paid') {
      return <Badge variant="success">Paid</Badge>;
    }
    
    return <Badge variant="outline">Unknown</Badge>;
  };

  if (isLoading) return <TableSkeleton />;
  
  if (error) {
    return <EmptyState icon={AlertCircle} title="Error loading pipeline" description="Please try again" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pipeline Dashboard</h1>
        <p className="text-muted-foreground">Complete work order lifecycle tracking</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Orders</p>
                <p className="text-2xl font-bold">{metrics?.newOrders || 0}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimates Needed</p>
                <p className="text-2xl font-bold">{metrics?.estimatesNeeded || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready to Bill</p>
                <p className="text-2xl font-bold">{metrics?.readyToBill || 0}</p>
              </div>
              <CreditCard className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Ready</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics?.totalReadyToBill || 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <AdminFilterBar 
        title="Pipeline Filters"
        filterCount={Object.values(filters).filter(v => 
          Array.isArray(v) ? v.length > 0 : 
          typeof v === 'string' ? v !== '' : 
          typeof v === 'boolean' ? v === true : 
          false
        ).length}
        onClear={() => setFilters({
          search: '',
          operationalStatus: [],
          reportStatus: [],
          invoiceStatus: [],
          billingStatus: [],
          partnerId: '',
          subcontractorId: '',
          showOnlyActionable: false
        })}
      >
        <Input
          placeholder="Search work orders..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="w-full md:w-64"
        />
        
        <MultiSelectFilter
          options={[
            { value: 'received', label: 'New' },
            { value: 'assigned', label: 'Assigned' },
            { value: 'estimate_needed', label: 'Estimate Needed' },
            { value: 'estimate_approved', label: 'Estimate Approved' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' }
          ]}
          selectedValues={filters.operationalStatus}
          onSelectionChange={(values) => setFilters(prev => ({ ...prev, operationalStatus: values }))}
          placeholder="All statuses"
        />
        
        <Button
          variant={filters.showOnlyActionable ? "default" : "outline"}
          size="sm"
          onClick={() => setFilters(prev => ({ ...prev, showOnlyActionable: !prev.showOnlyActionable }))}
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Action Required
        </Button>
      </AdminFilterBar>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Work Order Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Order</TableHead>
                  <TableHead>Partner / Location</TableHead>
                  <TableHead>Operational Status</TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead>SC Invoice</TableHead>
                  <TableHead>Partner Billing</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow 
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/work-orders/${item.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.work_order_number}</p>
                        <p className="text-sm text-muted-foreground">{item.title}</p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <p className="text-sm">{item.partner_organization_name}</p>
                        <p className="text-xs text-muted-foreground">{item.store_location}</p>
                      </div>
                    </TableCell>
                    
                    <TableCell>{getOperationalBadge(item)}</TableCell>
                    
                    <TableCell>{getReportStatusBadge(item)}</TableCell>
                    
                    <TableCell>{getInvoiceStatusBadge(item)}</TableCell>
                    
                    <TableCell>{getFinancialBadge(item)}</TableCell>
                    
                    <TableCell>
                      <p className="text-sm text-muted-foreground">
                        {item.age_days}d
                      </p>
                    </TableCell>
                    
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/work-orders/${item.id}`);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableWrapper>
          
          {filteredData.length === 0 && (
            <EmptyState
              icon={ClipboardList}
              title="No work orders found"
              description="Adjust your filters or create a new work order"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}