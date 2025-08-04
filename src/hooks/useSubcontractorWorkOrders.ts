import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedPermissions } from "@/hooks/useEnhancedPermissions";

/**
 * Custom hook to provide truly stable organization IDs
 * This prevents the infinite loop by ensuring the array reference
 * only changes when the actual organization IDs change
 */
function useStableOrganizationIds() {
  const permissions = useEnhancedPermissions();
  const previousIdsRef = useRef<string[]>([]);
  
  return useMemo(() => {
    // Early return if no user or no memberships
    if (!permissions.user?.organization_members) {
      return [];
    }
    
    // Extract and sort IDs for comparison
    const newIds = permissions.user.organization_members
      .map((m: any) => m.organization_id)
      .filter(Boolean)
      .sort();
    
    // Compare with previous IDs
    const previousIds = previousIdsRef.current;
    const hasChanged = 
      newIds.length !== previousIds.length ||
      newIds.some((id, index) => id !== previousIds[index]);
    
    // Only update reference if actually changed
    if (hasChanged) {
      previousIdsRef.current = newIds;
      return newIds;
    }
    
    // Return previous reference if unchanged
    return previousIds;
  }, [permissions.user?.organization_members?.length, permissions.user?.id]);
}

export function useSubcontractorWorkOrders() {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use truly stable organization IDs
  const organizationIds = useStableOrganizationIds();
  
  // Create stable ready check
  const isReady = !loading && !!profile?.id && organizationIds.length > 0;
  
  // Debug logging (remove in production)
  useEffect(() => {
    console.log('useSubcontractorWorkOrders render:', {
      loading,
      profileId: profile?.id,
      orgIds: organizationIds,
      isReady
    });
  }, [loading, profile?.id, organizationIds, isReady]);

  // Stable query key using string representation
  const assignedWorkOrdersQueryKey = useMemo(() => 
    ["subcontractor-work-orders", user?.id, profile?.id, ...organizationIds],
    [user?.id, profile?.id, organizationIds.join(',')]
  );

  // Organization-level access: Filter to work orders assigned to user's subcontractor organizations
  const assignedWorkOrders = useQuery({
    queryKey: assignedWorkOrdersQueryKey,
    queryFn: async () => {
      if (!profile?.id || organizationIds.length === 0) {
        return [];
      }
      
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
      
      const transformedData = (data || []).map((wo: any) => ({
        ...wo,
        attachment_count: wo.work_order_attachments?.[0]?.count || 0
      }));
      
      return transformedData;
    },
    enabled: isReady,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on tab focus
    refetchOnMount: false, // Use cache on mount if available
  });

  // Stable query key for dashboard stats
  const dashboardStatsQueryKey = useMemo(() => 
    ["subcontractor-dashboard", user?.id, profile?.id, ...organizationIds],
    [user?.id, profile?.id, organizationIds.join(',')]
  );

  // Organization dashboard stats
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

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Use stable organization member IDs
      const userIdsInOrganization = useStableOrganizationMemberIds(organizationIds);

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
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Get work order by ID with stable query
  const getWorkOrder = (id: string) => {
    const isValidId = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    return useQuery({
      queryKey: ["work-order", id],
      queryFn: async () => {
        if (!id || !isValidId) throw new Error('Invalid work order ID');

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

        const { data: reportsData, error: reportsError } = await supabase
          .from("work_order_reports")
          .select(`
            *,
            profiles!subcontractor_user_id (first_name, last_name)
          `)
          .eq("work_order_id", id);

        if (reportsError) throw reportsError;

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
      enabled: isValidId,
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
    });
  };

  // Stable query key for reports
  const reportsQueryKey = useMemo(() => 
    ["subcontractor-reports", user?.id, profile?.id, ...organizationIds],
    [user?.id, profile?.id, organizationIds.join(',')]
  );

  // Get reports for work orders
  const reports = useQuery({
    queryKey: reportsQueryKey,
    queryFn: async () => {
      if (!profile?.id || organizationIds.length === 0) {
        return [];
      }

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
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Submit work report mutation
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

      const reportInsert: any = {
        work_order_id: reportData.workOrderId,
        subcontractor_user_id: profile.id,
        work_performed: reportData.workPerformed,
        materials_used: reportData.materialsUsed,
        notes: reportData.notes,
      };

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

      // Handle photo uploads
      if (reportData.photos && reportData.photos.length > 0) {
        const uploadPromises = reportData.photos.map(async (photo, index) => {
          const fileName = `${profile.id}/${report.id}/${Date.now()}_${index}_${photo.name}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("work-order-attachments")
            .upload(fileName, photo);

          if (uploadError) throw uploadError;

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
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["subcontractor-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["subcontractor-reports"] });
      queryClient.invalidateQueries({ queryKey: ["subcontractor-dashboard"] });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Unknown error";
      
      if (errorMessage.includes("JWT") || errorMessage.includes("token")) {
        toast({
          title: "Session Expired",
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

  // Stable query key for completed work orders
  const completedWorkOrdersQueryKey = useMemo(() => 
    ["completed-work-orders-for-invoicing", user?.id, profile?.id, ...organizationIds],
    [user?.id, profile?.id, organizationIds.join(',')]
  );

  // Organization completed work orders
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
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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

// Helper hook for stable organization member IDs
function useStableOrganizationMemberIds(organizationIds: string[]) {
  const permissions = useEnhancedPermissions();
  const previousIdsRef = useRef<string[]>([]);
  
  return useMemo(() => {
    const newIds = permissions.user?.organization_members
      ?.filter((m: any) => organizationIds.includes(m.organization_id))
      .map((m: any) => m.user_id)
      .filter(Boolean)
      .sort() || [];
    
    const hasChanged = 
      newIds.length !== previousIdsRef.current.length ||
      newIds.some((id, index) => id !== previousIdsRef.current[index]);
    
    if (hasChanged) {
      previousIdsRef.current = newIds;
      return newIds;
    }
    
    return previousIdsRef.current;
  }, [permissions.user?.organization_members?.length, organizationIds.join(',')]);
}

// Image compression utility
export function compressImage(file: File, maxSizeMB = 1): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
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