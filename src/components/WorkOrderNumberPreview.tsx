
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  isFallback,
  warning,
  organizationName,
  organizationInitials,
  locationNumber,
  usesPartnerLocationNumbers,
  typedLocationCode,
  className = '',
}: WorkOrderNumberPreviewProps) {
  const getPreviewText = () => {
    if (usesPartnerLocationNumbers) {
      // Manual location codes
      if (typedLocationCode) {
        return `Your work order will be: ${organizationInitials || 'ORG'}-${typedLocationCode}-001`;
      } else {
        return `Your work order will be: ${organizationInitials || 'ORG'}-[REQUIRED]-001`;
      }
    } else {
      // Auto-generated location codes
      return `Your work order will be: ${organizationInitials || 'ORG'}-###-001 (location code assigned automatically)`;
    }
  };

  const getStatusText = () => {
    if (usesPartnerLocationNumbers) {
      if (!typedLocationCode) {
        return 'Location code required';
      }
      return 'Updates as you type';
    } else {
      return 'Auto-generated';
    }
  };

  const getStatusColor = () => {
    if (usesPartnerLocationNumbers && !typedLocationCode) {
      return 'destructive';
    }
    return 'secondary';
  };

  return (
    <Card className={`border-primary/20 bg-primary/5 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-medium">Work Order Number Preview</span>
          <Badge variant={getStatusColor()} className="text-xs">
            {getStatusText()}
          </Badge>
        </div>

        <div className="space-y-3">
          {/* Main Preview */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">
                {getPreviewText()}
              </div>
              <div className="relative">
                <div className="font-mono text-lg font-bold text-primary">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </div>
                  ) : error ? (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>Error generating number</span>
                    </div>
                  ) : (
                    workOrderNumber || 'Will be generated automatically'
                  )}
                </div>
                {isFallback && workOrderNumber && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    Fallback format
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Warning or Additional Info */}
          {warning && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                {warning}
              </div>
            </div>
          )}

          {/* Organization Context */}
          {organizationName && (
            <div className="text-xs text-muted-foreground">
              Organization: {organizationName}
              {organizationInitials && (
                <span className="ml-2 font-mono">({organizationInitials})</span>
              )}
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-muted-foreground">
            {usesPartnerLocationNumbers ? (
              <span>
                Enter your location code above to see the exact work order number that will be generated.
              </span>
            ) : (
              <span>
                Your organization uses auto-generated location codes. The final number will be assigned when you submit.
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
