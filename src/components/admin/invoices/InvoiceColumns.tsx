import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { Eye, CheckCircle, XCircle, DollarSign, Paperclip, UserCheck, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Invoice } from '@/hooks/useInvoices';
import { formatCurrency } from '@/utils/formatting';
import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { SortableHeader } from '@/components/admin/shared/SortableHeader';

interface InvoiceColumnsProps {
  onViewInvoice: (invoice: Invoice) => void;
  onApproveInvoice: (invoice: Invoice) => void;
  onRejectInvoice: (invoice: Invoice) => void;
  onMarkAsPaid: (invoice: Invoice) => void;
  // Optional billing actions
  onSendInvoice?: (invoice: Invoice) => void;
  onDownloadPdf?: (invoice: Invoice) => void;
  // Optional due date resolver for overdue highlighting
  getDueDate?: (invoice: Invoice) => string | null;
}

export const createInvoiceColumns = ({
  onViewInvoice,
  onApproveInvoice,
  onRejectInvoice,
  onMarkAsPaid,
  onSendInvoice,
  onDownloadPdf,
  getDueDate,
}: InvoiceColumnsProps): ColumnDef<Invoice>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ? true :
          table.getIsSomePageRowsSelected() ? 'indeterminate' : false
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'internal_invoice_number',
    header: ({ column }) => <SortableHeader column={column} label="Invoice #" />,
    cell: ({ row }) => (
      <div className="font-mono text-sm text-right">
        {row.getValue('internal_invoice_number')}
      </div>
    ),
  },
  {
    accessorKey: 'external_invoice_number',
    header: ({ column }) => <SortableHeader column={column} label="Vendor Invoice #" />,
    cell: ({ row }) => {
      const external = row.getValue('external_invoice_number') as string | null;
      return (
        <div className="font-mono text-sm text-right">
          {external || <span className="text-muted-foreground">—</span>}
        </div>
      );
    },
  },
  {
    accessorKey: 'attachment_count',
    header: 'Attachments',
    cell: ({ row }) => {
      const count = row.original.attachment_count || 0;
      return count > 0 ? (
        <div className="flex items-center gap-1">
          <Paperclip className="h-4 w-4 text-blue-600" />
          <Badge variant="outline" className="h-5 text-[10px] px-1.5">
            {count}
          </Badge>
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: 'subcontractor_organization.name',
    header: 'Partner',
    cell: ({ row }) => {
      const invoice = row.original;
      const isAdminEntered = !!invoice.created_by_admin_id;
      
      return (
        <div className="flex items-center gap-2">
          <div className="max-w-[180px] truncate">
            {invoice.subcontractor_organization.name}
          </div>
          {isAdminEntered && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="h-5 text-[10px] px-1.5 flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Admin
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Entered by {invoice.created_by_admin?.first_name} {invoice.created_by_admin?.last_name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'total_amount',
    header: ({ column }) => <SortableHeader column={column} label="Amount" />,
    cell: ({ row }) => {
      const raw = row.getValue('total_amount') as any;
      const amount = typeof raw === 'number' ? raw : parseFloat(raw || '0');
      return (
        <div className="font-mono font-medium text-right">
          {formatCurrency(amount, true)}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const invoice = row.original;
      const baseStatus = (row.getValue('status') as string) || 'pending';
      const dueDate = getDueDate?.(invoice) ?? (invoice as any).due_date ?? null;
      const isPaid = !!invoice.paid_at;
      const isOverdue = dueDate ? (new Date(dueDate) < new Date() && !isPaid) : false;
      const badgeStatus = isOverdue ? 'overdue' : (baseStatus === 'submitted' ? 'pending' : baseStatus);
      return (
        <FinancialStatusBadge 
          status={badgeStatus}
          size="sm"
          showIcon={false}
        />
      );
    },
  },
  {
    id: 'date',
    accessorFn: (row) => (row.submitted_at || row.created_at || null) as any,
    header: ({ column }) => <SortableHeader column={column} label="Date" />,
    cell: ({ row }) => {
      const invoice = row.original;
      const date = invoice.submitted_at || invoice.created_at || null;
      return date ? (
        <div className="text-sm">
          {format(new Date(date), 'MMM dd, yyyy')}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    id: 'due_date',
    accessorFn: (row) => (getDueDate?.(row as Invoice) ?? (row as any).due_date ?? null) as any,
    header: ({ column }) => <SortableHeader column={column} label="Due Date" />,
    cell: ({ row }) => {
      const invoice = row.original;
      const dueDate = getDueDate?.(invoice) ?? (invoice as any).due_date ?? null;
      if (!dueDate) {
        return <span className="text-muted-foreground">—</span>;
      }
      const isPaid = !!invoice.paid_at;
      const isOverdue = new Date(dueDate) < new Date() && !isPaid;
      return (
        <div className={`text-sm ${isOverdue ? 'text-destructive font-medium' : ''}`}>
          {format(new Date(dueDate), 'MMM dd, yyyy')}
        </div>
      );
    },
  },
  {
    accessorKey: 'paid_at',
    header: 'Payment Status',
    cell: ({ row }) => {
      const paidAt = row.getValue('paid_at') as string | null;
      return paidAt ? (
        <Badge className="bg-green-100 text-green-800 border-green-200 h-5 text-[10px] px-1.5 transition-all duration-200">
          Paid
        </Badge>
      ) : (
        <Badge variant="outline" className="h-5 text-[10px] px-1.5 transition-all duration-200">
          Unpaid
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const invoice = row.original;
      const canApprove = invoice.status === 'submitted';
      const canReject = invoice.status === 'submitted';
      const canMarkPaid = invoice.status !== 'cancelled' && !invoice.paid_at;
      const canSend = !!onSendInvoice && !invoice.paid_at;
      const canDownload = !!onDownloadPdf;

      const invoiceName = `${invoice.internal_invoice_number}`;
      
      const actions = [
        {
          label: 'View Details',
          icon: Eye,
          onClick: () => onViewInvoice(invoice)
        },
        {
          label: 'Send Invoice',
          icon: CheckCircle,
          onClick: () => onSendInvoice?.(invoice),
          show: canSend
        },
        {
          label: 'Approve',
          icon: CheckCircle,
          onClick: () => onApproveInvoice(invoice),
          show: canApprove
        },
        {
          label: 'Reject',
          icon: XCircle,
          onClick: () => onRejectInvoice(invoice),
          show: canReject,
          variant: 'destructive' as const
        },
        {
          label: 'Mark as Paid',
          icon: DollarSign,
          onClick: () => onMarkAsPaid(invoice),
          show: canMarkPaid
        },
        {
          label: 'Download PDF',
          icon: Download,
          onClick: () => onDownloadPdf?.(invoice),
          show: canDownload
        }
      ];

      return (
        <TableActionsDropdown 
          actions={actions} 
          itemName={invoiceName}
          align="end"
        />
      );
    },
  },
];