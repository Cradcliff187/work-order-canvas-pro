import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FieldGroup } from "./FieldGroup";
import { List, Plus, Calculator } from "lucide-react";

interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
}

interface OCRResult {
  vendor: string;
  total: number;
  date: string;
  confidence: {
    vendor: number;
    total: number;
    lineItems: number;
    date: number;
  };
  subtotal?: number;
  tax?: number;
  lineItems: LineItem[];
}

interface SmartReceiptFormData {
  vendor_name: string;
  amount: number;
  description?: string;
  receipt_date: string;
  notes?: string;
  work_order_id?: string;
}

interface LineItemsDisplayProps {
  ocrData: OCRResult;
  ocrConfidence: Record<string, number>;
  onUpdateOCRData: (newData: OCRResult, confidence: Record<string, number>) => void;
  form: UseFormReturn<SmartReceiptFormData>;
}

export const LineItemsDisplay: React.FC<LineItemsDisplayProps> = ({
  ocrData,
  ocrConfidence,
  onUpdateOCRData,
  form
}) => {
  const { toast } = useToast();

  const handleAddItem = () => {
    const item = prompt('Enter item description:');
    const price = prompt('Enter price:');
    if (item && price) {
      const newLineItem: LineItem = {
        description: item,
        total_price: parseFloat(price)
      };
      onUpdateOCRData({
        ...ocrData,
        lineItems: [...ocrData.lineItems, newLineItem]
      }, ocrConfidence);
    }
  };

  const handleRecalculate = () => {
    if (ocrData?.subtotal && ocrData?.tax) {
      const correct = ocrData.subtotal + ocrData.tax;
      form.setValue('amount', correct, { shouldValidate: true });
      onUpdateOCRData({
        ...ocrData,
        total: correct
      }, ocrConfidence);
      toast({
        title: 'Total Recalculated',
        description: `New total: $${correct.toFixed(2)}`,
      });
    }
  };

  if (!ocrData?.lineItems || ocrData.lineItems.length === 0) {
    return null;
  }

  return (
    <FieldGroup
      title="Line Items"
      icon={<List className="h-4 w-4" />}
      badge={
        <Badge variant="secondary" className="ml-2">
          {ocrData.lineItems.length} items
        </Badge>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
          <span>Description</span>
          <span>Quantity × Price</span>
          <span className="text-right">Total</span>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {ocrData.lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-3 gap-4 text-sm p-2 bg-muted rounded">
              <span className="font-medium">{item.description}</span>
              <span className="text-muted-foreground">
                {item.quantity && item.unit_price 
                  ? `${item.quantity} × $${item.unit_price.toFixed(2)}`
                  : 'N/A'
                }
              </span>
              <span className="text-right font-medium">
                ${item.total_price?.toFixed(2) || 'N/A'}
              </span>
            </div>
          ))}
        </div>
        
        {(ocrData.subtotal || ocrData.tax || ocrData.total) && (
          <div className="border-t pt-4 space-y-2">
            {ocrData.subtotal && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${ocrData.subtotal.toFixed(2)}</span>
              </div>
            )}
            {ocrData.tax && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span>${ocrData.tax.toFixed(2)}</span>
              </div>
            )}
            {ocrData.total && (
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Total:</span>
                <span>${ocrData.total.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Quick correction buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Item
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
          >
            <Calculator className="h-3 w-3 mr-1" />
            Recalculate
          </Button>
        </div>
      </div>
    </FieldGroup>
  );
};