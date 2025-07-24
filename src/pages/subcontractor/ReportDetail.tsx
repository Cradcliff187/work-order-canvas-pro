import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, DollarSign, Clock, FileText, Printer } from "lucide-react";
import { ReportFileManager } from '@/components/ReportFileManager';
import { format } from "date-fns";

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();

  // Validate ID format and prevent literal ":id" from being used
  const isValidId = id && id !== ':id' && id.length > 8;

  const reportQuery = useQuery({
    queryKey: ["report-detail", id],
    queryFn: async () => {
      if (!id || !isValidId) throw new Error("Invalid report ID");
      
      console.log('[ReportDetail] Querying with ID:', id);
      
      const { data, error } = await supabase
        .from("work_order_reports")
        .select(`
          *,
          work_orders (
            work_order_number,
            title,
            store_location,
            street_address,
            city,
            state,
            zip_code,
            trades (name),
            organizations!organization_id (name)
          ),
          work_order_attachments (
            id,
            file_name,
            file_url,
            file_type,
            uploaded_at
          ),
          profiles!reviewed_by_user_id (
            first_name,
            last_name
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && isValidId,
  });

  const handlePrint = () => {
    window.print();
  };

  if (reportQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!isValidId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/subcontractor/reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Invalid report ID. Please select a report from the list.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (reportQuery.error || !reportQuery.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/subcontractor/reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Report not found or you don't have access to view it.
            {reportQuery.error && (
              <p className="text-sm text-red-600 mt-2">
                Error: {reportQuery.error.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const report = reportQuery.data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "reviewed":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header - Hidden in print */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link to="/subcontractor/reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Work Report Details</h1>
            <p className="text-muted-foreground">
              {report.work_orders?.work_order_number || `WO-${report.work_order_id.slice(0, 8)}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(report.status)}>
            {formatStatus(report.status)}
          </Badge>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Print Header - Only visible in print */}
      <div className="hidden print:block print:mb-6">
        <h1 className="text-xl font-bold">Work Report</h1>
        <p className="text-muted-foreground">
          {report.work_orders?.work_order_number || `WO-${report.work_order_id.slice(0, 8)}`} - {report.work_orders?.title}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-1">
        {/* Work Order Information */}
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="print:pb-2">
            <CardTitle>Work Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Work Order</h4>
              <p className="text-sm font-medium">
                {report.work_orders?.work_order_number || `WO-${report.work_order_id.slice(0, 8)}`}
              </p>
              <p className="text-sm">{report.work_orders?.title}</p>
            </div>

            {report.work_orders?.store_location && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Location</h4>
                <p className="text-sm">{report.work_orders.store_location}</p>
                {(report.work_orders.street_address || report.work_orders.city) && (
                  <div className="text-sm text-muted-foreground">
                    {report.work_orders.street_address && <div>{report.work_orders.street_address}</div>}
                    {(report.work_orders.city || report.work_orders.state || report.work_orders.zip_code) && (
                      <div>
                        {report.work_orders.city && `${report.work_orders.city}, `}
                        {report.work_orders.state} {report.work_orders.zip_code}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {report.work_orders?.trades && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Trade</h4>
                <p className="text-sm">{report.work_orders.trades.name}</p>
              </div>
            )}

            {report.work_orders?.organizations && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Organization</h4>
                <p className="text-sm">{report.work_orders.organizations.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Details */}
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="print:pb-2">
            <CardTitle>Report Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Submitted</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 print:hidden" />
                  {format(new Date(report.submitted_at), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Status</h4>
                <Badge className={`${getStatusColor(report.status)} print:bg-transparent print:text-black print:border-black`}>
                  {formatStatus(report.status)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {report.hours_worked && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Hours Worked</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 print:hidden" />
                    {report.hours_worked} hours
                  </div>
                </div>
              )}
              
            </div>

            {(report.reviewed_at && report.profiles) && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Reviewed By</h4>
                <p className="text-sm">
                  {report.profiles.first_name} {report.profiles.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(report.reviewed_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Performed */}
        <Card className="lg:col-span-2 print:shadow-none print:border-0">
          <CardHeader className="print:pb-2">
            <CardTitle>Work Performed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{report.work_performed}</p>
          </CardContent>
        </Card>

        {/* Materials Used */}
        {report.materials_used && (
          <Card className="lg:col-span-2 print:shadow-none print:border-0">
            <CardHeader className="print:pb-2">
              <CardTitle>Materials Used</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{report.materials_used}</p>
            </CardContent>
          </Card>
        )}

        {/* Additional Notes */}
        {report.notes && (
          <Card className="lg:col-span-2 print:shadow-none print:border-0">
            <CardHeader className="print:pb-2">
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Admin Feedback */}
        {report.review_notes && (
          <Card className="lg:col-span-2 print:shadow-none print:border-0">
            <CardHeader className="print:pb-2">
              <CardTitle>Admin Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg print:bg-gray-100">
                <p className="text-sm whitespace-pre-wrap">{report.review_notes}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Attachments */}
        <Card className="lg:col-span-2 print:shadow-none print:border-0">
          <CardHeader className="print:pb-2">
            <CardTitle>Files & Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportFileManager
              reportId={report.id}
              workOrderId={report.work_order_id}
              existingAttachments={report.work_order_attachments || []}
              canUpload={false}
              canDelete={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
