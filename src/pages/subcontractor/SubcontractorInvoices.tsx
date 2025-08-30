import { useState, useMemo } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingCard } from "@/components/ui/loading-states";
import { QueryError, QueryErrorBoundary } from "@/components/ui/query-error-boundary";
import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { TablePagination } from '@/components/admin/shared/TablePagination';
import { Plus, Search, DollarSign, Paperclip, FileText, Filter } from "lucide-react";
import { format } from "date-fns";
import { Link, useSearchParams } from "react-router-dom";

const SubcontractorInvoices = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const initialPayment = searchParams.get('payment');
  
  const [statusFilter, setStatusFilter] = useState(initialStatus || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Memoize filters to prevent unnecessary re-fetches
  const filters = useMemo(() => ({
    status: statusFilter && statusFilter !== "all" ? [statusFilter] : undefined,
    paymentStatus: initialPayment as 'paid' | 'unpaid' | undefined,
    search: searchQuery || undefined,
    page,
    limit: 20,
  }), [statusFilter, initialPayment, searchQuery, page]);

  const { data: invoicesData, isLoading, error, refetch } = useInvoices(filters);
  const invoices = invoicesData?.data || [];
  const totalCount = invoicesData?.totalCount || 0;

  const hasFilters = statusFilter !== "all" || searchQuery || initialPayment;


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="h-10 w-36 bg-muted rounded animate-pulse" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1 h-10 bg-muted rounded animate-pulse" />
              <div className="w-48 h-10 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <LoadingCard count={5} showHeader={false} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Invoices</h1>
          <Link to="/subcontractor/submit-invoice">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        </div>
        <QueryError 
          error={error as Error}
          onRetry={refetch}
          title="Failed to load invoices"
        />
      </div>
    );
  }

  return (
    <QueryErrorBoundary onRetry={refetch}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Invoices</h1>
          <Link to="/subcontractor/submit-invoice">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <div className="space-y-4">
        {invoices.length === 0 ? (
          <EmptyState
            icon={hasFilters ? Filter : FileText}
            title={hasFilters ? "No results match your criteria" : "No invoices found"}
            description={hasFilters 
              ? "Try adjusting your filters to see more results."
              : "You haven't created any invoices yet. Get started by creating your first invoice."
            }
            action={hasFilters ? {
              label: "Clear Filters",
              onClick: () => {
                setStatusFilter("all");
                setSearchQuery("");
              },
              icon: Filter
            } : {
              label: "Create Your First Invoice",
              onClick: () => window.location.href = '/subcontractor/submit-invoice',
              icon: Plus
            }}
          />
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">{invoice.internal_invoice_number}</h4>
                      {invoice.external_invoice_number && (
                        <span className="text-sm text-muted-foreground">
                          ({invoice.external_invoice_number})
                        </span>
                      )}
                      {(invoice.attachment_count || 0) > 0 && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Paperclip className="h-4 w-4" />
                          <span className="text-xs">{invoice.attachment_count}</span>
                        </div>
                      )}
                      <FinancialStatusBadge 
                        status={invoice.status === 'submitted' ? 'pending' : invoice.status} 
                        size="sm"
                        showIcon 
                      />
                      {invoice.status === 'approved' && !invoice.paid_at && (
                        <Badge variant="outline">Awaiting Payment</Badge>
                      )}
                    </div>
                    
                    <div className="text-lg font-semibold">
                      ${(invoice.total_amount || 0).toLocaleString()}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {invoice.submitted_at && (
                        <p>Submitted: {format(new Date(invoice.submitted_at), "MMM d, yyyy")}</p>
                      )}
                      {invoice.approved_at && (
                        <p>Approved: {format(new Date(invoice.approved_at), "MMM d, yyyy")}</p>
                      )}
                      {invoice.paid_at && (
                        <p>Paid: {format(new Date(invoice.paid_at), "MMM d, yyyy")}</p>
                      )}
                      {invoice.payment_reference && (
                        <p>Payment Ref: {invoice.payment_reference}</p>
                      )}
                    </div>

                    {/* Work Orders */}
                    {invoice.invoice_work_orders && invoice.invoice_work_orders.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Work Orders: </span>
                        {invoice.invoice_work_orders.map((iwo, index) => (
                          <span key={iwo.id}>
                            {iwo.work_order.work_order_number || `WO-${iwo.work_order.id.slice(0, 8)}`}
                            {index < invoice.invoice_work_orders.length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      <TablePagination 
        table={{
          getState: () => ({ 
            pagination: { 
              pageIndex: page - 1, 
              pageSize: 20 
            } 
          }),
          getPageCount: () => Math.ceil(totalCount / 20),
          getCanPreviousPage: () => page > 1,
          getCanNextPage: () => page * 20 < totalCount,
          previousPage: () => setPage(page - 1),
          nextPage: () => setPage(page + 1),
          setPageSize: (size: number) => console.log('Page size change not implemented'),
          getRowModel: () => ({ rows: invoices })
        } as any}
        totalCount={totalCount}
        itemName="invoices"
        isMobile={false}
      />
    </div>
    </QueryErrorBoundary>
  );
};

export default SubcontractorInvoices;
