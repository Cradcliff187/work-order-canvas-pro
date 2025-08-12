
import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Invoice } from '@/hooks/useInvoices';

interface EditInvoiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSaved?: () => void;
}

export const EditInvoiceSheet: React.FC<EditInvoiceSheetProps> = ({ open, onOpenChange, invoice, onSaved }) => {
  const { toast } = useToast();
  const [externalInvoiceNumber, setExternalInvoiceNumber] = useState('');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [subcontractorNotes, setSubcontractorNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [paidAt, setPaidAt] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    setExternalInvoiceNumber(invoice.external_invoice_number || '');
    setPurchaseOrderNumber((invoice as any).purchase_order_number || '');
    setPaymentTerms((invoice as any).payment_terms || 'Net 30');
    setSubcontractorNotes((invoice as any).subcontractor_notes || '');
    setAdminNotes(invoice.admin_notes || '');
    setPaymentReference(invoice.payment_reference || '');
    setInvoiceDate((invoice as any).invoice_date ? new Date((invoice as any).invoice_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setDueDate((invoice as any).due_date ? new Date((invoice as any).due_date).toISOString().slice(0, 10) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setPaidAt(invoice.paid_at ? new Date(invoice.paid_at).toISOString().slice(0, 10) : '');
  }, [invoice]);

  const handleSave = async () => {
    if (!invoice) return;

    // Validation: due_date >= invoice_date
    if (invoiceDate && dueDate && new Date(dueDate) < new Date(invoiceDate)) {
      toast({ title: 'Invalid dates', description: 'Due date must be on or after the invoice date.', variant: 'destructive' });
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        external_invoice_number: externalInvoiceNumber || null,
        purchase_order_number: purchaseOrderNumber || null,
        payment_terms: paymentTerms || 'Net 30',
        subcontractor_notes: subcontractorNotes || null,
        admin_notes: adminNotes || null,
        payment_reference: paymentReference || null,
        invoice_date: invoiceDate || null,
        due_date: dueDate || null,
      };
      if (paidAt) {
        payload.paid_at = new Date(paidAt).toISOString();
      } else {
        payload.paid_at = null;
      }

      const { error } = await supabase
        .from('invoices')
        .update(payload)
        .eq('id', invoice.id);
      if (error) throw error;

      toast({ title: 'Invoice updated' });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error('Failed to update invoice', e);
      toast({ title: 'Failed to update invoice', description: e?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Invoice</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="external_invoice_number">Vendor Invoice #</Label>
            <Input id="external_invoice_number" value={externalInvoiceNumber} onChange={(e) => setExternalInvoiceNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase_order_number">Purchase Order #</Label>
            <Input id="purchase_order_number" value={purchaseOrderNumber} onChange={(e) => setPurchaseOrderNumber(e.target.value)} />
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
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Input id="payment_terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Net 30" />
            <p className="text-xs text-muted-foreground">Defaults to "Net 30". Adjust if different terms apply.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subcontractor_notes">Subcontractor Notes</Label>
            <Textarea id="subcontractor_notes" value={subcontractorNotes} onChange={(e) => setSubcontractorNotes(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="payment_reference">Payment Reference</Label>
              <Input id="payment_reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid_at">Paid At</Label>
              <Input id="paid_at" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin_notes">Admin Notes</Label>
            <Textarea id="admin_notes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={4} />
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

