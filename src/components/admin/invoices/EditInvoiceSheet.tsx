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
  const [adminNotes, setAdminNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paidAt, setPaidAt] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    setExternalInvoiceNumber(invoice.external_invoice_number || '');
    setAdminNotes(invoice.admin_notes || '');
    setPaymentReference(invoice.payment_reference || '');
    setPaidAt(invoice.paid_at ? new Date(invoice.paid_at).toISOString().slice(0, 10) : '');
  }, [invoice]);

  const handleSave = async () => {
    if (!invoice) return;
    try {
      setIsSaving(true);
      const payload: any = {
        external_invoice_number: externalInvoiceNumber || null,
        admin_notes: adminNotes || null,
        payment_reference: paymentReference || null,
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
            <Label htmlFor="admin_notes">Admin Notes</Label>
            <Textarea id="admin_notes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={4} />
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
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
