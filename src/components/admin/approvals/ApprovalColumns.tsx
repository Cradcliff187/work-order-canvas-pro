import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { Eye, CheckCircle, XCircle, Clock, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ApprovalItem } from '@/hooks/useApprovalQueue';
import { formatCurrency } from '@/utils/formatting';

interface ApprovalColumnsProps {
  onView: (item: ApprovalItem) => void;
  onApprove: (item: ApprovalItem) => void;
  onReject: (item: ApprovalItem) => void;
  loadingItems: Set<string>;
}

export function createApprovalColumns({
  onView,
  onApprove,
  onReject,
  loadingItems,
}: ApprovalColumnsProps): ColumnDef<ApprovalItem>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        return (
          <Badge 
            variant={type === 'report' ? 'secondary' : 'default'}
            className="h-5 text-[10px] px-1.5"
          >
            {type === 'report' ? (
              <>
                <FileText className="w-3 h-3 mr-1" />
                Report
              </>
            ) : (
              <>
                <DollarSign className="w-3 h-3 mr-1" />
                Invoice
              </>
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div>
            <div className="font-medium max-w-[200px] truncate">
              {item.title}
            </div>
            {item.urgency === 'high' && (
              <div className="flex items-center gap-1 mt-1">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-600 font-medium">Urgent</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'submittedBy',
      header: 'Submitted By',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue('submittedBy')}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number;
        return amount ? (
          <span className="font-mono font-medium text-green-600 text-right block">
            {formatCurrency(amount)}
          </span>
        ) : (
          <span className="text-muted-foreground text-right block">N/A</span>
        );
      },
    },
    {
      accessorKey: 'submittedAt',
      header: 'Submitted',
      cell: ({ row }) => {
        const date = row.getValue('submittedAt') as string;
        return format(new Date(date), 'MMM dd, yyyy');
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original;
        const isLoading = loadingItems.has(item.id);
        
        const actions = [
          {
            label: 'View Details',
            icon: Eye,
            onClick: () => onView(item),
          },
          {
            label: 'Approve',
            icon: CheckCircle,
            onClick: () => onApprove(item),
          },
          {
            label: 'Reject',
            icon: XCircle,
            onClick: () => onReject(item),
            variant: 'destructive' as const,
          },
        ];

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <TableActionsDropdown 
              actions={actions} 
              itemName={item.title}
              align="end" 
            />
          </div>
        );
      },
    },
  ];
}