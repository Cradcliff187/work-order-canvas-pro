import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { Eye, CheckCircle, XCircle, DollarSign, Paperclip, UserCheck, Download, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { SubcontractorBill } from '@/hooks/useSubcontractorBills';
import { formatCurrency } from '@/utils/formatting';
import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { SortableHeader } from '@/components/admin/shared/SortableHeader';

interface BillColumnsProps {
  onViewBill: (bill: SubcontractorBill) => void;
  onApproveBill: (bill: SubcontractorBill) => void;
  onRejectBill: (bill: SubcontractorBill) => void;
  onMarkAsPaid: (bill: SubcontractorBill) => void;
  // Optional billing actions
  onSendBill?: (bill: SubcontractorBill) => void;
  onDownloadPdf?: (bill: SubcontractorBill) => void;
  // Optional due date resolver for overdue highlighting
  getDueDate?: (bill: SubcontractorBill) => string | null;
  // Admin CRUD
  onEditBill?: (bill: SubcontractorBill) => void;
  onDeleteBill?: (bill: SubcontractorBill) => void;
}

export const createBillColumns = ({
  onViewBill,
  onApproveBill,
  onRejectBill,
  onMarkAsPaid,
  onSendBill,
  onDownloadPdf,
  getDueDate,
  onEditBill,
  onDeleteBill,
}: BillColumnsProps): ColumnDef<SubcontractorBill>[] => [
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
    accessorKey: 'internal_bill_number',
    header: ({ column }) => <SortableHeader column={column} label="Bill #" />,
    cell: ({ row }) => (
      <div className="font-mono text-sm text-right">
        {row.getValue('internal_bill_number')}
      </div>
    ),
  },
  {
    accessorKey: 'external_bill_number',
    header: ({ column }) => <SortableHeader column={column} label="Vendor Bill #" />,
    cell: ({ row }) => {
      const external = row.getValue('external_bill_number') as string | null;
      return (
        <div className="font-mono text-sm text-right">
          {external || <span className="text-muted-foreground">—</span>}
        </div>
      );
    },
  },
  {
    id: 'work_orders',
    header: 'Work Orders',
    cell: ({ row }) => {
      const items = row.original.subcontractor_bill_work_orders || [];
      if (!items.length) return <span className="text-muted-foreground">—</span>;
      
      const count = items.length;
      const displayText = count === 1 ? '1 Work Order' : `${count} Work Orders`;
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm cursor-pointer hover:text-primary transition-colors">
                {displayText}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {items.map((it) => (
                  <Link 
                    key={it.id} 
                    to={`/admin/work-orders/${it.work_orders.id}`} 
                    onClick={(e) => e.stopPropagation()}
                    className="block font-mono text-xs hover:text-primary transition-colors"
                  >
                    {it.work_orders.work_order_number || 'N/A'}
                  </Link>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: 'attachment_count',
    header: 'Attachments',
    cell: ({ row }) => {
      const count = row.original.subcontractor_bill_attachments?.length || 0;
      return count > 0 ? (
        <div className="flex items-center gap-1">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
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
    cell: ({ row }) => {
      const bill = row.original;
      const isAdminEntered = !!(bill as any).created_by_admin_id;
      
      return (
        <div className="flex items-center gap-2">
          <div className="max-w-[180px] truncate">
            {bill.subcontractor_organization.name}
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
                  <p>Entered by {(bill as any).created_by_admin?.first_name} {(bill as any).created_by_admin?.last_name}</p>
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
      const bill = row.original;
      const baseStatus = (row.getValue('status') as string) || 'pending';
      const dueDate = getDueDate?.(bill) ?? (bill as any).due_date ?? null;
      const isPaid = !!bill.paid_at;
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
      const bill = row.original;
      const date = bill.submitted_at || bill.created_at || null;
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
    accessorFn: (row) => (getDueDate?.(row as SubcontractorBill) ?? (row as any).due_date ?? null) as any,
    header: ({ column }) => <SortableHeader column={column} label="Due Date" />,
    cell: ({ row }) => {
      const bill = row.original;
      const dueDate = getDueDate?.(bill) ?? (bill as any).due_date ?? null;
      if (!dueDate) {
        return <span className="text-muted-foreground">—</span>;
      }
      const isPaid = !!bill.paid_at;
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
        const status = paidAt ? 'paid' : 'unpaid';
        return (
          <FinancialStatusBadge status={status} size="sm" showIcon={false} />
        );
      },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const bill = row.original;
      const canApprove = bill.status === 'submitted';
      const canReject = bill.status === 'submitted';
      const canMarkPaid = bill.status === 'approved' && !bill.paid_at;
      const canSend = !!onSendBill && !bill.paid_at;
      const canDownload = !!onDownloadPdf;

      const billName = `${bill.internal_bill_number}`;
      
      const actions = [
        {
          label: 'View Details',
          icon: Eye,
          onClick: () => onViewBill(bill)
        },
        {
          label: 'Send Bill',
          icon: CheckCircle,
          onClick: () => onSendBill?.(bill),
          show: canSend
        },
        {
          label: 'Approve',
          icon: CheckCircle,
          onClick: () => onApproveBill(bill),
          show: canApprove
        },
        {
          label: 'Reject',
          icon: XCircle,
          onClick: () => onRejectBill(bill),
          show: canReject,
          variant: 'destructive' as 'destructive'
        },
        {
          label: 'Mark as Paid',
          icon: DollarSign,
          onClick: () => onMarkAsPaid(bill),
          show: canMarkPaid
        },
        {
          label: 'Edit',
          icon: Pencil,
          onClick: () => onEditBill?.(bill),
          show: !!onEditBill
        },
        {
          label: 'Delete',
          icon: Trash2,
          onClick: () => onDeleteBill?.(bill),
          show: !!onDeleteBill,
          variant: 'destructive' as 'destructive'
        }
      ];

      return (
        <TableActionsDropdown 
          actions={actions} 
          itemName={billName}
          align="end"
        />
      );
    },
  },
];