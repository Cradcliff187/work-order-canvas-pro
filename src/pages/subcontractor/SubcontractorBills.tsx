import { useState, useMemo } from "react";
import { useSubcontractorBills } from "@/hooks/useSubcontractorBills";
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

const SubcontractorBills = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const [paymentFilter, setPaymentFilter] = useState<string | undefined>(() => searchParams.get('payment') || undefined);
  
  const [statusFilter, setStatusFilter] = useState(initialStatus || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Memoize filters to prevent unnecessary re-fetches
  const filters = useMemo(() => ({
    status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
    paymentStatus: paymentFilter as 'paid' | 'unpaid' | undefined,
    search: searchQuery || undefined,
    page,
    limit: 20,
  }), [statusFilter, paymentFilter, searchQuery, page]);

  const { data: billsData, isLoading, error, refetch } = useSubcontractorBills(filters);
  const bills = billsData?.data || [];
  const totalCount = billsData?.count || 0;

  const hasFilters = statusFilter !== "all" || searchQuery || paymentFilter;


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
          <h1 className="text-3xl font-bold">Bills</h1>
          <Link to="/subcontractor/submit-bill">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Bill
            </Button>
          </Link>
        </div>
        <QueryError 
          error={error as Error}
          onRetry={refetch}
          title="Failed to load bills"
        />
      </div>
    );
  }

  return (
    <QueryErrorBoundary onRetry={refetch}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Bills</h1>
          <Link to="/subcontractor/submit-bill">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Bill
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
                  placeholder="Search bills..."
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

      {/* Bills List */}
      <div className="space-y-4">
        {bills.length === 0 ? (
          <EmptyState
            icon={hasFilters ? Filter : FileText}
            title={hasFilters ? "No results match your criteria" : "No bills found"}
            description={hasFilters 
              ? "Try adjusting your filters to see more results."
              : "You haven't created any bills yet. Get started by creating your first bill."
            }
            action={hasFilters ? {
              label: "Clear Filters",
              onClick: () => {
                setStatusFilter("all");
                setSearchQuery("");
              },
              icon: Filter
            } : {
              label: "Create Your First Bill",
              onClick: () => window.location.href = '/subcontractor/submit-bill',
              icon: Plus
            }}
          />
        ) : (
          bills.map((bill) => (
            <Card key={bill.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">{bill.internal_bill_number}</h4>
                      {bill.external_bill_number && (
                        <span className="text-sm text-muted-foreground">
                          ({bill.external_bill_number})
                        </span>
                      )}
                      {(bill.subcontractor_bill_attachments?.length || 0) > 0 && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Paperclip className="h-4 w-4" />
                          <span className="text-xs">{bill.subcontractor_bill_attachments?.length}</span>
                        </div>
                      )}
                      <FinancialStatusBadge 
                        status={bill.status === 'submitted' ? 'pending' : bill.status} 
                        size="sm"
                        showIcon 
                      />
                      {bill.status === 'approved' && !bill.paid_at && (
                        <Badge variant="outline">Awaiting Payment</Badge>
                      )}
                    </div>
                    
                    <div className="text-lg font-semibold">
                      ${(bill.total_amount || 0).toLocaleString()}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {bill.submitted_at && (
                        <p>Submitted: {format(new Date(bill.submitted_at), "MMM d, yyyy")}</p>
                      )}
                      {bill.approved_at && (
                        <p>Approved: {format(new Date(bill.approved_at), "MMM d, yyyy")}</p>
                      )}
                      {bill.paid_at && (
                        <p>Paid: {format(new Date(bill.paid_at), "MMM d, yyyy")}</p>
                      )}
                      {bill.payment_reference && (
                        <p>Payment Ref: {bill.payment_reference}</p>
                      )}
                    </div>

                    {/* Work Orders */}
                    {bill.subcontractor_bill_work_orders && bill.subcontractor_bill_work_orders.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Work Orders: </span>
                        {bill.subcontractor_bill_work_orders.map((sbwo, index) => (
                          <span key={sbwo.id}>
                            {sbwo.work_orders?.work_order_number || `WO-${sbwo.work_order_id.slice(0, 8)}`}
                            {index < bill.subcontractor_bill_work_orders.length - 1 && ", "}
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
          getRowModel: () => ({ rows: bills })
        } as any}
        totalCount={totalCount}
        itemName="bills"
        isMobile={false}
      />
    </div>
    </QueryErrorBoundary>
  );
};

export default SubcontractorBills;
