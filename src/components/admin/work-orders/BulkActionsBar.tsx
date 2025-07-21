
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Users, X } from 'lucide-react';

export interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onExport: (ids: string[]) => void;
  onBulkAssign: (ids: string[]) => void;
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onExport,
  onBulkAssign,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 shadow-lg">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedCount} work order{selectedCount === 1 ? '' : 's'} selected
          </span>
          
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onExport(selectedIds)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onBulkAssign(selectedIds)}
            >
              <Users className="h-4 w-4 mr-2" />
              Assign
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost"
              onClick={onClearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
