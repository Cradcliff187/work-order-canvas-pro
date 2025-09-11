import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCheck, Download, Trash2, Flag, XCircle } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onAction: (action: string) => void;
}

export function BulkActionsBar({ selectedCount, onAction }: BulkActionsBarProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? 'entry' : 'entries'} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('approve')}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('reject')}
            className="text-red-600 hover:text-red-600"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('flag')}
          >
            <Flag className="h-4 w-4 mr-2" />
            Flag for Review
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('export')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('delete')}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}