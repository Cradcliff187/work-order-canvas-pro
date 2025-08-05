import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ReportStatusBadge } from '@/components/ui/status-badge';
import { 
  Search, 
  Eye, 
  FileText, 
  Calendar, 
  DollarSign, 
  ClipboardList,
  Filter,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ReportHistory() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch reports
  const { data: reportList = [], isLoading } = useQuery({
    queryKey: ['subcontractor-reports', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('work_order_reports')
        .select(`
          *,
          work_orders (
            work_order_number,
            title,
            store_location
          )
        `)
        .eq('subcontractor_user_id', profile.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
    staleTime: 30 * 1000,
  });

  const filteredReports = reportList.filter((report) => {
    const matchesSearch = 
      report.work_orders?.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.work_orders?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.work_orders?.store_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.work_performed?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const hasFilters = searchTerm || statusFilter !== "all";


  const getApprovedReports = () => {
    return reportList.filter(report => report.status === "approved").length;
  };

  if (isLoading) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Report History</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Reports</span>
            </div>
            <p className="text-2xl font-bold mt-2">{reportList.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-100 text-green-800 border-green-200 h-4 w-4 p-0" />
              <span className="text-sm font-medium">Approved</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {reportList.filter(r => r.status === "approved").length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 h-4 w-4 p-0" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {reportList.filter(r => r.status === "submitted" || r.status === "reviewed").length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold mt-2">{getApprovedReports()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
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
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      <div className="grid gap-4">
        {filteredReports.length === 0 ? (
          <EmptyState
            icon={hasFilters ? Filter : ClipboardList}
            title={hasFilters ? "No results match your criteria" : "No reports submitted yet"}
            description={hasFilters 
              ? "Try adjusting your filters or search terms to find what you're looking for."
              : "You haven't submitted any work reports yet. Complete work orders to start submitting reports."
            }
            action={hasFilters ? {
              label: "Clear Filters",
              onClick: () => {
                setSearchTerm("");
                setStatusFilter("all");
              },
              icon: Filter
            } : {
              label: "View Work Orders",
              onClick: () => window.location.href = '/subcontractor/work-orders',
              icon: Eye
            }}
          />
        ) : (
          filteredReports.map((report) => (
            <Card key={report.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">
                        {report.work_orders?.work_order_number || `WO-${report.work_order_id.slice(0, 8)}`}
                      </h3>
                      <ReportStatusBadge status={report.status} showIcon />
                    </div>

                    <h4 className="font-medium text-foreground">{report.work_orders?.title}</h4>

                    {report.work_orders?.store_location && (
                      <p className="text-sm text-muted-foreground">
                        Location: {report.work_orders.store_location}
                      </p>
                    )}

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {report.work_performed}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Submitted {format(new Date(report.submitted_at), "MMM d, yyyy")}</span>
                      </div>
                      {report.hours_worked && (
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          <span>{report.hours_worked}h worked</span>
                        </div>
                      )}
                    </div>

                    {report.review_notes && (
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-medium">Admin Feedback:</p>
                        <p className="text-sm text-muted-foreground">{report.review_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    <Link to={`/subcontractor/reports/${report.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
