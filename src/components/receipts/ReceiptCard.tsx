import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, FileImage, DollarSign, Calendar, Building } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface ReceiptCardProps {
  receipt: {
    id: string;
    vendor_name: string;
    amount: number;
    description?: string;
    receipt_date: string;
    receipt_image_url?: string;
    notes?: string;
    created_at: string;
    receipt_work_orders: Array<{
      id: string;
      allocated_amount: number;
      allocation_notes?: string;
      work_orders: {
        id: string;
        work_order_number: string;
        title: string;
        store_location?: string;
      };
    }>;
  };
  onDelete: (receiptId: string) => void;
}

export function ReceiptCard({ receipt, onDelete }: ReceiptCardProps) {
  const handleViewImage = async () => {
    if (!receipt.receipt_image_url) return;

    try {
      const { data } = supabase.storage
        .from("work-order-attachments")
        .getPublicUrl(receipt.receipt_image_url);
      
      window.open(data.publicUrl, "_blank");
    } catch (error) {
      console.error("Error viewing image:", error);
    }
  };

  const totalAllocated = receipt.receipt_work_orders.reduce(
    (sum, allocation) => sum + allocation.allocated_amount,
    0
  );

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{receipt.vendor_name}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(receipt.receipt_date), "MMM d, yyyy")}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  ${receipt.amount.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {receipt.receipt_image_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewImage}
                  title="View receipt image"
                >
                  <FileImage className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(receipt.id)}
                title="Delete receipt"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          {receipt.description && (
            <p className="text-sm text-muted-foreground">{receipt.description}</p>
          )}

          {/* Work Order Allocations */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Work Order Allocations</h4>
            <div className="space-y-2">
              {receipt.receipt_work_orders.map((allocation) => (
                <div
                  key={allocation.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {allocation.work_orders.work_order_number}
                      </Badge>
                      <span className="text-sm font-medium">
                        {allocation.work_orders.title}
                      </span>
                    </div>
                    {allocation.work_orders.store_location && (
                      <div className="flex items-center gap-1 mt-1">
                        <Building className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {allocation.work_orders.store_location}
                        </span>
                      </div>
                    )}
                    {allocation.allocation_notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {allocation.allocation_notes}
                      </p>
                    )}
                  </div>
                  <div className="text-sm font-medium">
                    ${allocation.allocated_amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Allocation Summary */}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Total Allocated:</span>
              <span className={`text-sm font-medium ${
                Math.abs(totalAllocated - receipt.amount) < 0.01 
                  ? "text-green-600" 
                  : "text-amber-600"
              }`}>
                ${totalAllocated.toFixed(2)} / ${receipt.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {receipt.notes && (
            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium mb-1">Notes</h4>
              <p className="text-sm text-muted-foreground">{receipt.notes}</p>
            </div>
          )}

          {/* Created timestamp */}
          <div className="text-xs text-muted-foreground">
            Created {format(new Date(receipt.created_at), "MMM d, yyyy 'at' h:mm a")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}