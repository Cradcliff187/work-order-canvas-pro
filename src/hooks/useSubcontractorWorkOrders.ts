import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useSubcontractorWorkOrders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get assigned work orders for the subcontractor
  const assignedWorkOrders = useQuery({
    queryKey: ["subcontractor-work-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          *,
          trades (name),
          organizations!organization_id (name),
          work_order_reports (
            id,
            status,
            submitted_at,
            invoice_amount
          )
        `)
        .eq("assigned_to_type", "subcontractor")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Get dashboard statistics
  const dashboardStats = useQuery({
    queryKey: ["subcontractor-dashboard", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get all assigned work orders
      const { data: workOrders, error: workOrdersError } = await supabase
        .from("work_orders")
        .select(`
          *,
          work_order_reports (
            id,
            status,
            submitted_at,
            invoice_amount
          )
        `)
        .eq("assigned_to_type", "subcontractor");

      if (workOrdersError) throw workOrdersError;

      // Get current month's reports
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyReports, error: reportsError } = await supabase
        .from("work_order_reports")
        .select("*")
        .gte("submitted_at", startOfMonth.toISOString());

      if (reportsError) throw reportsError;

      const activeAssignments = workOrders?.filter(wo => 
        wo.status === "assigned" || wo.status === "in_progress"
      ).length || 0;

      const pendingReports = workOrders?.filter(wo => 
        wo.status === "in_progress" && 
        !wo.work_order_reports?.some(report => report.status !== "rejected")
      ).length || 0;

      const completedThisMonth = monthlyReports?.filter(report => 
        report.status === "approved"
      ).length || 0;

      const earningsThisMonth = monthlyReports
        ?.filter(report => report.status === "approved")
        ?.reduce((sum, report) => sum + (Number(report.invoice_amount) || 0), 0) || 0;

      return {
        activeAssignments,
        pendingReports,
        completedThisMonth,
        earningsThisMonth,
      };
    },
    enabled: !!user,
  });

  // Get work order by ID
  const getWorkOrder = (id: string) => {
    return useQuery({
      queryKey: ["work-order", id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("work_orders")
          .select(`
            *,
            trades (name, description),
            organizations!organization_id (name, contact_email, contact_phone),
            profiles!created_by (first_name, last_name, email),
            work_order_reports (
              *,
              profiles!subcontractor_user_id (first_name, last_name)
            )
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        return data;
      },
      enabled: !!id,
    });
  };

  // Get reports for the subcontractor
  const reports = useQuery({
    queryKey: ["subcontractor-reports", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("work_order_reports")
        .select(`
          *,
          work_orders (
            work_order_number,
            title,
            store_location
          )
        `)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Submit work report
  const submitReport = useMutation({
    mutationFn: async (reportData: {
      workOrderId: string;
      workPerformed: string;
      materialsUsed?: string;
      hoursWorked?: number;
      invoiceAmount: number;
      invoiceNumber?: string;
      notes?: string;
      photos?: File[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Get current user profile to get the profile ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Submit the report
      const { data: report, error: reportError } = await supabase
        .from("work_order_reports")
        .insert({
          work_order_id: reportData.workOrderId,
          subcontractor_user_id: profile.id,
          work_performed: reportData.workPerformed,
          materials_used: reportData.materialsUsed,
          hours_worked: reportData.hoursWorked,
          invoice_amount: reportData.invoiceAmount,
          invoice_number: reportData.invoiceNumber,
          notes: reportData.notes,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Upload photos if provided
      if (reportData.photos && reportData.photos.length > 0) {
        const uploadPromises = reportData.photos.map(async (photo, index) => {
          const fileName = `${user.id}/${report.id}/${Date.now()}_${index}_${photo.name}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("work-order-attachments")
            .upload(fileName, photo);

          if (uploadError) throw uploadError;

          // Create attachment record
          const { error: attachmentError } = await supabase
            .from("work_order_attachments")
            .insert({
              work_order_report_id: report.id,
              file_name: photo.name,
              file_url: uploadData.path,
              file_type: "photo",
              file_size: photo.size,
              uploaded_by_user_id: profile.id,
            });

          if (attachmentError) throw attachmentError;
        });

        await Promise.all(uploadPromises);
      }

      // Update work order status if needed
      await supabase
        .from("work_orders")
        .update({ 
          status: "completed",
          subcontractor_report_submitted: true,
          date_completed: new Date().toISOString()
        })
        .eq("id", reportData.workOrderId);

      return report;
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Your work report has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["subcontractor-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["subcontractor-reports"] });
      queryClient.invalidateQueries({ queryKey: ["subcontractor-dashboard"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
      console.error("Report submission error:", error);
    },
  });

  return {
    assignedWorkOrders,
    dashboardStats,
    reports,
    getWorkOrder,
    submitReport,
  };
}

// Image compression utility
export function compressImage(file: File, maxSizeMB = 1): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      const maxWidth = 1920;
      const maxHeight = 1080;
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        0.8
      );
    };

    img.src = URL.createObjectURL(file);
  });
}