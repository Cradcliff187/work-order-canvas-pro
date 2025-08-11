import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PartnerInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  status: string;
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
  const [status, setStatus] = useState('draft');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    setInvoiceNumber(invoice.invoice_number || '');
    setInvoiceDate(invoice.invoice_date ? new Date(invoice.invoice_date).toISOString().slice(0, 10) : '');
    setDueDate(invoice.due_date ? new Date(invoice.due_date).toISOString().slice(0, 10) : '');
    setStatus(invoice.status || 'draft');
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
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
