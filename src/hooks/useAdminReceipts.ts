import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface AdminCreateReceiptData {
  employee_user_id?: string; // Optional - if null, receipt goes directly to work order
  vendor_name: string;
  amount: number;
  subtotal?: number;
  tax_amount?: number;
  description?: string;
  receipt_date: string;
  notes?: string;
  category?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  allocations: {
    work_order_id?: string;
    project_id?: string;
    allocated_amount: number;
    allocation_notes?: string;
  }[];
  receipt_image?: File;
}

export interface ReceiptApprovalData {
  receiptId: string;
  action: 'approve' | 'reject';
  notes?: string;
}

export function useAdminReceipts() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  // Get all receipts (admin view)
  const allReceipts = useQuery({
    queryKey: ["admin-receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select(`
          *,
          created_by_profile:profiles!created_by(
            id,
            first_name,
            last_name,
            email
          ),
          employee_profile:profiles!employee_user_id(
            id,
            first_name,
            last_name,
            email
          ),
          receipt_work_orders!inner(
            *,
            work_orders!inner(
              id,
              work_order_number,
              title,
              store_location
            )
          ),
          receipt_line_items (*)
        `)
        .order("receipt_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Get active employees for selection
  const employees = useQuery({
    queryKey: ["active-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("is_active", true)
        .order("first_name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });


  // Get all work orders for allocation (minimal for legacy compatibility)
  const workOrders = useQuery({
    queryKey: ["admin-legacy-work-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(`id, work_order_number, title, status`)
        .limit(100)
        .order("work_order_number", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
  const createAdminReceipt = useMutation({
    mutationFn: async (data: AdminCreateReceiptData) => {
      if (!profile?.id) throw new Error("No admin profile found");

      setIsUploading(true);
      
      try {
        // Create the receipt with admin fields
        const { data: receipt, error: receiptError } = await supabase
          .from("receipts")
          .insert({
            employee_user_id: data.employee_user_id || profile.id, // Default to admin if no employee specified
            vendor_name: data.vendor_name,
            amount: data.amount,
            subtotal: data.subtotal,
            tax_amount: data.tax_amount,
            description: data.description,
            receipt_date: data.receipt_date,
            notes: data.notes,
            category: data.category || 'Other',
            status: data.status || 'approved', // Admin-created receipts are auto-approved
            created_by: profile.id,
            is_admin_entered: true,
          })
          .select()
          .single();

        if (receiptError) throw receiptError;

        // Upload receipt image if provided
        let receipt_image_url = null;
        if (data.receipt_image) {
          const timestamp = Date.now();
          const fileName = `${timestamp}_${data.receipt_image.name}`;
          const filePath = `receipts/admin/${receipt.id}/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("work-order-attachments")
            .upload(filePath, data.receipt_image);

          if (uploadError) throw uploadError;

          // Update receipt with image URL
          const { error: updateError } = await supabase
            .from("receipts")
            .update({ receipt_image_url: uploadData.path })
            .eq("id", receipt.id);

          if (updateError) throw updateError;
          receipt_image_url = uploadData.path;
        }

        // Validate allocations total
        const totalAllocated = data.allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
        if (Math.abs(totalAllocated - data.amount) > 0.01) {
          throw new Error(`Total allocated (${totalAllocated.toFixed(2)}) must equal receipt amount (${data.amount.toFixed(2)})`);
        }

        if (data.allocations.length === 0) {
          throw new Error("At least one work order or project allocation is required");
        }

        // Create allocation records
        const allocations = data.allocations.map(allocation => ({
          receipt_id: receipt.id,
          work_order_id: allocation.work_order_id || null,
          allocated_amount: allocation.allocated_amount,
          allocation_notes: allocation.allocation_notes,
        }));

        const { error: allocationError } = await supabase
          .from("receipt_work_orders")
          .insert(allocations);

        if (allocationError) throw allocationError;

        return { ...receipt, receipt_image_url };
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast({
        title: "Receipt Created",
        description: "Admin receipt has been successfully created and allocated.",
      });
    },
    onError: (error) => {
      console.error("Admin receipt creation error:", error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create receipt",
        variant: "destructive",
      });
    },
  });

  // Approve or reject receipt
  const approveReceipt = useMutation({
    mutationFn: async ({ receiptId, action, notes }: ReceiptApprovalData) => {
      if (!profile?.id) throw new Error("No admin profile found");

      const updateData: any = {
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
      };

      if (action === 'approve') {
        updateData.status = 'approved';
        updateData.approval_notes = notes;
      } else {
        updateData.status = 'rejected';
        updateData.rejection_reason = notes;
      }

      const { error } = await supabase
        .from("receipts")
        .update(updateData)
        .eq("id", receiptId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast({
        title: "Receipt Updated",
        description: "Receipt status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Receipt approval error:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update receipt status",
        variant: "destructive",
      });
    },
  });

  // Delete admin receipt
  const deleteAdminReceipt = useMutation({
    mutationFn: async (receiptId: string) => {
      if (!profile?.id) throw new Error("No admin profile found");

      // Delete receipt line items first
      const { error: lineItemsError } = await supabase
        .from("receipt_line_items")
        .delete()
        .eq("receipt_id", receiptId);

      if (lineItemsError) throw lineItemsError;

      // Delete receipt work order allocations
      const { error: allocationError } = await supabase
        .from("receipt_work_orders")
        .delete()
        .eq("receipt_id", receiptId);

      if (allocationError) throw allocationError;

      // Delete any time entry allocations
      const { error: timeEntryError } = await supabase
        .from("receipt_time_entries")
        .delete()
        .eq("receipt_id", receiptId);

      if (timeEntryError) throw timeEntryError;

      // Get receipt to delete image
      const { data: receipt } = await supabase
        .from("receipts")
        .select("receipt_image_url")
        .eq("id", receiptId)
        .single();

      // Delete image from storage if exists
      if (receipt?.receipt_image_url) {
        const { error: storageError } = await supabase.storage
          .from("work-order-attachments")
          .remove([receipt.receipt_image_url]);
        
        // Log storage error but don't fail the deletion
        if (storageError) {
          console.warn("Failed to delete receipt image:", storageError);
        }
      }

      // Finally, delete the receipt record
      const { error: receiptError } = await supabase
        .from("receipts")
        .delete()
        .eq("id", receiptId);

      if (receiptError) throw receiptError;

      return receiptId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast({
        title: "Receipt Deleted",
        description: "Receipt and all related records have been successfully deleted.",
      });
    },
    onError: (error) => {
      console.error("Admin receipt deletion error:", error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete receipt",
        variant: "destructive",
      });
    },
  });

  return {
    allReceipts,
    employees,
    workOrders, // For legacy compatibility
    createAdminReceipt,
    approveReceipt,
    deleteAdminReceipt,
    isUploading,
  };
}