import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, X, Edit, FileText, Mail, DollarSign, Trash2 } from 'lucide-react';
import { ExportDropdown } from '@/components/ui/export-dropdown';

export interface PartnerInvoiceBulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onExport: (format: 'csv' | 'excel', ids: string[]) => void;
  onGeneratePDFs: (ids: string[]) => void;
  onSendEmails: (ids: string[]) => void;
  onUpdateStatus: (ids: string[]) => void;
  onBulkEdit: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
  loading?: boolean;
}

export function PartnerInvoiceBulkActionsBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onExport,
  onGeneratePDFs,
  onSendEmails,
  onUpdateStatus,
  onBulkEdit,
  onBulkDelete,
  loading = false,
}: PartnerInvoiceBulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card 
      className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-45 shadow-lg mx-4 sm:mx-6 w-auto max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)]" 
      role="toolbar" 
      aria-label="Bulk actions for selected invoices"
    >
      <CardContent className="py-2 sm:py-3 px-3 sm:px-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm font-medium text-center sm:text-left" aria-live="polite">
            {selectedCount} invoice{selectedCount === 1 ? '' : 's'} selected
          </span>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <ExportDropdown
              onExport={(format) => onExport(format, selectedIds)}
              variant="outline"
              size="sm"
              disabled={loading || selectedCount === 0}
              loading={loading}
            />
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onGeneratePDFs(selectedIds)}
              aria-label={`Generate PDFs for ${selectedCount} selected invoices`}
              className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
              disabled={loading}
            >
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">PDFs</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onSendEmails(selectedIds)}
              aria-label={`Send emails for ${selectedCount} selected invoices`}
              className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
              disabled={loading}
            >
              <Mail className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Email</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onUpdateStatus(selectedIds)}
              aria-label={`Update status for ${selectedCount} selected invoices`}
              className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
              disabled={loading}
            >
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Status</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onBulkEdit(selectedIds)}
              aria-label={`Edit ${selectedCount} selected invoices`}
              className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
              disabled={loading}
            >
              <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => onBulkDelete(selectedIds)}
              aria-label={`Delete ${selectedCount} selected invoices`}
              className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
              disabled={loading}
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost"
              onClick={onClearSelection}
              aria-label={`Clear selection of ${selectedCount} invoices`}
              className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-2"
              disabled={loading}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}