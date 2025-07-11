import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, FileText, DollarSign } from 'lucide-react';

interface WorkOrderSummary {
  id: string;
  work_order_number: string;
  amount: number;
}

interface InvoiceTotalSummaryProps {
  selectedWorkOrders: WorkOrderSummary[];
  totalAmount: number;
  suggestedTotal?: number;
}

export const InvoiceTotalSummary: React.FC<InvoiceTotalSummaryProps> = ({
  selectedWorkOrders,
  totalAmount,
  suggestedTotal = 0,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const variance = suggestedTotal > 0 ? ((totalAmount - suggestedTotal) / suggestedTotal) * 100 : 0;

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4" />
          Invoice Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Work Orders List */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Selected Work Orders ({selectedWorkOrders.length})
          </div>
          
          {selectedWorkOrders.length === 0 ? (
            <div className="text-sm text-muted-foreground italic py-2">
              No work orders selected
            </div>
          ) : (
            <div className="space-y-1">
              {selectedWorkOrders.map((workOrder) => (
                <div key={workOrder.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{workOrder.work_order_number}</span>
                  <span className="font-medium">{formatCurrency(workOrder.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Total Calculation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-base font-semibold">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Amount
            </div>
            <span className="text-lg">{formatCurrency(totalAmount)}</span>
          </div>

          {/* Variance Analysis */}
          {suggestedTotal > 0 && totalAmount > 0 && (
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Suggested Total:</span>
                <span>{formatCurrency(suggestedTotal)}</span>
              </div>
              
              {Math.abs(variance) > 5 && (
                <div className={`text-center p-2 rounded-md ${
                  Math.abs(variance) > 15 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                }`}>
                  {variance > 0 ? '↗️' : '↘️'} {Math.abs(variance).toFixed(1)}% {variance > 0 ? 'above' : 'below'} suggested amount
                </div>
              )}
              
              {Math.abs(variance) <= 5 && (
                <div className="text-center p-2 rounded-md bg-green-50 text-green-700 border border-green-200">
                  ✓ Amount aligns with work reports
                </div>
              )}
            </div>
          )}

          {/* Validation Messages */}
          {selectedWorkOrders.length > 0 && totalAmount <= 0 && (
            <div className="text-center p-2 rounded-md bg-red-50 text-red-700 border border-red-200 text-xs">
              Please enter amounts for all selected work orders
            </div>
          )}
          
          {selectedWorkOrders.length === 0 && (
            <div className="text-center p-2 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs">
              Select work orders to include in this invoice
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};