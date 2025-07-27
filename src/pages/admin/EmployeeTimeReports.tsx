import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MobileTableCard } from "@/components/admin/shared/MobileTableCard";
import { TableSkeleton } from "@/components/admin/shared/TableSkeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEmployeeReports } from "@/hooks/useEmployeeReports";
import { Clock, Plus, FileText, Calendar } from "lucide-react";

export default function EmployeeTimeReports() {
  const { timeReports, assignedWorkOrders } = useEmployeeReports();
  const isMobile = useIsMobile();

  if (timeReports.isLoading || assignedWorkOrders.isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <Card>
          <CardContent className="p-6">
            <TableSkeleton rows={5} columns={6} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const reports = timeReports.data || [];
  const workOrders = assignedWorkOrders.data || [];
  const pendingReports = workOrders.filter(wo => 
    wo.status === "assigned" || wo.status === "in_progress"
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Time Reports</h1>
          <p className="text-muted-foreground">
            Track and submit time reports for your assigned work orders
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(report => {
                const reportMonth = new Date(report.report_date).getMonth();
                const currentMonth = new Date().getMonth();
                return reportMonth === currentMonth;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Time reports submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.reduce((sum, report) => sum + (report.hours_worked || 0), 0).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Hours logged this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReports.length}</div>
            <p className="text-xs text-muted-foreground">
              Work orders awaiting reports
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Work Orders */}
      {pendingReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Work Orders Awaiting Time Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingReports.map((workOrder) => (
                <div key={workOrder.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`}
                    </p>
                    <p className="text-sm text-muted-foreground">{workOrder.title}</p>
                    <p className="text-xs text-muted-foreground">{workOrder.store_location}</p>
                  </div>
                  <Link to={`/admin/time-reports/submit/${workOrder.id}`}>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Report
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Reports History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Reports History</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No time reports submitted yet.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block rounded-md border">
                <Table className="admin-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Work Order</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead className="text-right">Labor Cost</TableHead>
                      <TableHead>Work Performed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow 
                        key={report.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => window.location.href = `/admin/time-reports/submit/${report.work_order_id}`}
                      >
                        <TableCell>
                          {format(new Date(report.report_date), "PP")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium font-mono text-sm">
                              {report.work_orders?.work_order_number || `WO-${report.work_order_id.slice(0, 8)}`}
                            </p>
                            <p className="text-sm text-muted-foreground">{report.work_orders?.title}</p>
                          </div>
                        </TableCell>
                        <TableCell>{report.work_orders?.store_location}</TableCell>
                        <TableCell>{report.hours_worked} hrs</TableCell>
                        <TableCell className="text-right font-mono">${(report.total_labor_cost || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {report.work_performed}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="block lg:hidden space-y-3">
                {reports.map((report) => (
                  <MobileTableCard
                    key={report.id}
                    title={report.work_orders?.work_order_number || `WO-${report.work_order_id.slice(0, 8)}`}
                    subtitle={`${report.work_orders?.title} • ${report.work_orders?.store_location}`}
                    status={
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(report.report_date), "PP")}
                      </div>
                    }
                    onClick={() => window.location.href = `/admin/time-reports/submit/${report.work_order_id}`}
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hours:</span>
                      <span className="font-medium">{report.hours_worked} hrs</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Labor Cost:</span>
                      <span className="font-mono">${(report.total_labor_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Work: </span>
                      <span className="line-clamp-2">{report.work_performed}</span>
                    </div>
                  </MobileTableCard>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}