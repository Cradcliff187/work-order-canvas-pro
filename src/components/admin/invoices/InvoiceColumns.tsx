import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { Eye, CheckCircle, XCircle, DollarSign, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { Invoice } from '@/hooks/useInvoices';
import { formatCurrency } from '@/utils/formatting';

interface InvoiceColumnsProps {
  onViewInvoice: (invoice: Invoice) => void;
  onApproveInvoice: (invoice: Invoice) => void;
  onRejectInvoice: (invoice: Invoice) => void;
  onMarkAsPaid: (invoice: Invoice) => void;
}

export const createInvoiceColumns = ({
  onViewInvoice,
  onApproveInvoice,
  onRejectInvoice,
  onMarkAsPaid,
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
    header: 'Internal #',
    cell: ({ row }) => (
      <div className="font-mono text-sm text-right">
        {row.getValue('internal_invoice_number')}
      </div>
    ),
  },
  {
    accessorKey: 'external_invoice_number',
    header: 'Vendor Invoice #',
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
    header: 'Subcontractor',
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate">
        {row.original.subcontractor_organization.name}
      </div>
    ),
  },
  {
    accessorKey: 'total_amount',
    header: 'Amount',
    cell: ({ row }) => {
      const amount = row.getValue('total_amount') as number;
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
      const status = row.getValue('status') as string;
      const getStatusColor = () => {
        switch (status) {
          case 'submitted':
            return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'approved':
            return 'bg-green-100 text-green-800 border-green-200';
          case 'rejected':
            return 'bg-red-100 text-red-800 border-red-200';
          case 'paid':
            return 'bg-purple-100 text-purple-800 border-purple-200';
          default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
        }
      };
      
      return (
        <Badge className={`${getStatusColor()} h-5 text-[10px] px-1.5 capitalize`}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'submitted_at',
    header: 'Submitted Date',
    cell: ({ row }) => {
      const date = row.getValue('submitted_at') as string | null;
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
      const canMarkPaid = invoice.status === 'approved' && !invoice.paid_at;

      const invoiceName = `${invoice.internal_invoice_number}`;
      
      const actions = [
        {
          label: 'View Details',
          icon: Eye,
          onClick: () => onViewInvoice(invoice)
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