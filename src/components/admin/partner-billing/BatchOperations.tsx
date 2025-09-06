import React, { useState } from 'react';
import { FileText, Mail, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePartnerInvoiceBatch } from '@/hooks/usePartnerInvoiceBatch';

interface BatchOperationsProps {
  selectedInvoices: string[];
  onClearSelection: () => void;
}

export const BatchOperations: React.FC<BatchOperationsProps> = ({
  selectedInvoices,
  onClearSelection,
}) => {
  const { batchGeneratePdf, batchSendEmails, operations, isProcessing, clearOperations } = usePartnerInvoiceBatch();

  const handleBatchPdf = () => {
    batchGeneratePdf(selectedInvoices);
  };

  const handleBatchEmail = () => {
    batchSendEmails(selectedInvoices);
  };

  const handleClear = () => {
    clearOperations();
    onClearSelection();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const completedCount = operations.filter(op => op.status === 'completed').length;
  const totalCount = operations.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Batch Operations</CardTitle>
        <CardDescription>
          {selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? 's' : ''} selected
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedInvoices.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleBatchPdf}
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate PDFs ({selectedInvoices.length})
            </Button>
            <Button
              onClick={handleBatchEmail}
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Emails ({selectedInvoices.length})
            </Button>
            <Button
              onClick={handleClear}
              variant="ghost"
              size="sm"
            >
              Clear Selection
            </Button>
          </div>
        )}

        {operations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Progress: {completedCount}/{totalCount}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="w-full" />
            
            <div className="max-h-32 overflow-y-auto space-y-1">
              {operations.map((operation) => (
                <div key={operation.invoiceId} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs truncate max-w-[200px]">
                    {operation.invoiceId}
                  </span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(operation.status)}
                    <Badge 
                      variant={
                        operation.status === 'completed' ? 'default' :
                        operation.status === 'failed' ? 'destructive' :
                        operation.status === 'processing' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {operation.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};