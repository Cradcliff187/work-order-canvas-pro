
import { LayoutGrid, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  view: 'card' | 'table';
  onViewChange: (view: 'card' | 'table') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border rounded-lg p-1">
      <Button
        variant={view === 'card' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('card')}
        className="h-8 px-3"
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        Cards
      </Button>
      <Button
        variant={view === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('table')}
        className="h-8 px-3"
      >
        <Table className="h-4 w-4 mr-2" />
        Table
      </Button>
    </div>
  );
}
