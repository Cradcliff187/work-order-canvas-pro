import { useState, useMemo } from "react";
import { useSubcontractorBills } from "@/hooks/useSubcontractorBills";
import { SubcontractorBillFiltersValue } from "@/types/subcontractor-bills";
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
import { StandardDashboardStats } from '@/components/dashboard/StandardDashboardStats';
import { StatCard } from '@/components/dashboard/StandardDashboardStats';
import { Plus, Search, DollarSign, Paperclip, FileText, Filter, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { Link, useSearchParams } from "react-router-dom";

const SubcontractorBills = () => {
  const [searchParams] = useSearchParams();
  
  const [filters, setFilters] = useState<SubcontractorBillFiltersValue>(() => ({
    search: "",
    status: [],
    subcontractor_organization_ids: [],
    date_range: {},
    overdue: false,
  }));
  const [page, setPage] = useState(1);

  // Memoize query filters to prevent unnecessary re-fetches
  const queryFilters = useMemo(() => ({
    ...filters,
    page,
    pageSize: 20,
  }), [filters, page]);

  const { data: billsData, isLoading, error, refetch } = useSubcontractorBills(queryFilters);
  const bills = billsData?.data || [];
  const totalCount = billsData?.count || 0;

  const hasFilters = filters.search || filters.status?.length || filters.subcontractor_organization_ids?.length || filters.date_range?.from || filters.date_range?.to || filters.overdue;

  const stats = useMemo(() => {
    if (!bills?.length) return [];
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalAmount = bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
    const pendingAmount = bills
      .filter(bill => bill.status === 'submitted')
      .reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
    const thisMonth = bills
      .filter(bill => new Date(bill.submitted_at || bill.created_at) >= monthStart).length;

    const statsCards: StatCard[] = [
      {
        icon: DollarSign,
        label: 'Total Amount',
        value: `$${totalAmount.toLocaleString()}`,
        variant: 'default'
      },
      {
        icon: Clock,
        label: 'Pending Amount',
        value: `$${pendingAmount.toLocaleString()}`,
        variant: pendingAmount > 0 ? 'warning' : 'success'
      },
      {
        icon: TrendingUp,
        label: 'This Month',
        value: thisMonth.toString(),
        variant: 'default'
      }
    ];

    return statsCards;
  }, [bills]);


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
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Bills</h1>
            <p className="text-muted-foreground">
              Manage your submitted bills and track payment status
            </p>
          </div>
          <Link to="/subcontractor/submit-bill">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Bill
            </Button>
          </Link>
        </header>
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
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Bills</h1>
            <p className="text-muted-foreground">
              Manage your submitted bills and track payment status
            </p>
          </div>
          <Link to="/subcontractor/submit-bill">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Bill
            </Button>
          </Link>
        </header>

        <StandardDashboardStats stats={stats} loading={isLoading} />

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search bills..."
                  value={filters.search || ""}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
                  className="pl-10"
                />
              </div>
            </div>
            <Select 
              value={filters.status?.length === 1 ? filters.status[0] : "all"} 
              onValueChange={(value) => setFilters({ 
                ...filters, 
                status: value === "all" ? [] : [value] 
              })}
            >
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
                setFilters({
                  search: "",
                  status: [],
                  subcontractor_organization_ids: [],
                  date_range: {},
                  overdue: false,
                });
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
            <Card 
              key={bill.id}
              className="transition-shadow duration-200 border-border cursor-pointer hover:shadow-md hover:border-primary/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // Handle navigation to bill details
                }
              }}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{bill.internal_bill_number}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {bill.external_bill_number ? `Invoice: ${bill.external_bill_number}` : 'No external invoice'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <FinancialStatusBadge 
                        status={bill.status === 'submitted' ? 'pending' : bill.status} 
                        size="sm"
                        showIcon 
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-medium text-lg text-foreground">
                          ${(bill.total_amount || 0).toLocaleString()}
                        </span>
                      </div>
                      {bill.workOrderCount && bill.workOrderCount > 0 && (
                        <div className="flex justify-between">
                          <span>Work Orders:</span>
                          <span className="font-medium">{bill.workOrderCount}</span>
                        </div>
                      )}
                      {bill.submitted_at && (
                        <div className="flex justify-between">
                          <span>Submitted:</span>
                          <span className="font-medium">{format(new Date(bill.submitted_at), "MMM d")}</span>
                        </div>
                      )}
                      {bill.approved_at && (
                        <div className="flex justify-between">
                          <span>Approved:</span>
                          <span className="font-medium">{format(new Date(bill.approved_at), "MMM d")}</span>
                        </div>
                      )}
                      {bill.paid_at && (
                        <div className="flex justify-between">
                          <span>Paid:</span>
                          <span className="font-medium">{format(new Date(bill.paid_at), "MMM d")}</span>
                        </div>
                      )}
                    </div>
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
