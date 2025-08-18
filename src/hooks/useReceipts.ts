import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import { sanitizeAllocations, validateAllocations } from "@/utils/allocationValidation";

export interface ReceiptLineItem {
  id: string;
  receipt_id: string;
  description: string;
  quantity: number;
  unit_price?: number;
  total_price: number;
  line_number?: number;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  employee_user_id: string;
  vendor_name: string;
  amount: number;
  subtotal?: number;
  tax_amount?: number;
  ocr_confidence?: number;
  line_items_extracted?: boolean;
  description?: string;
  receipt_date: string;
  receipt_image_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  receipt_line_items?: ReceiptLineItem[];
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
  subtotal?: number;
  tax_amount?: number;
  ocr_confidence?: number;
  line_items_extracted?: boolean;
  description?: string;
  receipt_date: string;
  notes?: string;
  allocations: {
    work_order_id: string;
    allocated_amount: number;
    allocation_notes?: string;
  }[];
  receipt_image?: File;
  line_items?: Omit<ReceiptLineItem, 'id' | 'receipt_id' | 'created_at' | 'updated_at'>[];
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
          ),
          receipt_line_items (*)
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
      
      // First, determine if user is internal employee
      const { data: membershipData } = await supabase
        .from("organization_members")
        .select("organizations!inner(organization_type)")
        .eq("user_id", profile.id)
        .single();
      
      const isInternalEmployee = membershipData?.organizations?.organization_type === 'internal';
      
      if (isInternalEmployee) {
        // Internal employees see ALL active work orders
        const { data, error } = await supabase
          .from("work_orders")
          .select(`
            id, 
            work_order_number, 
            title, 
            store_location, 
            status,
            organizations!organization_id(name, initials)
          `)
          .in("status", ["assigned", "in_progress"])
          .order("work_order_number", { ascending: false })
          .limit(100);
        
        if (error) {
          console.error("Error fetching work orders:", error);
          throw error;
        }
        
        return data || [];
      } else {
        // Non-internal users see only assigned work orders (existing logic)
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
        
        const workOrders = assignmentData?.map(assignment => assignment.work_orders).filter(Boolean) || [];
        return workOrders.filter(wo => 
          ["assigned", "in_progress", "completed"].includes(wo.status)
        );
      }
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
            subtotal: data.subtotal,
            tax_amount: data.tax_amount,
            ocr_confidence: data.ocr_confidence,
            line_items_extracted: data.line_items_extracted,
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

        // Create line items if provided
        if (data.line_items && data.line_items.length > 0) {
          const { error: lineItemsError } = await supabase
            .from("receipt_line_items")
            .insert(
              data.line_items.map((item, index) => ({
                receipt_id: receipt.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                line_number: index + 1,
              }))
            );

          if (lineItemsError) {
            console.error('Error creating line items:', lineItemsError);
            throw lineItemsError;
          }
        }

        // Validate and sanitize allocations before database insert
        const validatedAllocations = validateAllocations(data.allocations, {
          totalAmount: data.amount,
          allowPartialAllocation: true,
          minAllocationAmount: 0.01
        });

        if (!validatedAllocations.isValid) {
          throw new Error(`Invalid allocations: ${validatedAllocations.errors.join(', ')}`);
        }

        const sanitizedAllocations = sanitizeAllocations(data.allocations, {
          totalAmount: data.amount,
          minAllocationAmount: 0.01
        });

        if (sanitizedAllocations.length === 0) {
          throw new Error("At least one valid allocation is required");
        }

        // Log any filtered allocations for debugging
        if (sanitizedAllocations.length !== data.allocations.length) {
          console.warn(`Filtered ${data.allocations.length - sanitizedAllocations.length} invalid allocations`);
        }

        // Create allocation records with validated data
        const allocations = sanitizedAllocations.map(allocation => ({
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