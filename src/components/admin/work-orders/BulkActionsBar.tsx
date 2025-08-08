
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, X, Edit } from 'lucide-react';
import { ExportDropdown } from '@/components/ui/export-dropdown';

export interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onExport: (format: 'csv' | 'excel', ids: string[]) => void;
  onBulkAssign: (ids: string[]) => void;
  onBulkEdit: (ids: string[]) => void;
  loading?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onExport,
  onBulkAssign,
  onBulkEdit,
  loading = false,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card 
      className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-45 shadow-lg mx-4 sm:mx-6 w-auto max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)]" 
      role="toolbar" 
      aria-label="Bulk actions for selected work orders"
    >
      <CardContent className="py-2 sm:py-3 px-3 sm:px-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm font-medium text-center sm:text-left" aria-live="polite">
            {selectedCount} work order{selectedCount === 1 ? '' : 's'} selected
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
              onClick={() => onBulkEdit(selectedIds)}
              aria-label={`Edit ${selectedCount} selected work orders`}
              className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onBulkAssign(selectedIds)}
              aria-label={`Assign ${selectedCount} selected work orders`}
              className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Assign</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost"
              onClick={onClearSelection}
              aria-label={`Clear selection of ${selectedCount} work orders`}
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
