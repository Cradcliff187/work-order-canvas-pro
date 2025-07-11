import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubcontractorWorkOrders } from "@/hooks/useSubcontractorWorkOrders";
import { useInvoices } from "@/hooks/useInvoices";
import { 
  ClipboardList, 
  FileText, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  Receipt
} from "lucide-react";
import { format } from "date-fns";

const SubcontractorDashboard = () => {
  const { assignedWorkOrders, dashboardStats } = useSubcontractorWorkOrders();
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices();

  const workOrders = assignedWorkOrders.data || [];
  const stats = dashboardStats.data;
  const invoices = invoicesData?.data || [];
  
  // Get invoice status counts
  const pendingInvoices = invoices.filter(invoice => invoice.status === 'submitted');
  const approvedAwaitingPayment = invoices.filter(invoice => invoice.status === 'approved' && !invoice.paid_at);
  const paidInvoices = invoices.filter(invoice => invoice.paid_at);

  // Calculate total outstanding amount (pending + approved awaiting payment)
  const totalOutstanding = [...pendingInvoices, ...approvedAwaitingPayment]
    .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

  // Get recent payments (last 5 paid invoices)
  const recentPayments = paidInvoices
    .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())
    .slice(0, 5);

  // Get recent work orders (last 5)
  const recentWorkOrders = workOrders.slice(0, 5);

  // Get urgent items (reports due)
  const urgentItems = workOrders.filter(wo => 
    wo.status === "in_progress" && 
    !wo.work_order_reports?.some((report: any) => report.status !== "rejected")
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  if (assignedWorkOrders.isLoading || dashboardStats.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-8 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link to="/subcontractor/work-orders">
          <Button>
            <ClipboardList className="h-4 w-4 mr-2" />
            View All Work Orders
          </Button>
        </Link>
      </div>

      {/* Urgent Items Alert */}
      {urgentItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-800">
                  Reports Due ({urgentItems.length})
                </h3>
                <p className="text-sm text-orange-700">
                  You have work orders that need reports submitted.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Active Assignments</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.activeAssignments || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Assigned & In Progress
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Reports Pending</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.pendingReports || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Need to submit reports
            </p>
          </CardContent>
        </Card>

        <Link to="/subcontractor/invoices">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pending Invoices</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-warning">{pendingInvoices.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting approval
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Completed This Month</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.completedThisMonth || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Approved reports
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Earnings This Month</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              ${(stats?.earningsThisMonth || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              From approved reports
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Status Section */}
      {invoices.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Invoice Summary</CardTitle>
              <Link to="/subcontractor/invoices">
                <Button variant="outline" size="sm">
                  View All Invoices
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4 mb-6">
              <Link to="/subcontractor/invoices?status=submitted">
                <div className="text-center p-4 bg-warning/10 rounded-lg hover:bg-warning/20 transition-colors">
                  <div className="text-2xl font-bold text-warning">{pendingInvoices.length}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ${pendingInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0).toLocaleString()}
                  </div>
                </div>
              </Link>
              <Link to="/subcontractor/invoices?status=approved&payment=unpaid">
                <div className="text-center p-4 bg-success/10 rounded-lg hover:bg-success/20 transition-colors">
                  <div className="text-2xl font-bold text-success">{approvedAwaitingPayment.length}</div>
                  <div className="text-sm text-muted-foreground">Approved</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ${approvedAwaitingPayment.reduce((sum, inv) => sum + (inv.total_amount || 0), 0).toLocaleString()}
                  </div>
                </div>
              </Link>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">${totalOutstanding.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Outstanding</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Total amount due
                </div>
              </div>
              <Link to="/subcontractor/invoices?status=paid">
                <div className="text-center p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                  <div className="text-2xl font-bold">{paidInvoices.length}</div>
                  <div className="text-sm text-muted-foreground">Paid</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ${paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0).toLocaleString()}
                  </div>
                </div>
              </Link>
            </div>

            {/* Recent Payments */}
            {recentPayments.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Recent Payments</h4>
                <div className="space-y-2">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{payment.internal_invoice_number}</div>
                        <div className="text-sm text-muted-foreground">
                          Paid: {format(new Date(payment.paid_at!), "MMM d, yyyy")}
                        </div>
                        {payment.payment_reference && (
                          <div className="text-xs text-muted-foreground">
                            Ref: {payment.payment_reference}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${(payment.total_amount || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Work Orders */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Assignments</CardTitle>
            <Link to="/subcontractor/work-orders">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentWorkOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No work orders assigned yet.
            </p>
          ) : (
            <div className="space-y-4">
              {recentWorkOrders.map((workOrder) => (
                <div
                  key={workOrder.id}
                  className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">
                        {workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`}
                      </h4>
                      <Badge className={getStatusColor(workOrder.status)}>
                        {formatStatus(workOrder.status)}
                      </Badge>
                      {workOrder.status === "in_progress" && 
                       !workOrder.work_order_reports?.some((report: any) => report.status !== "rejected") && (
                        <Badge variant="destructive">Report Due</Badge>
                      )}
                    </div>
                    
                    <p className="font-medium text-foreground">{workOrder.title}</p>
                    
                    {workOrder.store_location && (
                      <p className="text-sm text-muted-foreground">
                        {workOrder.store_location}
                      </p>
                    )}
                    
                    {workOrder.due_date && (
                      <p className="text-sm text-muted-foreground">
                        Due: {format(new Date(workOrder.due_date), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Link to={`/subcontractor/work-orders/${workOrder.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    {(workOrder.status === "assigned" || workOrder.status === "in_progress") && (
                      <Link to={`/subcontractor/reports/new/${workOrder.id}`}>
                        <Button size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          Report
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubcontractorDashboard;