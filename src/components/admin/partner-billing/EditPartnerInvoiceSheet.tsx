import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { formatCurrency } from '@/utils/formatting';

interface PartnerInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  status: string;
  qb_invoice_number?: string | null;
  work_orders?: Array<{
    id: string;
    work_order_id: string;
    amount: number;
    description?: string;
    work_order?: {
      work_order_number: string;
      title: string;
    };
  }>;
}

interface EditPartnerInvoiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: PartnerInvoice | null;
  onSaved?: () => void;
}

export const EditPartnerInvoiceSheet: React.FC<EditPartnerInvoiceSheetProps> = ({ open, onOpenChange, invoice, onSaved }) => {
  const { toast } = useToast();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [qbInvoiceNumber, setQbInvoiceNumber] = useState('');
  const [status, setStatus] = useState('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [workOrders, setWorkOrders] = useState<Array<{
    id: string;
    work_order_id: string;
    amount: number;
    description?: string;
    work_order?: {
      work_order_number: string;
      title: string;
    };
  }>>([]);

  useEffect(() => {
    if (!invoice) return;
    setInvoiceNumber(invoice.invoice_number || '');
    setInvoiceDate(invoice.invoice_date ? new Date(invoice.invoice_date).toISOString().slice(0, 10) : '');
    setDueDate(invoice.due_date ? new Date(invoice.due_date).toISOString().slice(0, 10) : '');
    setQbInvoiceNumber(invoice.qb_invoice_number || '');
    setStatus(invoice.status || 'draft');
    setWorkOrders(invoice.work_orders || []);
  }, [invoice]);

  const handleSave = async () => {
    if (!invoice) return;
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('partner_invoices')
        .update({
          invoice_number: invoiceNumber || null,
          invoice_date: invoiceDate ? new Date(invoiceDate).toISOString() : null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          qb_invoice_number: qbInvoiceNumber || null,
          status,
        })
        .eq('id', invoice.id);
      if (error) throw error;

      toast({ title: 'Partner invoice updated' });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error('Failed to update partner invoice', e);
      toast({ title: 'Failed to update partner invoice', description: e?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Partner Invoice</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice_number">Invoice Number</Label>
            <Input id="invoice_number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qb_invoice_number">QB Invoice #</Label>
            <Input id="qb_invoice_number" value={qbInvoiceNumber} onChange={(e) => setQbInvoiceNumber(e.target.value)} placeholder="Optional QuickBooks invoice number" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date</Label>
              <Input id="invoice_date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select status">
                  <div className="flex items-center gap-2">
                    <InvoiceStatusBadge status={status} showIcon size="sm" />
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  <div className="flex items-center gap-2">
                    <InvoiceStatusBadge status="draft" showIcon size="sm" />
                  </div>
                </SelectItem>
                <SelectItem value="sent">
                  <div className="flex items-center gap-2">
                    <InvoiceStatusBadge status="sent" showIcon size="sm" />
                  </div>
                </SelectItem>
                <SelectItem value="paid">
                  <div className="flex items-center gap-2">
                    <InvoiceStatusBadge status="paid" showIcon size="sm" />
                  </div>
                </SelectItem>
                <SelectItem value="overdue">
                  <div className="flex items-center gap-2">
                    <InvoiceStatusBadge status="overdue" showIcon size="sm" />
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <InvoiceStatusBadge status="cancelled" showIcon size="sm" />
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {workOrders.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Associated Work Orders</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {workOrders.map((wo) => (
                    <div key={wo.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-medium">
                          {wo.work_order?.work_order_number}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {wo.work_order?.title}
                        </div>
                        {wo.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {wo.description}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <Badge variant="secondary" className="font-mono">
                          {formatCurrency(wo.amount)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Work order associations are managed when generating invoices.
                </div>
              </div>
            </>
          )}
        </div>
        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
