import React, { useState, useEffect } from 'react';
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
import { CalendarIcon, FileText, Table as TableIcon, Image, Download, ExternalLink, AlertTriangle, Loader2, Trash2, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttachmentGrid, type AttachmentItem as GridAttachmentItem } from '@/components/work-orders/shared/AttachmentGrid';
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
import { SubcontractorBill } from '@/hooks/useSubcontractorBills';
import { useSubcontractorBillMutations } from '@/hooks/useSubcontractorBillMutations';

import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatting';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UniversalUploadSheet } from '@/components/upload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useToast } from '@/hooks/use-toast';
import { isImageFile } from '@/utils/fileUtils';
import { ImageLightbox } from '@/components/work-orders/shared/ImageLightbox';

interface InvoiceDetailModalProps {
  invoice: SubcontractorBill | null;
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

  // Image lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxItems, setLightboxItems] = useState<GridAttachmentItem[]>([]);

  // Attachments state and upload helpers
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const { toast } = useToast();
  const { uploadFiles, removeFile, isUploading } = useFileUpload({
    context: 'invoice',
    onComplete: () => {
      // We'll refresh explicitly after uploads complete
    },
    onError: (err) => toast({ title: 'Upload failed', description: err, variant: 'destructive' })
  });

  const refreshAttachments = async () => {
    if (!invoice) return;
    const { data, error } = await supabase
      .from('subcontractor_bill_attachments')
      .select('id, file_name, file_url, file_type, file_size, created_at, work_order_id')
      .eq('subcontractor_bill_id', invoice.id)
      .order('created_at', { ascending: false });
    if (!error) setAttachments(data || []);
  };

  useEffect(() => {
    if (!invoice) return;
    setAttachments((invoice as any).subcontractor_bill_attachments || []);
    const def = invoice.subcontractor_bill_work_orders?.[0]?.work_order_id || null;
    setSelectedWorkOrderId(def);
    // Refresh attachments to ensure we have full data
    refreshAttachments();
  }, [invoice]);

  const handleFilesSelected = async (files: File[]) => {
    if (!selectedWorkOrderId) {
      toast({ title: 'Select a work order', description: 'Link uploads to a work order first.' });
      return;
    }
    await uploadFiles(files, false, selectedWorkOrderId, undefined, invoice?.id);
    await refreshAttachments();
  };

  const handleRemoveAttachment = async (id: string) => {
    await removeFile(id);
    await refreshAttachments();
  };

  const { approveSubcontractorBill, rejectSubcontractorBill, markAsPaid } = useSubcontractorBillMutations();

  if (!invoice) return null;

  const handleApprove = () => {
    approveSubcontractorBill.mutate(
      { billId: invoice.id, notes: approvalNotes },
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
    
    rejectSubcontractorBill.mutate(
      { billId: invoice.id, notes: rejectionNotes },
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
      { billId: invoice.id, paymentReference, paymentDate },
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

  const handleAttachmentView = (list: GridAttachmentItem[]) => (a: GridAttachmentItem) => {
    if (isImageFile(a.file_name, a.file_type)) {
      const images = list.filter((x) => isImageFile(x.file_name, x.file_type));
      const start = images.findIndex((x) => x.id === a.id);
      setLightboxItems(images);
      setLightboxIndex(start >= 0 ? start : 0);
      setLightboxOpen(true);
    } else {
      handleDownload(a.file_url);
    }
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
                    {invoice.internal_bill_number}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Vendor Invoice #
                  </Label>
                  <div className="mt-1 font-mono text-lg">
                    {invoice.external_bill_number || 'Not provided'}
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
                        {(invoice as any).approved_by && (
                          <div className="text-sm text-muted-foreground">
                            by {(invoice as any).approved_by.first_name} {(invoice as any).approved_by.last_name}
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
            <Separator />
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h3 className="text-lg font-semibold">
                  Attachments
                  <Badge variant="secondary" className="ml-2">{attachments.length}</Badge>
                </h3>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {invoice.subcontractor_bill_work_orders.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">Link to</Label>
                        <Select value={selectedWorkOrderId ?? ''} onValueChange={(v) => setSelectedWorkOrderId(v)}>
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Select work order" />
                          </SelectTrigger>
                          <SelectContent>
                            {invoice.subcontractor_bill_work_orders.map((iwo) => (
                              <SelectItem key={iwo.work_order_id} value={iwo.work_order_id}>
                                {iwo.work_orders.work_order_number || iwo.work_orders.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <UniversalUploadSheet
                        onFilesSelected={handleFilesSelected}
                        context="invoice"
                        trigger={
                          <Button disabled={!selectedWorkOrderId || isUploading} aria-label="Upload files">
                            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Paperclip className="h-4 w-4 mr-2" />}
                            Upload files
                          </Button>
                        }
                      />
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Link at least one work order to enable uploads.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {(() => {
                  const workOrders = invoice.subcontractor_bill_work_orders || [];
                  const mapToItems = (list: any[]): GridAttachmentItem[] =>
                    list.map((att: any) => ({
                      id: att.id,
                      file_name: att.file_name,
                      file_url: att.file_url,
                      file_type: att.file_type === 'photo' ? 'photo' : 'document',
                      file_size: att.file_size || 0,
                      uploaded_at: att.created_at || new Date().toISOString(),
                      uploader_name: '',
                      uploader_email: '',
                      is_internal: (att as any).is_internal || false,
                    }));

                  const perGroup = workOrders.map((iwo: any) => {
                    const items = mapToItems(attachments.filter((a) => a.work_order_id === iwo.work_order_id));
                    return {
                      key: iwo.work_order_id,
                      label: iwo.work_orders.work_order_number || 'WO',
                      count: items.length,
                      items,
                    };
                  });

                  const allItems = mapToItems(attachments);

                  return (
                    <Tabs defaultValue="all" className="w-full">
                      <TabsList className="inline-flex overflow-x-auto max-w-full">
                        <TabsTrigger value="all">
                          All <Badge variant="secondary" className="ml-2">{allItems.length}</Badge>
                        </TabsTrigger>
                        {perGroup.map((g) => (
                          <TabsTrigger key={g.key} value={g.key}>
                            {g.label} <Badge variant="outline" className="ml-2">{g.count}</Badge>
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      <TabsContent value="all" className="mt-4">
                        <AttachmentGrid
                          attachments={allItems}
                          onView={handleAttachmentView(allItems)}
                          onDownload={(a) => handleDownload(a.file_url)}
                          onDelete={(a) => handleRemoveAttachment(a.id)}
                        />
                      </TabsContent>

                      {perGroup.map((g) => (
                        <TabsContent key={g.key} value={g.key} className="mt-4">
                          <AttachmentGrid
                            attachments={g.items}
                            onView={handleAttachmentView(g.items)}
                            onDownload={(a) => handleDownload(a.file_url)}
                            onDelete={(a) => handleRemoveAttachment(a.id)}
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  );
                })()}
              </div>
            </div>

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
                  {invoice.subcontractor_bill_work_orders.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">
                        {item.work_orders.work_order_number || 'N/A'}
                      </TableCell>
                      <TableCell>{item.work_orders.title}</TableCell>
                      <TableCell>
                        {formatCurrency(Number(item.amount), true)}
                      </TableCell>
                      <TableCell className="max-w-[480px] whitespace-pre-wrap break-words">
                        {item.description?.trim() || (item.work_orders as any)?.description || '—'}
                      </TableCell>
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
            <AlertDialogAction onClick={handleApprove} disabled={approveSubcontractorBill.isPending}>
              {approveSubcontractorBill.isPending ? 'Approving...' : 'Approve Bill'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this bill. This will be sent to the subcontractor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-notes">Rejection Reason *</Label>
            <Textarea
              id="rejection-notes"
              placeholder="Explain why this bill is being rejected..."
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
              disabled={rejectSubcontractorBill.isPending || !rejectionNotes.trim()}
            >
              {rejectSubcontractorBill.isPending ? 'Rejecting...' : 'Reject Bill'}
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

      <ImageLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={lightboxItems}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onDownload={(item) => handleDownload(item.file_url)}
      />
    </>
  );
}
