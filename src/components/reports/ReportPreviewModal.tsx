import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReportPreviewSummary } from "./ReportPreviewSummary";

interface ReportPreviewModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  formData: {
    workPerformed: string;
    materialsUsed?: string;
    hoursWorked?: string;
    notes?: string;
    attachments?: File[];
    invoiceAmount?: string;
    invoiceNumber?: string;
  };
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onConfirm,
  onEdit,
  formData,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => onEdit()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Review Report</DialogTitle>
          <DialogDescription>
            Please review your report details before submitting. You can edit any information or confirm to proceed with submission.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 max-h-[60vh] overflow-y-auto">
          <div className="pr-4">
            <ReportPreviewSummary formData={formData} />
          </div>
        </ScrollArea>

        <DialogFooter className="space-x-2">
          <Button variant="outline" onClick={onEdit}>
            Edit Report
          </Button>
          <Button onClick={onConfirm}>
            Confirm & Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};