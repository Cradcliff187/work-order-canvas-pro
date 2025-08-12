import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, FileText, Table as TableIcon, Image, Download, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, isBefore } from 'date-fns';
import { Invoice } from '@/hooks/useInvoices';
import { useInvoiceMutations } from '@/hooks/useInvoiceMutations';
import { formatFileSize } from '@/utils/fileUtils';
import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatting';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceDetailModal({ invoice, isOpen, onClose }: InvoiceDetailModalProps) {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());

  const { approveInvoice, rejectInvoice, markAsPaid } = useInvoiceMutations();

  if (!invoice) return null;

  const handleApprove = () => {
    approveInvoice.mutate(
      { invoiceId: invoice.id, notes: approvalNotes },
      {
        onSuccess: () => {
          setApproveDialogOpen(false);
          setApprovalNotes('');
          onClose();
        },
      }
    );
  };

  const handleReject = () => {
    if (!rejectionNotes.trim()) return;
    
    rejectInvoice.mutate(
      { invoiceId: invoice.id, notes: rejectionNotes },
      {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setRejectionNotes('');
          onClose();
        },
      }
    );
  };

  const handleMarkAsPaid = () => {
    if (!paymentReference.trim()) return;
    
    markAsPaid.mutate(
      { invoiceId: invoice.id, paymentReference, paymentDate },
      {
        onSuccess: () => {
          setPaymentDialogOpen(false);
          setPaymentReference('');
          setPaymentDate(new Date());
          onClose();
        },
      }
    );
  };

  const canApprove = invoice.status === 'submitted';
  const canReject = invoice.status === 'submitted';
  const canMarkPaid = invoice.status === 'approved' && !invoice.paid_at;

  const getFileIcon = (fileType: string, fileName: string) => {
    const lowerType = fileType.toLowerCase();
    const lowerName = fileName.toLowerCase();
    
    if (lowerType.includes('image') || lowerName.match(/\.(jpg|jpeg|png|gif|webp|bmp|heic|heif)$/)) {
      return Image;
    }
    if (lowerType.includes('spreadsheet') || lowerName.match(/\.(xlsx|xls|csv)$/)) {
      return TableIcon;
    }
    return FileText;
  };

  const getFileTypeColor = (fileType: string, fileName: string) => {
    const lowerType = fileType.toLowerCase();
    const lowerName = fileName.toLowerCase();
    
    if (lowerType.includes('image') || lowerName.match(/\.(jpg|jpeg|png|gif|webp|bmp|heic|heif)$/)) {
      return 'text-green-600';
    }
    if (lowerType.includes('spreadsheet') || lowerName.match(/\.(xlsx|xls|csv)$/)) {
      return 'text-blue-600';
    }
    return 'text-gray-600';
  };

  const handleDownload = (fileUrl: string) => {
    const { data } = supabase.storage
      .from('work-order-attachments')
      .getPublicUrl(fileUrl);
    window.open(data.publicUrl, '_blank');
  };

  const invDate = (invoice as any).invoice_date ? new Date((invoice as any).invoice_date) : null;
  const dueDate = (invoice as any).due_date ? new Date((invoice as any).due_date) : null;
  const isOverdue = !!dueDate && isBefore(dueDate, new Date()) && !invoice.paid_at;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              View and manage invoice details, including approval status, payment information, and linked work orders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Internal Invoice #
                  </Label>
                  <div className="mt-1 font-mono text-lg font-semibold">
                    {invoice.internal_invoice_number}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Vendor Invoice #
                  </Label>
                  <div className="mt-1 font-mono text-lg">
                    {invoice.external_invoice_number || 'Not provided'}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Purchase Order #
                  </Label>
                  <div className="mt-1">
                    {(invoice as any).purchase_order_number || '—'}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Subcontractor
                  </Label>
                  <div className="mt-1 text-lg font-medium">
                    {invoice.subcontractor_organization.name}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Total Amount
                  </Label>
                  <div className="mt-1 text-2xl font-bold">{formatCurrency(Number(invoice.total_amount), true)}</div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Status
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <FinancialStatusBadge status={invoice.status} size="sm" showIcon />
                    {isOverdue && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Invoice Date
                    </Label>
                    <div className="mt-1">
                      {invDate ? format(invDate, 'MMM d, yyyy') : '—'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Due Date
                    </Label>
                    <div className="mt-1">
                      {dueDate ? format(dueDate, 'MMM d, yyyy') : '—'}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Submitted Date
                  </Label>
                  <div className="mt-1">
                    {invoice.submitted_at
                      ? format(new Date(invoice.submitted_at), 'MMM d, yyyy')
                      : 'Not submitted'
                    }
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Subcontractor Notes and Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Subcontractor Notes</Label>
                <div className="mt-1 p-3 bg-muted rounded-md min-h-[48px]">
                  {(invoice as any).subcontractor_notes || '—'}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Payment Terms</Label>
                <div className="mt-1">
                  {(invoice as any).payment_terms || 'Net 30'}
                </div>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-2">
              {canApprove && (
                <Button onClick={() => setApproveDialogOpen(true)}>
                  Approve Invoice
                </Button>
              )}
              {canReject && (
                <Button variant="destructive" onClick={() => setRejectDialogOpen(true)}>
                  Reject Invoice
                </Button>
              )}
              {canMarkPaid && (
                <Button variant="outline" onClick={() => setPaymentDialogOpen(true)}>
                  Mark as Paid
                </Button>
              )}
            </div>

            {/* Payment Information */}
            {(invoice.approved_at || invoice.paid_at) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Payment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {invoice.approved_at && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Approved Date
                        </Label>
                        <div className="mt-1">
                          {format(new Date(invoice.approved_at), 'PPP')}
                        </div>
                        {invoice.approved_by_user && (
                          <div className="text-sm text-muted-foreground">
                            by {invoice.approved_by_user.first_name} {invoice.approved_by_user.last_name}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {invoice.paid_at && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Paid Date
                        </Label>
                        <div className="mt-1">
                          {format(new Date(invoice.paid_at), 'PPP')}
                        </div>
                        {invoice.payment_reference && (
                          <div className="text-sm text-muted-foreground">
                            Reference: {invoice.payment_reference}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {invoice.approval_notes && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Notes
                      </Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        {invoice.approval_notes}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Attachments */}
            {(invoice as any).invoice_attachments && (invoice as any).invoice_attachments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Attachments</h3>
                  <div className="space-y-2">
                    {invoice.invoice_attachments.map((attachment) => {
                      const FileIcon = getFileIcon(attachment.file_type, attachment.file_name);
                      const iconColor = getFileTypeColor(attachment.file_type, attachment.file_name);
                      
                      return (
                        <div 
                          key={attachment.id} 
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <FileIcon className={`h-5 w-5 ${iconColor} flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {attachment.file_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {attachment.file_size ? formatFileSize(attachment.file_size) : 'Unknown size'}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(attachment.file_url)}
                            className="flex items-center space-x-1"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Work Orders */}
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Linked Work Orders</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.invoice_work_orders.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">
                        {item.work_order.work_order_number || 'N/A'}
                      </TableCell>
                      <TableCell>{item.work_order.title}</TableCell>
                      <TableCell>
                        {formatCurrency(Number(item.amount), true)}
                      </TableCell>
                      <TableCell>{item.description || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="approval-notes">Notes (optional)</Label>
            <Textarea
              id="approval-notes"
              placeholder="Add any notes about the approval..."
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={approveInvoice.isPending}>
              {approveInvoice.isPending ? 'Approving...' : 'Approve Invoice'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this invoice. This will be sent to the subcontractor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-notes">Rejection Reason *</Label>
            <Textarea
              id="rejection-notes"
              placeholder="Explain why this invoice is being rejected..."
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              className="mt-2"
              required
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject} 
              disabled={rejectInvoice.isPending || !rejectionNotes.trim()}
            >
              {rejectInvoice.isPending ? 'Rejecting...' : 'Reject Invoice'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Paid Dialog */}
      <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Invoice as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the payment reference number to mark this invoice as paid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="payment-reference">Payment Reference *</Label>
              <Input
                id="payment-reference"
                placeholder="Check number, transaction ID, etc."
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="mt-2"
                required
              />
            </div>
            
            <div>
              <Label>Payment Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(date) => date && setPaymentDate(date)}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleMarkAsPaid} 
              disabled={markAsPaid.isPending || !paymentReference.trim()}
            >
              {markAsPaid.isPending ? 'Processing...' : 'Mark as Paid'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
