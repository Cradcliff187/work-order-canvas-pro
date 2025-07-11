import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubcontractorWorkOrders } from "@/hooks/useSubcontractorWorkOrders";
import { Search, FileText, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileWorkOrderCard } from "@/components/MobileWorkOrderCard";
import { MobilePullToRefresh } from "@/components/MobilePullToRefresh";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SubcontractorWorkOrders() {
  const { assignedWorkOrders } = useSubcontractorWorkOrders();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleRefresh = async () => {
    await assignedWorkOrders.refetch();
  };

  const handleWorkOrderTap = (workOrder: any) => {
    navigate(`/subcontractor/work-orders/${workOrder.id}`);
  };

  const workOrders = assignedWorkOrders.data || [];

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch = 
      wo.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.store_location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

  const hasUnsubmittedReport = (workOrder: any) => {
    return workOrder.status === "in_progress" && 
           !workOrder.work_order_reports?.some((report: any) => 
             report.status !== "rejected"
           );
  };

  if (assignedWorkOrders.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">My Work Orders</h1>
      </div>

      {/* Filters - Always visible */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search work orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Work Orders List */}
      <div className={isMobile ? "space-y-4" : "grid gap-4"}>
        {filteredWorkOrders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {searchTerm || statusFilter !== "all" 
                ? "No work orders match your search criteria."
                : "No work orders assigned to you yet."
              }
            </CardContent>
          </Card>
        ) : (
          filteredWorkOrders.map((workOrder) => 
            isMobile ? (
              <MobileWorkOrderCard
                key={workOrder.id}
                workOrder={workOrder}
                onTap={handleWorkOrderTap}
                showActions={true}
              />
            ) : (
              <Card key={workOrder.id} className={hasUnsubmittedReport(workOrder) ? "border-orange-200 bg-orange-50" : ""}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">
                          {workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`}
                        </h3>
                        <Badge className={getStatusColor(workOrder.status)}>
                          {formatStatus(workOrder.status)}
                        </Badge>
                        {hasUnsubmittedReport(workOrder) && (
                          <Badge variant="destructive">Report Due</Badge>
                        )}
                      </div>

                      <h4 className="font-medium text-foreground">{workOrder.title}</h4>

                      {workOrder.store_location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{workOrder.store_location}</span>
                          {workOrder.street_address && (
                            <span>• {workOrder.street_address}</span>
                          )}
                        </div>
                      )}

                      {workOrder.trades && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Trade:</span> {workOrder.trades.name}
                        </div>
                      )}

                      {workOrder.due_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {format(new Date(workOrder.due_date), "MMM d, yyyy")}</span>
                        </div>
                      )}

                      {workOrder.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {workOrder.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end">
                      <Link to={`/subcontractor/work-orders/${workOrder.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {(workOrder.status === "assigned" || workOrder.status === "in_progress") && (
                        <Link to={`/subcontractor/reports/new/${workOrder.id}`}>
                          <Button size="sm" className="w-full sm:w-auto">
                            <FileText className="h-4 w-4 mr-2" />
                            Submit Report
                          </Button>
                        </Link>
                      )}
                      {workOrder.status === 'completed' && (
                        <Link to="/subcontractor/submit-invoice">
                          <Button size="sm" variant="secondary" className="w-full sm:w-auto">
                            <FileText className="h-4 w-4 mr-2" />
                            Submit Invoice
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )
        )}
      </div>
    </div>
  );

  return isMobile ? (
    <MobilePullToRefresh onRefresh={handleRefresh}>
      {content}
    </MobilePullToRefresh>
  ) : (
    content
  );
}