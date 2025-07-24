import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calculator, Clock, FileText, DollarSign } from 'lucide-react';

interface WorkOrderAmountCardProps {
  workOrder: {
    id: string;
    work_order_number: string;
    title: string;
    description?: string;
    completed_at?: string;
    work_order_reports?: Array<{
      work_performed: string;
      materials_used?: string;
      hours_worked?: number;
      invoice_amount?: number;
      status: string;
    }>;
  };
  isSelected: boolean;
  amount: number;
  onSelectionChange: (checked: boolean) => void;
  onAmountChange: (amount: number) => void;
  showWorkSummary?: boolean;
}

export const WorkOrderAmountCard: React.FC<WorkOrderAmountCardProps> = ({
  workOrder,
  isSelected,
  amount,
  onSelectionChange,
  onAmountChange,
  showWorkSummary = true,
}) => {
  const approvedReport = workOrder.work_order_reports?.find(report => report.status === 'approved');
  const suggestedAmount = approvedReport?.invoice_amount || 0;
  
  const handleUseSuggestedAmount = () => {
    onAmountChange(suggestedAmount);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectionChange}
            className="mt-1"
          />
          
          <div className="flex-1 space-y-3">
            {/* Work Order Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{workOrder.work_order_number}</div>
                {workOrder.completed_at && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(workOrder.completed_at), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
              <div className="text-sm font-medium">{workOrder.title}</div>
              {workOrder.description && (
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {workOrder.description}
                </div>
              )}
            </div>

            {/* Work Summary */}
            {showWorkSummary && approvedReport && (
              <>
                <Separator />
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-1 font-medium text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    Work Summary
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>
                      <span className="font-medium">Work Performed:</span>{' '}
                      <span className="line-clamp-2">{approvedReport.work_performed}</span>
                    </div>
                    {approvedReport.materials_used && (
                      <div>
                        <span className="font-medium">Materials:</span>{' '}
                        <span className="line-clamp-1">{approvedReport.materials_used}</span>
                      </div>
                    )}
                    {approvedReport.hours_worked && (
                      <div>
                        <span className="font-medium">Hours:</span> {approvedReport.hours_worked}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Amount Input Section */}
            {isSelected && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Invoice Amount</Label>
                    {suggestedAmount > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Suggested: {formatCurrency(suggestedAmount)}
                        </Badge>
                        {amount !== suggestedAmount && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleUseSuggestedAmount}
                            className="h-6 px-2 text-xs"
                          >
                            <Calculator className="h-3 w-3 mr-1" />
                            Use
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={amount || ''}
                        onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  {/* Amount Validation Feedback */}
                  <div className="text-xs space-y-1">
                    {amount > 0 && suggestedAmount > 0 && (
                      <div className={`flex items-center gap-1 ${
                        Math.abs(amount - suggestedAmount) > suggestedAmount * 0.1 
                          ? 'text-orange-600' 
                          : 'text-green-600'
                      }`}>
                        {amount > suggestedAmount * 1.1 ? (
                          <span>⚠️ Amount is {Math.round(((amount - suggestedAmount) / suggestedAmount) * 100)}% higher than reported</span>
                        ) : amount < suggestedAmount * 0.9 ? (
                          <span>⚠️ Amount is {Math.round(((suggestedAmount - amount) / suggestedAmount) * 100)}% lower than reported</span>
                        ) : (
                          <span>✓ Amount matches work report</span>
                        )}
                      </div>
                    )}
                    {amount <= 0 && (
                      <div className="text-red-600">Amount must be greater than 0</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};