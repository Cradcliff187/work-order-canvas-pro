import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, DollarSign, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { useAdminReceipts } from "@/hooks/useAdminReceipts";

interface ReceiptApprovalModalProps {
  receipt: {
    id: string;
    vendor_name: string;
    amount: number;
    receipt_date: string;
    description?: string;
    employee_profile?: {
      first_name: string;
      last_name: string;
    };
    status: string;
  };
  trigger: React.ReactNode;
}

export function ReceiptApprovalModal({ receipt, trigger }: ReceiptApprovalModalProps) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState("");
  
  const { approveReceipt } = useAdminReceipts();

  const handleSubmit = async () => {
    if (!action) return;
    
    try {
      await approveReceipt.mutateAsync({
        receiptId: receipt.id,
        action,
        notes: notes.trim() || undefined,
      });
      
      setOpen(false);
      setAction(null);
      setNotes("");
    } catch (error) {
      console.error("Approval error:", error);
    }
  };

  const handleActionSelect = (selectedAction: 'approve' | 'reject') => {
    setAction(selectedAction);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Receipt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Receipt Details */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="font-semibold text-lg">{receipt.vendor_name}</div>
            
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

            {receipt.employee_profile && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {receipt.employee_profile.first_name} {receipt.employee_profile.last_name}
              </div>
            )}

            {receipt.description && (
              <p className="text-sm text-muted-foreground">{receipt.description}</p>
            )}
          </div>

          {/* Action Selection */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Choose Action</div>
            <div className="flex gap-2">
              <Button
                variant={action === 'approve' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleActionSelect('approve')}
                className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant={action === 'reject' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => handleActionSelect('reject')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>

          {/* Notes Input */}
          {action && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {action === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason'}
              </label>
              <Textarea
                placeholder={
                  action === 'approve' 
                    ? "Add any approval notes..."
                    : "Please explain why this receipt is being rejected..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setOpen(false);
              setAction(null);
              setNotes("");
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!action || approveReceipt.isPending}
            className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            variant={action === 'reject' ? 'destructive' : 'default'}
          >
            {approveReceipt.isPending ? 'Processing...' : 
             action === 'approve' ? 'Approve Receipt' : 'Reject Receipt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}