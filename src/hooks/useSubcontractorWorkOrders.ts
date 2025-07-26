import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useSubcontractorWorkOrders() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Company-level access: RLS policies automatically filter to company work orders
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
          work_order_attachments(count),
          work_order_reports (
            id,
            status,
            submitted_at
          ),
          
          work_order_assignments (
            assigned_to,
            assignment_type,
            profiles!work_order_assignments_assigned_to_fkey (first_name, last_name),
            assigned_organization:organizations!assigned_organization_id(name, organization_type)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform data to include attachment count
      const transformedData = (data || []).map((wo: any) => ({
        ...wo,
        attachment_count: wo.work_order_attachments?.[0]?.count || 0
      }));
      
      return transformedData;
    },
    enabled: !!user,
  });

  // Company-wide dashboard stats: RLS policies provide company-level access
  const dashboardStats = useQuery({
    queryKey: ["subcontractor-dashboard", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get all company work orders (RLS automatically filters to company)
      const { data: workOrders, error: workOrdersError } = await supabase
        .from("work_orders")
        .select(`
          *,
          work_order_reports (
            id,
            status,
            submitted_at
          )
        `);

      if (workOrdersError) throw workOrdersError;

      // Get current month's reports (RLS automatically filters to company)
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

      const reportsThisMonth = monthlyReports
        ?.filter(report => report.status === "approved")
        ?.length || 0;

      return {
        activeAssignments,
        pendingReports,
        completedThisMonth,
        reportsThisMonth,
      };
    },
    enabled: !!user,
  });

  // Get work order by ID
  const getWorkOrder = (id: string) => {
    return useQuery({
      queryKey: ["work-order", id],
      queryFn: async () => {
        if (!id) throw new Error('Work order ID is required');
        
        // Validate UUID format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          throw new Error('Invalid work order ID format');
        }

        // First, get the work order data
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
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Work order not found');

        // Then get location contact information if available
        let locationContact = null;
        if (data.partner_location_number && data.organization_id) {
          const { data: locationData } = await supabase
            .from("partner_locations")
            .select("contact_name, contact_phone, contact_email")
            .eq("organization_id", data.organization_id)
            .eq("location_number", data.partner_location_number)
            .maybeSingle();
          
          locationContact = locationData;
        }

        return {
          ...data,
          location_contact_name: locationContact?.contact_name,
          location_contact_phone: locationContact?.contact_phone,
          location_contact_email: locationContact?.contact_email,
        };
      },
      enabled: !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
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
      notes?: string;
      photos?: File[];
    }) => {
      if (!profile?.id) throw new Error("No user profile");

      // Submit the report - only include hours_worked for employees
      const reportInsert: any = {
        work_order_id: reportData.workOrderId,
        subcontractor_user_id: profile.id,
        work_performed: reportData.workPerformed,
        materials_used: reportData.materialsUsed,
        notes: reportData.notes,
      };

      // Only include hours_worked for employees
      if (profile.user_type === 'employee' && reportData.hoursWorked !== undefined) {
        reportInsert.hours_worked = reportData.hoursWorked;
      }

      const { data: report, error: reportError } = await supabase
        .from("work_order_reports")
        .insert(reportInsert)
        .select()
        .single();

      if (reportError) throw reportError;

      // Upload photos if provided
      if (reportData.photos && reportData.photos.length > 0) {
        const uploadPromises = reportData.photos.map(async (photo, index) => {
          const fileName = `${profile.id}/${report.id}/${Date.now()}_${index}_${photo.name}`;
          
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
      const errorMessage = error.message;
      
      // Provide specific feedback for authentication errors
      if (errorMessage.includes("Authentication session invalid")) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please refresh the page and try again.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("row-level security")) {
        toast({
          title: "Permission Error",
          description: "Authentication issue detected. Please refresh the page and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit report. Please try again.",
          variant: "destructive",
        });
      }
      console.error("Report submission error:", error);
    },
  });

  // Company-level completed work orders: RLS policies provide company access
  const completedWorkOrdersForInvoicing = useQuery({
    queryKey: ["completed-work-orders-for-invoicing", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          id,
          work_order_number,
          title,
          description,
          actual_completion_date,
          date_completed,
          invoice_work_orders (
            id,
            invoice_id
          ),
          work_order_reports (
            id,
            work_performed,
            materials_used,
            hours_worked,
            status
          )
        `)
        .eq("status", "completed")
        .order("actual_completion_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return {
    assignedWorkOrders,
    dashboardStats,
    reports,
    getWorkOrder,
    submitReport,
    completedWorkOrdersForInvoicing,
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