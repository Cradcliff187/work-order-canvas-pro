import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedPermissions } from "@/hooks/useEnhancedPermissions";

export function useSubcontractorWorkOrders() {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const permissions = useEnhancedPermissions();

  // FIX 2: Ultra-stable organization IDs that only change when actual membership changes
  const organizationIds = useMemo(() => {
    if (!permissions.user?.organization_members || loading) {
      return [];
    }
    
    // Extract ONLY the organization IDs as strings - no object references
    const orgIds = permissions.user.organization_members
      .map((m: any) => String(m.organization_id)) // Convert to string
      .filter(Boolean)
      .sort(); // Sort for stable order
    
    return orgIds;
  }, [
    // FINAL FIX: Use the most stable dependency possible
    `${loading}:${permissions.user?.organization_members?.map((m: any) => String(m.organization_id)).sort().join(',') || 'none'}`
  ]);

  // PHASE 1 FIX: Truly stable ready state based only on essential data
  const isReady = useMemo(() => {
    const ready = !loading && !!profile?.id && organizationIds.length > 0;
    console.log('🔄 isReady computed:', ready, { loading, profileId: profile?.id, orgCount: organizationIds.length });
    return ready;
  }, [loading, profile?.id, organizationIds.length]);

  // PHASE 1 FIX: Completely stable query keys that never change unless data actually changes
  const stableProfileId = useMemo(() => profile?.id, [profile?.id]);
  const stableOrgIdsString = useMemo(() => organizationIds.join(','), [organizationIds]);

  const assignedWorkOrdersQueryKey = useMemo(() => {
    const key = ["subcontractor-work-orders", stableProfileId, stableOrgIdsString];
    console.log('🔄 assignedWorkOrdersQueryKey computed:', key);
    return key;
  }, [stableProfileId, stableOrgIdsString]);

  // Organization-level access: Filter to work orders assigned to user's subcontractor organizations
  const assignedWorkOrders = useQuery({
    queryKey: assignedWorkOrdersQueryKey,
    queryFn: async () => {
      if (!profile?.id || organizationIds.length === 0) {
        return [];
      }
      
      // Get work orders assigned to user's subcontractor organizations
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
            submitted_at,
            subcontractor_user_id
          ),
          work_order_assignments (
            assigned_to,
            assignment_type,
            profiles!work_order_assignments_assigned_to_fkey (first_name, last_name),
            assigned_organization:organizations!assigned_organization_id(name, organization_type)
          )
        `)
        .in("assigned_organization_id", organizationIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform data to include attachment count
      const transformedData = (data || []).map((wo: any) => ({
        ...wo,
        attachment_count: wo.work_order_attachments?.[0]?.count || 0
      }));
      
      return transformedData;
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on permission errors
      if (error?.message?.includes('row-level security')) return false;
      return failureCount < 3;
    },
  });

  // PHASE 1 FIX: Stable query key for dashboard stats
  const dashboardStatsQueryKey = useMemo(() => {
    const key = ["subcontractor-dashboard", stableProfileId, stableOrgIdsString];
    console.log('🔄 dashboardStatsQueryKey computed:', key);
    return key;
  }, [stableProfileId, stableOrgIdsString]);

  // Organization dashboard stats: Show metrics for all work assigned to user's organizations
  const dashboardStats = useQuery({
    queryKey: dashboardStatsQueryKey,
    queryFn: async () => {
      if (!profile?.id || organizationIds.length === 0) {
        return {
          activeAssignments: 0,
          pendingReports: 0,
          completedThisMonth: 0,
          reportsThisMonth: 0,
        };
      }

      // Get work orders assigned to user's organizations
      const { data: workOrders, error: workOrdersError } = await supabase
        .from("work_orders")
        .select(`
          *,
          work_order_reports (
            id,
            status,
            submitted_at,
            subcontractor_user_id
          )
        `)
        .in("assigned_organization_id", organizationIds);

      if (workOrdersError) throw workOrdersError;

      // Get current month's reports from user's organizations
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const userIdsInOrganization = permissions.user?.organization_members
        ?.filter((m: any) => organizationIds.includes(m.organization_id))
        .map((m: any) => m.user_id) || [];

      const { data: monthlyReports, error: reportsError } = await supabase
        .from("work_order_reports")
        .select("*")
        .in("subcontractor_user_id", userIdsInOrganization.length > 0 ? userIdsInOrganization : [profile.id])
        .gte("submitted_at", startOfMonth.toISOString());

      if (reportsError) throw reportsError;

      const activeAssignments = workOrders?.filter(wo => 
        wo.status === "assigned" || wo.status === "in_progress"
      ).length || 0;

      const pendingReports = workOrders?.filter(wo => 
        wo.status === "in_progress" && 
        !wo.work_order_reports?.some(report => 
          report.status !== "rejected"
        )
      ).length || 0;

      const completedThisMonth = monthlyReports?.filter(report => 
        report.status === "approved"
      ).length || 0;

      const reportsThisMonth = monthlyReports?.length || 0;

      return {
        activeAssignments,
        pendingReports,
        completedThisMonth,
        reportsThisMonth,
      };
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('row-level security')) return false;
      return failureCount < 3;
    },
  });

  // Get work order by ID
  const getWorkOrder = (id: string) => {
    console.log('🔍 getWorkOrder called with ID:', id);
    return useQuery({
      queryKey: ["work-order", id],
      queryFn: async () => {
        console.log('🔍 getWorkOrder queryFn executing for ID:', id);
        if (!id) throw new Error('Work order ID is required');
        
        // Validate UUID format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          throw new Error('Invalid work order ID format');
        }

        // Main work order query (one-to-one relationships only)
        const { data: workOrderData, error: workOrderError } = await supabase
          .from("work_orders")
          .select(`
            *,
            trades (name, description),
            organizations!organization_id (name, contact_email, contact_phone),
            profiles!created_by (first_name, last_name, email)
          `)
          .eq("id", id)
          .maybeSingle();

        if (workOrderError) throw workOrderError;
        if (!workOrderData) throw new Error('Work order not found');

        // Separate query for work order reports (one-to-many relationship)
        const { data: reportsData, error: reportsError } = await supabase
          .from("work_order_reports")
          .select(`
            *,
            profiles!subcontractor_user_id (first_name, last_name)
          `)
          .eq("work_order_id", id);

        if (reportsError) throw reportsError;

        // Then get location contact information if available
        let locationContact = null;
        if (workOrderData.partner_location_number && workOrderData.organization_id) {
          const { data: locationData } = await supabase
            .from("partner_locations")
            .select("contact_name, contact_phone, contact_email")
            .eq("organization_id", workOrderData.organization_id)
            .eq("location_number", workOrderData.partner_location_number)
            .maybeSingle();
          
          locationContact = locationData;
        }

        return {
          ...workOrderData,
          work_order_reports: reportsData || [],
          location_contact_name: locationContact?.contact_name,
          location_contact_phone: locationContact?.contact_phone,
          location_contact_email: locationContact?.contact_email,
        };
      },
      enabled: !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
    });
  };

  // PHASE 1 FIX: Stable query key for reports
  const reportsQueryKey = useMemo(() => {
    const key = ["subcontractor-reports", stableProfileId, stableOrgIdsString];
    console.log('🔄 reportsQueryKey computed:', key);
    return key;
  }, [stableProfileId, stableOrgIdsString]);

  // Get reports for work orders assigned to user's organizations
  const reports = useQuery({
    queryKey: reportsQueryKey,
    queryFn: async () => {
      if (!profile?.id || organizationIds.length === 0) {
        return [];
      }

      // Get reports for work orders assigned to user's organizations
      const { data, error } = await supabase
        .from("work_order_reports")
        .select(`
          *,
          work_orders!inner (
            work_order_number,
            title,
            store_location,
            assigned_organization_id
          )
        `)
        .in("work_orders.assigned_organization_id", organizationIds)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('row-level security')) return false;
      return failureCount < 3;
    },
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

      // Include hours_worked if provided (for tracking purposes)
      if (reportData.hoursWorked !== undefined) {
        reportInsert.hours_worked = reportData.hoursWorked;
      }

      const { data: reportArray, error: reportError } = await supabase
        .from("work_order_reports")
        .insert(reportInsert)
        .select();

      if (reportError) throw reportError;
      if (!reportArray?.[0]) throw new Error('Failed to create report');
      
      const report = reportArray[0];


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

  // PHASE 1 FIX: Stable query key for completed work orders
  const completedWorkOrdersQueryKey = useMemo(() => {
    const key = ["completed-work-orders-for-invoicing", stableProfileId, stableOrgIdsString];
    console.log('🔄 completedWorkOrdersQueryKey computed:', key);
    return key;
  }, [stableProfileId, stableOrgIdsString]);

  // Organization completed work orders: All completed work for user's organizations
  const completedWorkOrdersForInvoicing = useQuery({
    queryKey: completedWorkOrdersQueryKey,
    queryFn: async () => {
      if (!profile?.id || organizationIds.length === 0) {
        return [];
      }
      
      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          id,
          work_order_number,
          title,
          description,
          actual_completion_date,
          date_completed,
          assigned_organization_id,
          invoice_work_orders (
            id,
            invoice_id
          ),
          work_order_reports (
            id,
            work_performed,
            materials_used,
            hours_worked,
            status,
            subcontractor_user_id
          )
        `)
        .eq("status", "completed")
        .in("assigned_organization_id", organizationIds)
        .order("actual_completion_date", { ascending: false });

      if (error) throw error;
      
      return data || [];
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('row-level security')) return false;
      return failureCount < 3;
    },
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