import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  Users,
  X
} from 'lucide-react';
import { ApprovalItem } from '@/hooks/useApprovalQueue';
import { useBulkApprovals } from '@/hooks/useBulkApprovals';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface BulkActionsBarProps {
  selectedItems: ApprovalItem[];
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedItems, onClearSelection }: BulkActionsBarProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const {
    bulkApprove,
    bulkReject,
    state,
    isProcessing,
    progress,
    hasErrors
  } = useBulkApprovals();

  if (selectedItems.length === 0 && !isProcessing) {
    return null;
  }

  const handleBulkApprove = async () => {
    await bulkApprove(selectedItems);
    onClearSelection();
  };

  const handleBulkReject = async () => {
    await bulkReject(selectedItems, rejectionReason);
    setShowRejectDialog(false);
    setRejectionReason('');
    onClearSelection();
  };

  const reportsCount = selectedItems.filter(item => item.type === 'report').length;
  const invoicesCount = selectedItems.filter(item => item.type === 'invoice').length;

  return (
    <Card className="sticky bottom-4 border-primary/20 shadow-lg">
      <CardContent className="p-4">
        {isProcessing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">Processing {state.totalCount} items...</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {state.processedCount} / {state.totalCount}
              </span>
            </div>
            
            <Progress value={progress} className="h-2" />
            
            {state.currentItem && (
              <p className="text-sm text-muted-foreground">
                Current: {state.currentItem}
              </p>
            )}

            {hasErrors && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {state.errors.length} items failed to process. Check console for details.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="font-medium">
                  {selectedItems.length} items selected
                </span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {reportsCount > 0 && `${reportsCount} reports`}
                {reportsCount > 0 && invoicesCount > 0 && ', '}
                {invoicesCount > 0 && `${invoicesCount} invoices`}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearSelection}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleBulkApprove}
                disabled={selectedItems.length === 0}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve All
              </Button>

              <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedItems.length === 0}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject All
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Bulk Reject Items</DialogTitle>
                    <DialogDescription>
                      You are about to reject {selectedItems.length} items. 
                      Please provide a reason for rejection.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="reason">Rejection Reason</Label>
                      <Textarea
                        id="reason"
                        placeholder="Enter reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowRejectDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleBulkReject}
                    >
                      Reject All
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}