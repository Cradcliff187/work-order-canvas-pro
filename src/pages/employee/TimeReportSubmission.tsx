import { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEmployeeReports } from "@/hooks/useEmployeeReports";
import { TimeReportForm, type TimeReportFormData } from "@/components/employee/time-reports/TimeReportForm";
import { TimeReportErrorBoundary } from "@/components/employee/time-reports/TimeReportErrorBoundary";
import { ArrowLeft, Edit, AlertCircle } from "lucide-react";

export default function TimeReportSubmission() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { getWorkOrder, getExistingTimeReport, submitTimeReport, employeeProfile } = useEmployeeReports();
  const workOrderQuery = getWorkOrder(workOrderId!);
  const profileQuery = employeeProfile;
  
  const [editingReport, setEditingReport] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Check for existing report when date changes
  const existingReportQuery = getExistingTimeReport(
    workOrderId!,
    currentDate ? format(currentDate, "yyyy-MM-dd") : ""
  );

  const existingReport = existingReportQuery.data;
  const hourlyRate = profileQuery.data?.hourly_cost_rate || 0;

  const handleEditExisting = () => {
    if (existingReport) {
      setEditingReport(existingReport);
    }
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
  };

  const handleCancel = () => {
    navigate("/employee/time-reports");
  };

  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const onSubmit = async (data: TimeReportFormData & { receipts: File[] }) => {
    if (!workOrderId) return;

    try {
      await submitTimeReport.mutateAsync({
        workOrderId,
        reportDate: data.reportDate.toISOString().split('T')[0],
        workPerformed: data.workPerformed,
        materialsUsed: data.materialsUsed,
        hoursWorked: data.hoursWorked,
        notes: data.notes,
        receipts: data.receipts,
        existingReportId: editingReport?.id,
      });

      navigate("/employee/time-reports");
    } catch (error) {
      console.error("Error submitting time report:", error);
    }
  };

  if (workOrderQuery.isLoading || profileQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                  <div className="h-10 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (workOrderQuery.error || !workOrderQuery.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/employee/time-reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Work order not found or you don't have access to submit a time report for it.
          </CardContent>
        </Card>
      </div>
    );
  }

  const workOrder = workOrderQuery.data;

  return (
    <TimeReportErrorBoundary workOrderId={workOrderId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/employee/time-reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {editingReport ? "Edit Time Report" : "Submit Time Report"}
            </h1>
            <p className="text-muted-foreground">
              {workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`} - {workOrder.title}
            </p>
          </div>
        </div>

        {/* Work Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Work Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Location</h4>
                <p className="text-sm">{workOrder.store_location}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Trade</h4>
                <p className="text-sm">{workOrder.trades?.name}</p>
              </div>
              <div className="sm:col-span-2">
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{workOrder.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Report Alert */}
        {existingReport && !editingReport && currentDate && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between w-full">
              <span>
                A time report already exists for {format(currentDate, "PPP")}. 
                Hours: {existingReport.hours_worked}, Labor Cost: ${existingReport.total_labor_cost?.toFixed(2) || '0.00'}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEditExisting}
                className="ml-4"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Report
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Time Report Form */}
        <TimeReportForm
          workOrderId={workOrderId!}
          hourlyRate={hourlyRate}
          existingReport={existingReport}
          editingReport={editingReport}
          isSubmitting={submitTimeReport.isPending}
          onSubmit={onSubmit}
          onCancel={editingReport ? handleCancelEdit : handleCancel}
          onDateChange={handleDateChange}
        />
      </div>
    </TimeReportErrorBoundary>
  );
}
