import { useState, useCallback } from "react";
import { FormLabel } from "@/components/ui/form";
import { FileUpload } from "@/components/FileUpload";
import { cn } from "@/lib/utils";

interface TimeReportReceiptsProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

export function TimeReportReceipts({
  onFilesSelected,
  disabled = false,
  className,
}: TimeReportReceiptsProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    onFilesSelected(files);
  }, [onFilesSelected]);

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <FormLabel>Receipt Attachments</FormLabel>
        <p className="text-sm text-muted-foreground">
          Upload receipts for materials or expenses (up to 10 files, max 10MB each)
        </p>
      </div>
      
      <FileUpload
        onFilesSelected={handleFilesSelected}
        maxFiles={10}
        maxSizeBytes={10 * 1024 * 1024}
        disabled={disabled}
      />
    </div>
  );
}