import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface BulkEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onApproveSelected?: () => void;
  onRejectSelected?: () => void;
  onMarkPaidSelected?: () => void;
}

export const BulkEditSheet: React.FC<BulkEditSheetProps> = ({
  open,
  onOpenChange,
  selectedCount,
  onApproveSelected,
  onRejectSelected,
  onMarkPaidSelected,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Actions</DialogTitle>
          <DialogDescription>
            Apply actions to {selectedCount} selected invoice{selectedCount === 1 ? '' : 's'}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <Button onClick={onApproveSelected} disabled={!selectedCount}>Approve</Button>
          <Button variant="destructive" onClick={onRejectSelected} disabled={!selectedCount}>Reject</Button>
          <Button variant="outline" onClick={onMarkPaidSelected} disabled={!selectedCount}>Mark Paid</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
