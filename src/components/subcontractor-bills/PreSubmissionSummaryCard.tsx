import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatting';
import { formatDate } from '@/lib/utils/date';

interface PreSubmissionSummaryCardProps {
  totalAmount: number;
  workOrderCount: number;
  billDate: Date | null;
  dueDate: Date | null;
}

export const PreSubmissionSummaryCard: React.FC<PreSubmissionSummaryCardProps> = ({
  totalAmount,
  workOrderCount,
  billDate,
  dueDate,
}) => {
  return (
    <Card className="border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/30">
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">Total Bill Amount</p>
          <p className="text-3xl font-bold text-green-700 dark:text-green-400">
            {formatCurrency(totalAmount)}
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Work Orders</p>
            <p className="font-semibold">{workOrderCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bill Date</p>
            <p className="font-semibold">{billDate ? formatDate(billDate) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due Date</p>
            <p className="font-semibold">{dueDate ? formatDate(dueDate) : '—'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};