import React from 'react';
import { FileBarChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { PartnerReportStats } from '@/hooks/usePartnerReportStats';

interface ReportPipelineEmptyStateProps {
  reportStats?: PartnerReportStats;
  className?: string;
}

export const ReportPipelineEmptyState: React.FC<ReportPipelineEmptyStateProps> = ({
  reportStats,
  className,
}) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      isMobile ? "py-8 px-4" : "py-12",
      className
    )}>
      <div className={cn(
        "rounded-full bg-muted",
        isMobile ? "mb-6 p-4" : "mb-4 p-3"
      )}>
        <FileBarChart className={cn(
          "text-muted-foreground",
          isMobile 
            ? "h-12 w-12"
            : "h-8 w-8 animate-construction-bounce"
        )} />
      </div>
      
      <h3 className={cn(
        "font-semibold mb-2",
        isMobile ? "text-xl" : "text-lg"
      )}>
        No reports ready for partner billing
      </h3>
      
      <div className="space-y-3 max-w-md">
        <p className="text-muted-foreground text-sm">
          Reports must have approved subcontractor invoices before they can be billed to partners.
        </p>
        
        {reportStats && reportStats.totalApprovedReports > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Report Pipeline Status:</p>
            <div className="text-sm space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">• Total approved reports:</span>
                <span className="font-medium">{reportStats.totalApprovedReports}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">• Reports without invoices:</span>
                <span className="font-medium">{reportStats.reportsWithoutInvoices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">• Reports with pending invoices:</span>
                <span className="font-medium">{reportStats.reportsWithPendingInvoices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">• Reports ready for billing:</span>
                <span className="font-medium">{reportStats.reportsReadyForBilling}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">• Reports already billed:</span>
                <span className="font-medium">{reportStats.reportsAlreadyBilled}</span>
              </div>
            </div>
            
            {reportStats.reportsWithoutInvoices > 0 && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded border border-border">
                <strong>Next step:</strong> Subcontractors need to submit invoices for {reportStats.reportsWithoutInvoices} report{reportStats.reportsWithoutInvoices !== 1 ? 's' : ''}.
              </div>
            )}
            
            {reportStats.reportsWithPendingInvoices > 0 && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded border border-border">
                <strong>Action needed:</strong> {reportStats.reportsWithPendingInvoices} subcontractor invoice{reportStats.reportsWithPendingInvoices !== 1 ? 's' : ''} need{reportStats.reportsWithPendingInvoices === 1 ? 's' : ''} approval.
              </div>
            )}
          </div>
        )}
        
        {reportStats && reportStats.totalApprovedReports === 0 && (
          <p className="text-sm text-muted-foreground">
            No approved reports found for this partner yet.
          </p>
        )}
      </div>
    </div>
  );
};