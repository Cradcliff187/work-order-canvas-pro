import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Receipt, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ReceiptAttachment {
  receipt_id: string;
  allocated_amount: number;
}

interface ReceiptData {
  id: string;
  vendor_name: string;
  amount: number;
  receipt_date: string;
  description?: string;
  employee_user_id: string;
  receipt_work_orders: {
    allocated_amount: number;
  }[];
}

interface ReceiptSelectorProps {
  receipts: ReceiptData[];
  selectedEmployee?: string;
  attachments: ReceiptAttachment[];
  onAttachmentsChange: (attachments: ReceiptAttachment[]) => void;
  disabled?: boolean;
}

export function ReceiptSelector({
  receipts,
  selectedEmployee,
  attachments,
  onAttachmentsChange,
  disabled = false,
}: ReceiptSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter receipts by employee and availability
  const availableReceipts = useMemo(() => {
    if (!selectedEmployee) return [];
    
    return receipts.filter(receipt => {
      // Only show receipts for selected employee
      if (receipt.employee_user_id !== selectedEmployee) return false;
      
      // Check if receipt has been fully allocated
      const totalAllocated = receipt.receipt_work_orders.reduce(
        (sum, allocation) => sum + allocation.allocated_amount,
        0
      );
      const hasAvailableAmount = receipt.amount > totalAllocated;
      
      // Include if receipt has available amount or is already in attachments
      return hasAvailableAmount || attachments.some(a => a.receipt_id === receipt.id);
    });
  }, [receipts, selectedEmployee, attachments]);

  // Filter by search term
  const filteredReceipts = useMemo(() => {
    if (!searchTerm.trim()) return availableReceipts;
    
    const term = searchTerm.toLowerCase();
    return availableReceipts.filter(receipt =>
      receipt.vendor_name.toLowerCase().includes(term) ||
      receipt.description?.toLowerCase().includes(term)
    );
  }, [availableReceipts, searchTerm]);

  const handleReceiptToggle = (receipt: ReceiptData, checked: boolean) => {
    if (checked) {
      // Calculate available amount
      const totalAllocated = receipt.receipt_work_orders.reduce(
        (sum, allocation) => sum + allocation.allocated_amount,
        0
      );
      const availableAmount = receipt.amount - totalAllocated;
      
      const newAttachment: ReceiptAttachment = {
        receipt_id: receipt.id,
        allocated_amount: availableAmount,
      };
      
      onAttachmentsChange([...attachments, newAttachment]);
    } else {
      onAttachmentsChange(attachments.filter(a => a.receipt_id !== receipt.id));
    }
  };

  const handleAmountChange = (receiptId: string, amount: number) => {
    const updatedAttachments = attachments.map(attachment =>
      attachment.receipt_id === receiptId
        ? { ...attachment, allocated_amount: amount }
        : attachment
    );
    onAttachmentsChange(updatedAttachments);
  };

  const totalMaterialsCost = attachments.reduce(
    (sum, attachment) => sum + attachment.allocated_amount,
    0
  );

  const getAvailableAmount = (receipt: ReceiptData) => {
    const totalAllocated = receipt.receipt_work_orders.reduce(
      (sum, allocation) => sum + allocation.allocated_amount,
      0
    );
    return receipt.amount - totalAllocated;
  };

  if (!selectedEmployee) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Attach Receipts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select an employee first to view their available receipts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Attach Receipts
          {attachments.length > 0 && (
            <Badge variant="secondary">
              {attachments.length} selected
            </Badge>
          )}
        </CardTitle>
        {totalMaterialsCost > 0 && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-600 font-medium">
              Total Materials Cost: ${totalMaterialsCost.toFixed(2)}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search receipts by vendor or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            disabled={disabled}
          />
        </div>

        {/* Receipts List */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {filteredReceipts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {availableReceipts.length === 0 
                  ? "No receipts available for this employee"
                  : "No receipts match your search"
                }
              </div>
            ) : (
              filteredReceipts.map((receipt) => {
                const isSelected = attachments.some(a => a.receipt_id === receipt.id);
                const attachment = attachments.find(a => a.receipt_id === receipt.id);
                const availableAmount = getAvailableAmount(receipt);

                return (
                  <div
                    key={receipt.id}
                    className={`border rounded-lg p-4 space-y-3 ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    {/* Receipt Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => 
                            handleReceiptToggle(receipt, checked as boolean)
                          }
                          disabled={disabled}
                          className="mt-0.5"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{receipt.vendor_name}</span>
                            <Badge variant="outline" className="text-xs">
                              ${receipt.amount.toFixed(2)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(receipt.receipt_date), 'MMM d, yyyy')}
                            </div>
                            <span>Available: ${availableAmount.toFixed(2)}</span>
                          </div>
                          {receipt.description && (
                            <p className="text-sm text-muted-foreground">
                              {receipt.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Allocation Amount Input */}
                    {isSelected && attachment && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <Label htmlFor={`amount-${receipt.id}`} className="text-sm">
                            Allocation Amount
                          </Label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                              <Input
                                id={`amount-${receipt.id}`}
                                type="number"
                                min="0"
                                max={availableAmount}
                                step="0.01"
                                value={attachment.allocated_amount}
                                onChange={(e) => handleAmountChange(
                                  receipt.id,
                                  parseFloat(e.target.value) || 0
                                )}
                                className="pl-10"
                                disabled={disabled}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAmountChange(receipt.id, availableAmount)}
                              disabled={disabled}
                            >
                              Max
                            </Button>
                          </div>
                          {attachment.allocated_amount > availableAmount && (
                            <p className="text-sm text-destructive">
                              Amount exceeds available: ${availableAmount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}