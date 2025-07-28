
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Building2, Download, Archive, Trash2, X } from 'lucide-react';
import { Organization } from '@/hooks/useOrganizations';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  selectedOrganizations: Organization[];
  onClearSelection: () => void;
  onExport: (ids: string[]) => void;
  onBulkDeactivate: (organizations: Organization[]) => void;
  onBulkDelete: (organizations: Organization[]) => void;
}

export function BulkActionsBar({ 
  selectedCount, 
  selectedIds, 
  selectedOrganizations, 
  onClearSelection, 
  onExport, 
  onBulkDeactivate, 
  onBulkDelete 
}: BulkActionsBarProps) {
  const handleExport = () => {
    onExport(selectedIds);
  };

  const handleBulkDeactivate = () => {
    onBulkDeactivate(selectedOrganizations);
  };

  const handleBulkDelete = () => {
    onBulkDelete(selectedOrganizations);
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-4 min-w-[500px]">
        <Badge variant="secondary" className="h-5 text-[10px] px-1.5 flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {selectedCount} selected
        </Badge>

        <Separator orientation="vertical" className="h-6" />

        {/* Export */}
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Selected
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Deactivate */}
        <Button size="sm" variant="outline" onClick={handleBulkDeactivate}>
          <Archive className="h-4 w-4 mr-2" />
          Deactivate Selected
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Delete */}
        <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Selected
        </Button>

        {/* Clear Selection */}
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
