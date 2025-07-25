import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useEmployeeReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get assigned work orders for the employee
  const assignedWorkOrders = useQuery({
    queryKey: ["employee-work-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get work orders assigned to this employee through work_order_assignments
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("work_order_assignments")
        .select(`
          work_order_id,
          work_orders!work_order_assignments_work_order_id_fkey (
            *,
            trades (name),
            organizations!work_orders_organization_id_fkey (name),
            employee_reports (
              id,
              report_date,
              hours_worked,
              total_labor_cost
            )
          )
        `)
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false });

      if (assignmentError) throw assignmentError;
      
      // Transform the data to extract work orders
      const data = assignmentData?.map(assignment => assignment.work_orders).filter(Boolean) || [];
      return data;
    },
    enabled: !!user,
  });

  // Get employee time reports
  const timeReports = useQuery({
    queryKey: ["employee-time-reports", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get current user profile to get the profile ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return [];

      const { data, error } = await supabase
        .from("employee_reports")
        .select(`
          *,
          work_orders (
            work_order_number,
            title,
            store_location
          )
        `)
        .eq("employee_user_id", profile.id)
        .order("report_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Get work order by ID with employee rate
  const getWorkOrder = (id: string) => {
    return useQuery({
      queryKey: ["employee-work-order", id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("work_orders")
          .select(`
            *,
            trades (name, description),
            organizations!organization_id (name, contact_email, contact_phone),
            profiles!created_by (first_name, last_name, email)
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        return data;
      },
      enabled: !!id,
    });
  };

  // Get employee profile with rates
  const employeeProfile = useQuery({
    queryKey: ["employee-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, hourly_cost_rate, hourly_billable_rate")
        .eq("user_id", user.id)
        .eq("is_employee", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get existing time report for a work order and date
  const getExistingTimeReport = (workOrderId: string, reportDate: string) => {
    return useQuery({
      queryKey: ["existing-time-report", workOrderId, reportDate],
      queryFn: async () => {
        if (!user || !workOrderId || !reportDate) return null;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!profile) return null;

        const { data, error } = await supabase
          .from("employee_reports")
          .select("*")
          .eq("employee_user_id", profile.id)
          .eq("work_order_id", workOrderId)
          .eq("report_date", reportDate)
          .maybeSingle();

        if (error) throw error;
        return data;
      },
      enabled: !!user && !!workOrderId && !!reportDate,
    });
  };

  // Submit or update time report
  const submitTimeReport = useMutation({
    mutationFn: async (reportData: {
      workOrderId: string;
      reportDate: string;
      workPerformed: string;
      materialsUsed?: string;
      hoursWorked: number;
      notes?: string;
      receipts?: File[];
      existingReportId?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Get current user profile to get the profile ID and rate
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, hourly_cost_rate")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const hourlyRate = profile.hourly_cost_rate || 0;

      let report;
      
      if (reportData.existingReportId) {
        // Update existing report
        // Note: total_labor_cost is a GENERATED column (hours_worked * hourly_rate_snapshot) and should never be included in INSERT/UPDATE
        const { data: updatedReport, error: updateError } = await supabase
          .from("employee_reports")
          .update({
            work_performed: reportData.workPerformed,
            hours_worked: reportData.hoursWorked,
            hourly_rate_snapshot: hourlyRate,
            notes: reportData.notes,
          })
          .eq("id", reportData.existingReportId)
          .select()
          .single();

        if (updateError) throw updateError;
        report = updatedReport;
      } else {
        // Create new report
        // Note: total_labor_cost is a GENERATED column (hours_worked * hourly_rate_snapshot) and should never be included in INSERT/UPDATE
        const { data: newReport, error: insertError } = await supabase
          .from("employee_reports")
          .insert({
            work_order_id: reportData.workOrderId,
            employee_user_id: profile.id,
            report_date: reportData.reportDate,
            work_performed: reportData.workPerformed,
            hours_worked: reportData.hoursWorked,
            hourly_rate_snapshot: hourlyRate,
            notes: reportData.notes,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        report = newReport;
      }

      // Upload receipts if provided
      if (reportData.receipts && reportData.receipts.length > 0) {
        const uploadPromises = reportData.receipts.map(async (receipt, index) => {
          const fileName = `${user.id}/${report.id}/${Date.now()}_${index}_${receipt.name}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("work-order-attachments")
            .upload(fileName, receipt);

          if (uploadError) throw uploadError;

          // Create attachment record
          const { error: attachmentError } = await supabase
            .from("work_order_attachments")
            .insert({
              work_order_id: reportData.workOrderId,
              file_name: receipt.name,
              file_url: uploadData.path,
              file_type: "document",
              file_size: receipt.size,
              uploaded_by_user_id: profile.id,
            });

          if (attachmentError) throw attachmentError;
        });

        await Promise.all(uploadPromises);
      }

      return report;
    },
    onSuccess: (data, variables) => {
      const isUpdate = !!variables.existingReportId;
      toast({
        title: isUpdate ? "Time Report Updated" : "Time Report Submitted",
        description: isUpdate 
          ? "Your time report has been updated successfully."
          : "Your time report has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["employee-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["employee-time-reports"] });
      queryClient.invalidateQueries({ queryKey: ["existing-time-report"] });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to submit time report. Please try again.";
      
      // Handle specific database errors
      if (error?.message?.includes("duplicate key value violates unique constraint")) {
        errorMessage = "A time report for this date already exists. Please edit the existing report or choose a different date.";
      } else if (error?.message?.includes("total_labor_cost")) {
        errorMessage = "There was an error calculating the labor cost. Please contact support.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Time report submission error:", error);
    },
  });

  return {
    assignedWorkOrders,
    timeReports,
    employeeProfile,
    getWorkOrder,
    getExistingTimeReport,
    submitTimeReport,
  };
}