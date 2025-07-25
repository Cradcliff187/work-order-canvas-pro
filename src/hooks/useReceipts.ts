import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";

export interface Receipt {
  id: string;
  employee_user_id: string;
  vendor_name: string;
  amount: number;
  description?: string;
  receipt_date: string;
  receipt_image_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptWorkOrder {
  id: string;
  receipt_id: string;
  work_order_id: string;
  allocated_amount: number;
  allocation_notes?: string;
  created_at: string;
  work_orders?: {
    id: string;
    work_order_number: string;
    title: string;
    store_location?: string;
  };
}

export interface CreateReceiptData {
  vendor_name: string;
  amount: number;
  description?: string;
  receipt_date: string;
  notes?: string;
  allocations: {
    work_order_id: string;
    allocated_amount: number;
    allocation_notes?: string;
  }[];
  receipt_image?: File;
}

export function useReceipts() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  // Get employee receipts
  const receipts = useQuery({
    queryKey: ["receipts", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from("receipts")
        .select(`
          *,
          receipt_work_orders!inner(
            *,
            work_orders!inner(
              id,
              work_order_number,
              title,
              store_location
            )
          )
        `)
        .eq("employee_user_id", profile.id)
        .order("receipt_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Get employee's assigned work orders for allocation
  const availableWorkOrders = useQuery({
    queryKey: ["employee-work-orders", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      // Get work orders assigned to this employee through work_order_assignments
      const { data: assignmentData, error } = await supabase
        .from("work_order_assignments")
        .select(`
          work_orders!work_order_assignments_work_order_id_fkey (
            id, 
            work_order_number, 
            title, 
            store_location, 
            status
          )
        `)
        .eq("assigned_to", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching work orders:", error);
        throw error;
      }

      // Transform the data to extract work orders and filter by status
      const workOrders = assignmentData?.map(assignment => assignment.work_orders).filter(Boolean) || [];
      const filteredWorkOrders = workOrders.filter(wo => 
        ["assigned", "in_progress", "completed"].includes(wo.status)
      );
      
      return filteredWorkOrders;
    },
    enabled: !!profile?.id,
  });

  // Create receipt mutation
  const createReceipt = useMutation({
    mutationFn: async (data: CreateReceiptData) => {
      if (!profile?.id) throw new Error("No profile found");

      setIsUploading(true);
      
      try {
        // First create the receipt
        const { data: receipt, error: receiptError } = await supabase
          .from("receipts")
          .insert({
            employee_user_id: profile.id,
            vendor_name: data.vendor_name,
            amount: data.amount,
            description: data.description,
            receipt_date: data.receipt_date,
            notes: data.notes,
          })
          .select()
          .single();

        if (receiptError) throw receiptError;

        // Upload receipt image if provided
        let receipt_image_url = null;
        if (data.receipt_image) {
          const timestamp = Date.now();
          const fileName = `${timestamp}_${data.receipt_image.name}`;
          const filePath = `receipts/${profile.id}/${fileName}`;

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

        // Create allocation records
        const allocations = data.allocations.map(allocation => ({
          receipt_id: receipt.id,
          work_order_id: allocation.work_order_id,
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
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast({
        title: "Receipt Created",
        description: "Receipt has been successfully uploaded and allocated.",
      });
    },
    onError: (error) => {
      console.error("Receipt creation error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to create receipt",
        variant: "destructive",
      });
    },
  });

  // Delete receipt mutation
  const deleteReceipt = useMutation({
    mutationFn: async (receiptId: string) => {
      // First delete allocations
      const { error: allocationError } = await supabase
        .from("receipt_work_orders")
        .delete()
        .eq("receipt_id", receiptId);

      if (allocationError) throw allocationError;

      // Get receipt to delete image
      const { data: receipt } = await supabase
        .from("receipts")
        .select("receipt_image_url")
        .eq("id", receiptId)
        .single();

      // Delete image if exists
      if (receipt?.receipt_image_url) {
        await supabase.storage
          .from("work-order-attachments")
          .remove([receipt.receipt_image_url]);
      }

      // Delete receipt
      const { error: receiptError } = await supabase
        .from("receipts")
        .delete()
        .eq("id", receiptId);

      if (receiptError) throw receiptError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast({
        title: "Receipt Deleted",
        description: "Receipt has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete receipt",
        variant: "destructive",
      });
    },
  });

  return {
    receipts,
    availableWorkOrders,
    createReceipt,
    deleteReceipt,
    isUploading,
  };
}