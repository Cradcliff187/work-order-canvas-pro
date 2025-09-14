import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { Eye, FileText, Send, Download, Mail, DollarSign, ArrowUpDown, Copy, Trash2 } from 'lucide-react';
import { InvoiceStatusBadge } from '@/components/admin/partner-billing/InvoiceStatusBadge';
import { formatCurrency } from '@/utils/formatting';
import { format } from 'date-fns';
import { ColumnMetadata } from '@/hooks/useColumnVisibility';
import { Database } from '@/integrations/supabase/types';

// Shared type for Partner Invoice
export type PartnerInvoice = Database['public']['Tables']['partner_invoices']['Row'] & {
  partner_organization?: { name: string } | null;
};

// Column metadata for visibility management
export const PARTNER_INVOICE_COLUMN_METADATA: Record<string, ColumnMetadata> = {
  invoice_number: { 
    label: 'Invoice #', 
    description: 'Invoice number and details',
    defaultVisible: true 
  },
  partner_organization: { 
    label: 'Partner', 
    description: 'Partner organization',
    defaultVisible: true 
  },
  invoice_date: { 
    label: 'Invoice Date', 
    description: 'Date the invoice was created',
    defaultVisible: true 
  },
  due_date: { 
    label: 'Due Date', 
    description: 'Invoice due date',
    defaultVisible: true 
  },
  total_amount: { 
    label: 'Amount', 
    description: 'Total invoice amount',
    defaultVisible: true 
  },
  status: { 
    label: 'Status', 
    description: 'Current invoice status',
    defaultVisible: true 
  },
  actions: { 
    label: 'Actions', 
    description: 'Row action buttons',
    defaultVisible: true 
  }
};

export interface PartnerInvoiceColumnsProps {
  onView: (invoice: PartnerInvoice) => void;
  onGeneratePdf?: (invoice: PartnerInvoice) => void;
  onSendInvoice?: (invoice: PartnerInvoice) => void;
  onDownloadPdf?: (invoice: PartnerInvoice) => void;
  onUpdateStatus?: (invoice: PartnerInvoice, status: string) => void;
  onDelete?: (invoice: PartnerInvoice) => void;
}

export const createPartnerInvoiceColumns = ({ 
  onView, 
  onGeneratePdf, 
  onSendInvoice, 
  onDownloadPdf, 
  onUpdateStatus,
  onDelete 
}: PartnerInvoiceColumnsProps): ColumnDef<PartnerInvoice>[] => [
  {
    accessorKey: 'invoice_number',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
        aria-label={`Sort by invoice number ${column.getIsSorted() === 'asc' ? 'descending' : 'ascending'}`}
      >
        Invoice #
        <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
      </Button>
    ),
    maxSize: 160,
    enableResizing: false,
    cell: ({ row }) => {
      const number = row.getValue('invoice_number') as string;
      return (
        <div className="flex items-center gap-2">
          <div className="font-mono text-sm whitespace-nowrap">
            {number || 'N/A'}
          </div>
          {number && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(number);
              }}
              aria-label={`Copy invoice number ${number}`}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
    },
  },
  {
    id: 'partner_organization',
    accessorFn: (row) => row.partner_organization?.name,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Partner
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    maxSize: 180,
    cell: ({ row }) => row.original.partner_organization?.name || 'Unknown Partner',
  },
  {
    accessorKey: 'invoice_date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Invoice Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    maxSize: 120,
    cell: ({ row }) => {
      const date = row.getValue('invoice_date') as string;
      return date ? format(new Date(date), 'MMM dd, yyyy') : 'No date';
    },
  },
  {
    accessorKey: 'due_date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Due Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    maxSize: 120,
    cell: ({ row }) => {
      const date = row.getValue('due_date') as string | null;
      return date ? format(new Date(date), 'MMM dd, yyyy') : 'No due date';
    },
  },
  {
    accessorKey: 'total_amount',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Amount
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    maxSize: 120,
    cell: ({ row }) => {
      const amount = row.getValue('total_amount') as number;
      return <span className="font-medium">{formatCurrency(amount || 0)}</span>;
    },
    meta: { align: 'right' },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Status
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    maxSize: 120,
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return <InvoiceStatusBadge status={status} />;
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    maxSize: 80,
    cell: ({ row }) => {
      const invoice = row.original;
      const invoiceName = `${invoice.invoice_number}`;
      
      const actions = [
        {
          label: 'View Details',
          icon: Eye,
          onClick: () => onView(invoice)
        },
        {
          label: 'Generate PDF',
          icon: FileText,
          onClick: () => onGeneratePdf?.(invoice),
          show: invoice.status !== 'draft' && !!onGeneratePdf
        },
        {
          label: 'Send Invoice',
          icon: Send,
          onClick: () => onSendInvoice?.(invoice),
          show: invoice.status === 'draft' && !!invoice.pdf_url && !!onSendInvoice
        },
        {
          label: 'Download PDF',
          icon: Download,
          onClick: () => onDownloadPdf?.(invoice),
          show: !!invoice.pdf_url && !!onDownloadPdf
        },
        {
          label: 'Mark as Sent',
          icon: Mail,
          onClick: () => onUpdateStatus?.(invoice, 'sent'),
          show: invoice.status === 'draft' && !!onUpdateStatus
        },
        {
          label: 'Mark as Paid',
          icon: DollarSign,
          onClick: () => onUpdateStatus?.(invoice, 'paid'),
          show: invoice.status === 'sent' && !!onUpdateStatus
        },
        {
          label: 'Delete Invoice',
          icon: Trash2,
          onClick: () => onDelete?.(invoice),
          show: !!onDelete,
          variant: 'destructive' as const
        }
      ];

      return (
        <div onClick={(e) => e.stopPropagation()}>
          <TableActionsDropdown 
            actions={actions} 
            itemName={invoiceName}
            align="end"
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];