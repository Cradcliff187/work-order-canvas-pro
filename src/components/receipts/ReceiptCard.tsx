import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, Trash2, FileImage, DollarSign, Calendar, Building, User, Edit, CheckCircle2, XCircle, AlertCircle, Clock, Shield } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AdminReceiptEditModal } from "@/components/admin/AdminReceiptEditModal";
import { ReceiptStatusBadge } from "@/components/receipts/ReceiptStatusBadge";
import { ReceiptApprovalModal } from "@/components/receipts/ReceiptApprovalModal";

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
    is_admin_entered?: boolean;
    created_by?: string;
    status?: 'draft' | 'submitted' | 'approved' | 'rejected';
    allocated_amount?: number;
    allocation_percentage?: number;
    category?: string;
    approval_notes?: string;
    rejection_reason?: string;
    created_by_profile?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
    employee_profile?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
    receipt_work_orders: Array<{
      id: string;
      work_order_id: string;
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

  const totalAllocated = (receipt.receipt_work_orders || [])
    .filter(a => a && a.work_orders?.id && a.allocated_amount > 0)
    .reduce((sum, allocation) => sum + allocation.allocated_amount, 0);

  const allocationStatus = receipt.allocated_amount || 0;
  const allocationPercentage = receipt.allocation_percentage || 0;
  const isPendingApproval = receipt.status === 'submitted';
  const isRejected = receipt.status === 'rejected';
  const isApproved = receipt.status === 'approved';

  return (
    <Card className={`transition-all duration-200 ${
      isPendingApproval ? 'border-amber-200 bg-amber-50/30' : 
      isRejected ? 'border-red-200 bg-red-50/30' :
      isApproved ? 'border-green-200 bg-green-50/30' : ''
    }`}>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold text-lg">{receipt.vendor_name}</h3>
                <ReceiptStatusBadge 
                  status={receipt.status || 'submitted'} 
                  isAdminEntered={receipt.is_admin_entered}
                />
                {receipt.category && receipt.category !== 'Other' && (
                  <Badge variant="outline" className="text-xs">
                    {receipt.category}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(receipt.receipt_date), "MMM d, yyyy")}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  ${receipt.amount.toFixed(2)}
                </div>
                {receipt.employee_profile && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {receipt.employee_profile.first_name} {receipt.employee_profile.last_name}
                  </div>
                )}
              </div>
              
              {receipt.is_admin_entered && receipt.created_by_profile && (
                <div className="text-xs text-muted-foreground">
                  Created by: {receipt.created_by_profile.first_name} {receipt.created_by_profile.last_name}
                </div>
              )}
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
              
              {/* Approval Actions for Pending Receipts */}
              {isPendingApproval && (
                <ReceiptApprovalModal
                  receipt={receipt as any}
                  trigger={
                    <Button variant="outline" size="sm" title="Review receipt">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  }
                />
              )}
              
              <AdminReceiptEditModal 
                receipt={receipt as any}
                trigger={
                  <Button variant="outline" size="sm" title="Edit receipt">
                    <Edit className="h-4 w-4" />
                  </Button>
                }
              />
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" title="Delete receipt">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this receipt from {receipt.vendor_name}? 
                      This action cannot be undone and will also remove all work order allocations.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDelete(receipt.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Receipt
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Allocation Summary</h4>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Allocated:</span>
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-medium ${
                    Math.abs(allocationStatus - receipt.amount) < 0.01 
                      ? "text-green-600" 
                      : allocationStatus === 0 
                      ? "text-muted-foreground"
                      : "text-amber-600"
                  }`}>
                    ${allocationStatus.toFixed(2)} / ${receipt.amount.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({allocationPercentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              
              {allocationPercentage > 0 && (
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      allocationPercentage >= 100 ? 'bg-green-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(allocationPercentage, 100)}%` }}
                  />
                </div>
              )}
            </div>
            
            {allocationStatus < receipt.amount && (
              <div className="text-xs text-muted-foreground">
                Remaining: ${(receipt.amount - allocationStatus).toFixed(2)}
              </div>
            )}
          </div>

          {/* Approval/Rejection Notes */}
          {receipt.approval_notes && isApproved && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-1">Approval Notes</h4>
              <p className="text-sm text-green-700">{receipt.approval_notes}</p>
            </div>
          )}
          
          {receipt.rejection_reason && isRejected && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-1">Rejection Reason</h4>
              <p className="text-sm text-red-700">{receipt.rejection_reason}</p>
            </div>
          )}
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