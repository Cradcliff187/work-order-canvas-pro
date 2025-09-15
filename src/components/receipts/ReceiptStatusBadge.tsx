import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, FileText, Shield } from "lucide-react";

interface ReceiptStatusBadgeProps {
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  isAdminEntered?: boolean;
  className?: string;
}

export function ReceiptStatusBadge({ status, isAdminEntered, className }: ReceiptStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          icon: <FileText className="h-3 w-3" />,
          label: 'Draft',
          variant: 'outline' as const,
          className: 'text-muted-foreground border-muted-foreground',
        };
      case 'submitted':
        return {
          icon: <Clock className="h-3 w-3" />,
          label: 'Pending Review',
          variant: 'secondary' as const,
          className: 'text-amber-700 bg-amber-50 border-amber-200',
        };
      case 'approved':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'Approved',
          variant: 'default' as const,
          className: 'text-green-700 bg-green-50 border-green-200',
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-3 w-3" />,
          label: 'Rejected',
          variant: 'destructive' as const,
          className: 'text-red-700 bg-red-50 border-red-200',
        };
      default:
        return {
          icon: <FileText className="h-3 w-3" />,
          label: status,
          variant: 'outline' as const,
          className: 'text-muted-foreground border-muted-foreground',
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={statusConfig.variant}
        className={`text-xs ${statusConfig.className} ${className}`}
      >
        {statusConfig.icon}
        <span className="ml-1">{statusConfig.label}</span>
      </Badge>
      {isAdminEntered && (
        <Badge variant="secondary" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      )}
    </div>
  );
}