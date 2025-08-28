import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Trash2, X } from 'lucide-react';
import { ExportDropdown } from '@/components/ui/export-dropdown';

export interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onExport: (format: 'csv' | 'excel', ids: string[]) => void;
  onBulkStatusChange: (status: 'active' | 'inactive', ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
  loading?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onExport,
  onBulkStatusChange,
  onBulkDelete,
  loading = false,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card 
      className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-45 shadow-lg mx-4 sm:mx-6 w-auto max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)]" 
      role="toolbar" 
      aria-label="Bulk actions for selected partner locations"
    >
      <CardContent className="py-2 sm:py-3 px-3 sm:px-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm font-medium text-center sm:text-left" aria-live="polite">
            {selectedCount} location{selectedCount === 1 ? '' : 's'} selected
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
              onClick={() => onBulkStatusChange('active', selectedIds)}
              disabled={loading}
              aria-label={`Set ${selectedCount} selected locations to active`}
              className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
            >
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Set Active</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onBulkStatusChange('inactive', selectedIds)}
              disabled={loading}
              aria-label={`Set ${selectedCount} selected locations to inactive`}
              className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
            >
              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Set Inactive</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => onBulkDelete(selectedIds)}
              disabled={loading}
              aria-label={`Delete ${selectedCount} selected locations`}
              className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost"
              onClick={onClearSelection}
              disabled={loading}
              aria-label={`Clear selection of ${selectedCount} locations`}
              className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-2"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}