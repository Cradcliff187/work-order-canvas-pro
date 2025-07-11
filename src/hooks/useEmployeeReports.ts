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
      
      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          *,
          trades (name),
          organizations!organization_id (name),
          employee_reports (
            id,
            report_date,
            hours_worked,
            total_labor_cost
          )
        `)
        .eq("assigned_to_type", "internal")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
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

  // Submit time report
  const submitTimeReport = useMutation({
    mutationFn: async (reportData: {
      workOrderId: string;
      reportDate: string;
      workPerformed: string;
      materialsUsed?: string;
      hoursWorked: number;
      notes?: string;
      receipts?: File[];
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
      const totalLaborCost = reportData.hoursWorked * hourlyRate;

      // Submit the time report
      const { data: report, error: reportError } = await supabase
        .from("employee_reports")
        .insert({
          work_order_id: reportData.workOrderId,
          employee_user_id: profile.id,
          report_date: reportData.reportDate,
          work_performed: reportData.workPerformed,
          hours_worked: reportData.hoursWorked,
          hourly_rate_snapshot: hourlyRate,
          total_labor_cost: totalLaborCost,
          notes: reportData.notes,
        })
        .select()
        .single();

      if (reportError) throw reportError;

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
    onSuccess: () => {
      toast({
        title: "Time Report Submitted",
        description: "Your time report has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["employee-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["employee-time-reports"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit time report. Please try again.",
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
    submitTimeReport,
  };
}