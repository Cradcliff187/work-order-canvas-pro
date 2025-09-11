import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Receipt, Plus, DollarSign } from 'lucide-react';
import { ReceiptSelector } from './ReceiptSelector';

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

interface ReceiptAttachmentSectionProps {
  receipts: ReceiptData[];
  selectedEmployee?: string;
  attachments: ReceiptAttachment[];
  onAttachmentsChange: (attachments: ReceiptAttachment[]) => void;
  onMaterialsCostUpdate: (cost: number) => void;
  disabled?: boolean;
  className?: string;
}

export function ReceiptAttachmentSection({
  receipts,
  selectedEmployee,
  attachments,
  onAttachmentsChange,
  onMaterialsCostUpdate,
  disabled = false,
  className,
}: ReceiptAttachmentSectionProps) {
  const [enableReceiptAttachment, setEnableReceiptAttachment] = useState(false);

  // Calculate total materials cost from attachments
  const totalMaterialsCost = attachments.reduce(
    (sum, attachment) => sum + attachment.allocated_amount,
    0
  );

  // Update parent component when materials cost changes
  React.useEffect(() => {
    if (enableReceiptAttachment) {
      onMaterialsCostUpdate(totalMaterialsCost);
    }
  }, [totalMaterialsCost, enableReceiptAttachment, onMaterialsCostUpdate]);

  const handleToggleReceiptAttachment = (enabled: boolean) => {
    setEnableReceiptAttachment(enabled);
    if (!enabled) {
      onAttachmentsChange([]);
      onMaterialsCostUpdate(0);
    }
  };

  const handleClearAttachments = () => {
    onAttachmentsChange([]);
    onMaterialsCostUpdate(0);
  };

  return (
    <div className={className}>
      {/* Toggle Switch */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Link Receipts to Time Entry
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-receipts"
                checked={enableReceiptAttachment}
                onCheckedChange={handleToggleReceiptAttachment}
                disabled={disabled}
              />
              <Label htmlFor="enable-receipts">Enable</Label>
            </div>
          </div>
          {enableReceiptAttachment && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-muted-foreground">
                Select existing receipts to link to this time entry
              </p>
              {totalMaterialsCost > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${totalMaterialsCost.toFixed(2)}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAttachments}
                    disabled={disabled}
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        
        {enableReceiptAttachment && (
          <CardContent>
            <Tabs defaultValue="existing" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Select Existing</TabsTrigger>
                <TabsTrigger value="upload" disabled>
                  <Plus className="h-4 w-4 mr-1" />
                  Upload New
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="existing" className="mt-4">
                <ReceiptSelector
                  receipts={receipts}
                  selectedEmployee={selectedEmployee}
                  attachments={attachments}
                  onAttachmentsChange={onAttachmentsChange}
                  disabled={disabled}
                />
              </TabsContent>
              
              <TabsContent value="upload" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>Upload new receipts functionality coming soon</p>
                      <p className="text-sm">For now, please use the existing receipt upload page</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </div>
  );
}