
import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, UserPlus, Trash2, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onBulkAssign: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
  onExport: (ids: string[]) => void;
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onBulkAssign,
  onBulkDelete,
  onExport,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-4 min-w-[500px]">
        <Badge variant="secondary" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {selectedCount} selected
        </Badge>

        <Separator orientation="vertical" className="h-6" />

        <Button size="sm" variant="outline" onClick={() => onExport(selectedIds)}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button size="sm" variant="outline" onClick={() => onBulkAssign(selectedIds)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Assign
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button size="sm" variant="destructive" onClick={() => onBulkDelete(selectedIds)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>

        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
