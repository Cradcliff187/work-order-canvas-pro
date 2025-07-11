
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubcontractorWorkOrders } from "@/hooks/useSubcontractorWorkOrders";
import { ArrowLeft, FileText, MapPin, Phone, Mail, Clock, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";

export default function SubcontractorWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { getWorkOrder } = useSubcontractorWorkOrders();
  
  // Validate ID parameter
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/subcontractor/work-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Invalid work order ID provided.
          </CardContent>
        </Card>
      </div>
    );
  }

  const workOrderQuery = getWorkOrder(id);

  if (workOrderQuery.isLoading) {
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

  if (workOrderQuery.error || !workOrderQuery.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/subcontractor/work-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Work order not found or you don't have access to view it.
          </CardContent>
        </Card>
      </div>
    );
  }

  const workOrder = workOrderQuery.data;

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

  const canSubmitReport = workOrder.status === "assigned" || workOrder.status === "in_progress";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <Link to="/subcontractor/work-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`}
            </h1>
            <p className="text-muted-foreground">{workOrder.title}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(workOrder.status)}>
            {formatStatus(workOrder.status)}
          </Badge>
          {canSubmitReport && (
            <Link to={`/subcontractor/reports/new/${workOrder.id}`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Submit Report
              </Button>
            </Link>
          )}
          {workOrder.status === 'completed' && (
            <Link to="/subcontractor/submit-invoice">
              <Button variant="secondary">
                <FileText className="h-4 w-4 mr-2" />
                Submit Invoice
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Work Order Information */}
        <Card>
          <CardHeader>
            <CardTitle>Work Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
              <p className="text-sm">{workOrder.description || "No description provided"}</p>
            </div>

            {workOrder.trades && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Trade</h4>
                <p className="text-sm">{workOrder.trades.name}</p>
                {workOrder.trades.description && (
                  <p className="text-xs text-muted-foreground mt-1">{workOrder.trades.description}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Submitted</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(workOrder.date_submitted), "MMM d, yyyy")}
                </div>
              </div>
              
              {workOrder.due_date && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Due Date</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    {format(new Date(workOrder.due_date), "MMM d, yyyy")}
                  </div>
                </div>
              )}
            </div>

            {workOrder.estimated_hours && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Estimated Hours</h4>
                <p className="text-sm">{workOrder.estimated_hours} hours</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle>Location Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workOrder.store_location && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Store/Location</h4>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  {workOrder.store_location}
                </div>
              </div>
            )}

            {(workOrder.street_address || workOrder.city || workOrder.state || workOrder.zip_code) && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Address</h4>
                <div className="text-sm">
                  {workOrder.street_address && <div>{workOrder.street_address}</div>}
                  {(workOrder.city || workOrder.state || workOrder.zip_code) && (
                    <div>
                      {workOrder.city && `${workOrder.city}, `}
                      {workOrder.state} {workOrder.zip_code}
                    </div>
                  )}
                </div>
              </div>
            )}

            {workOrder.organizations && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Organization</h4>
                <p className="text-sm">{workOrder.organizations.name}</p>
                
                {workOrder.organizations.contact_email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${workOrder.organizations.contact_email}`} 
                       className="hover:text-foreground">
                      {workOrder.organizations.contact_email}
                    </a>
                  </div>
                )}
                
                {workOrder.organizations.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${workOrder.organizations.contact_phone}`} 
                       className="hover:text-foreground">
                      {workOrder.organizations.contact_phone}
                    </a>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partner References */}
        {(workOrder.partner_po_number || workOrder.partner_location_number) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Partner References</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                {workOrder.partner_po_number && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">PO Number</h4>
                    <p className="text-sm">{workOrder.partner_po_number}</p>
                  </div>
                )}
                {workOrder.partner_location_number && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Location Number</h4>
                    <p className="text-sm">{workOrder.partner_location_number}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Previous Reports */}
        {workOrder.work_order_reports && workOrder.work_order_reports.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Previous Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workOrder.work_order_reports.map((report: any) => (
                  <div key={report.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          Report by {report.profiles?.first_name} {report.profiles?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Submitted {format(new Date(report.submitted_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <Badge 
                        className={
                          report.status === "approved" ? "bg-green-100 text-green-800 border-green-200" :
                          report.status === "rejected" ? "bg-red-100 text-red-800 border-red-200" :
                          "bg-yellow-100 text-yellow-800 border-yellow-200"
                        }
                      >
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm">{report.work_performed}</p>
                    
                    {report.review_notes && (
                      <div className="bg-muted p-3 rounded">
                        <p className="text-sm font-medium">Admin Notes:</p>
                        <p className="text-sm text-muted-foreground">{report.review_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
