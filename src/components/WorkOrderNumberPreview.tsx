
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, AlertCircle } from 'lucide-react';

interface WorkOrderNumberPreviewProps {
  workOrderNumber: string;
  isLoading: boolean;
  error: string | null;
  isFallback: boolean;
  warning: string | null;
  organizationName?: string;
  organizationInitials?: string;
  locationNumber?: string;
  usesPartnerLocationNumbers?: boolean;
  typedLocationCode?: string;
  className?: string;
}

export function WorkOrderNumberPreview({
  workOrderNumber,
  isLoading,
  error,
  className = '',
}: WorkOrderNumberPreviewProps) {
  return (
    <Card className={`border-primary/20 bg-primary/5 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-medium">Work Order Number</span>
        </div>

        <div className="space-y-3">
          <div className="font-mono text-lg font-bold text-primary">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Will be assigned automatically</span>
              </div>
            ) : workOrderNumber ? (
              workOrderNumber
            ) : (
              <span className="text-muted-foreground">Will be assigned automatically</span>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            Your work order number will be created when you submit this request.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
