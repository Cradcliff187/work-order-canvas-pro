import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface AdminReportSubmissionData {
  workOrderId: string;
  subcontractorUserId: string; // Who the report is being submitted for
  workPerformed: string;
  materialsUsed?: string;
  hoursWorked?: number;
  notes?: string;
  photos?: File[];
}

export function useAdminReportSubmission() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const submitReportForSubcontractor = useMutation({
    mutationFn: async (reportData: AdminReportSubmissionData) => {
      if (!user) throw new Error("Not authenticated");

      // Get current admin/employee profile
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!adminProfile) throw new Error("Admin profile not found");

      // Get subcontractor's auth user_id for proper file organization
      const { data: subcontractorProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", reportData.subcontractorUserId)
        .single();

      if (!subcontractorProfile) throw new Error("Subcontractor profile not found");

      // Submit the report with admin as submitted_by_user_id
      const reportInsert: any = {
        work_order_id: reportData.workOrderId,
        subcontractor_user_id: reportData.subcontractorUserId,
        submitted_by_user_id: adminProfile.id, // Track who actually submitted it
        work_performed: reportData.workPerformed,
        materials_used: reportData.materialsUsed,
        notes: reportData.notes,
      };

      // Include hours_worked if provided (for employee assignments)
      if (reportData.hoursWorked !== undefined) {
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
          // Use subcontractor's auth user_id for file path organization
          const fileName = `${subcontractorProfile.user_id}/${report.id}/${Date.now()}_${index}_${photo.name}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("work-order-attachments")
            .upload(fileName, photo);

          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            throw new Error(`Failed to upload file ${photo.name}: ${uploadError.message}`);
          }

          // Create attachment record
          const { error: attachmentError } = await supabase
            .from("work_order_attachments")
            .insert({
              work_order_report_id: report.id,
              file_name: photo.name,
              file_url: uploadData.path,
              file_type: "photo",
              file_size: photo.size,
              uploaded_by_user_id: adminProfile.id,
            });

          if (attachmentError) {
            console.error("Attachment record creation error:", attachmentError);
            throw new Error(`Failed to create attachment record for ${photo.name}: ${attachmentError.message}`);
          }
        });

        await Promise.all(uploadPromises);
      }

      // Update work order status
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
        description: "Work report has been submitted successfully on behalf of the subcontractor.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["work-order", "detail"] });
    },
    onError: (error) => {
      toast({
        title: "Submission Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
      console.error("Admin report submission error:", error);
    },
  });

  return {
    submitReportForSubcontractor,
    isSubmitting: submitReportForSubcontractor.isPending,
  };
}