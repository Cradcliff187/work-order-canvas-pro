import type { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Eye, Download, Link as LinkIcon, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatting';

export type Receipt = {
  id: string;
  receipt_date?: string | Date | null;
  vendor_name?: string | null;
  amount?: number | null;
  category?: 'Materials' | 'Equipment' | 'Labor' | 'Other' | null;
  work_orders?: { work_order_number?: string | null }[] | { work_order_number?: string | null } | null;
  uploaded_by?: { first_name?: string | null; last_name?: string | null; email?: string | null } | string | null;
  receipt_image_url?: string | null;
};

export interface ReceiptColumnProps {
  onViewImage?: (receipt: Receipt) => void;
  onDownload?: (receipt: Receipt) => void;
  onAssignToWorkOrder?: (receipt: Receipt) => void;
  getImagePublicUrl?: (path: string) => string;
}

const defaultGetImagePublicUrl = (path: string) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from('work-order-attachments').getPublicUrl(path).data.publicUrl;
};

function getWorkOrderDisplay(wo: Receipt['work_orders']): string {
  if (!wo) return '—';
  if (Array.isArray(wo)) {
    if (wo.length === 0) return '—';
    const first = wo[0]?.work_order_number || '—';
    return wo.length > 1 ? `${first} +${wo.length - 1}` : first;
  }
  return wo?.work_order_number || '—';
}

function getUploadedByLabel(u: Receipt['uploaded_by']): string {
  if (!u) return '—';
  if (typeof u === 'string') return u;
  const first = u.first_name?.trim() || '';
  const last = u.last_name?.trim() || '';
  const name = `${first} ${last}`.trim();
  return name || u.email || '—';
}

export function createReceiptColumns({
  onViewImage,
  onDownload,
  onAssignToWorkOrder,
  getImagePublicUrl,
}: ReceiptColumnProps = {}): ColumnDef<Receipt>[] {
  const toPublicUrl = getImagePublicUrl || defaultGetImagePublicUrl;

  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : false
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
      accessorKey: 'receipt_date',
      header: 'Date',
      cell: ({ row }) => {
        const date = row.getValue('receipt_date') as string | Date | null;
        if (!date) return <span className="text-muted-foreground">—</span>;
        const d = typeof date === 'string' ? new Date(date) : date;
        return <div className="text-sm">{format(d, 'MMM d, yyyy')}</div>;
      },
    },
    {
      accessorKey: 'vendor_name',
      header: 'Vendor',
      cell: ({ row }) => (
        <div className="max-w-[220px] truncate">{row.getValue('vendor_name') || <span className="text-muted-foreground">—</span>}</div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number | null;
        return <div className="font-mono font-medium text-right">{formatCurrency(amount ?? null, true)}</div>;
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const category = row.getValue('category') as Receipt['category'];
        return category ? (
          <Badge variant="secondary" className="h-5 text-[10px] px-1.5">{category}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: 'work_order',
      header: 'Work Order',
      cell: ({ row }) => {
        const data = row.original as Receipt;
        return <div className="text-sm">{getWorkOrderDisplay(data.work_orders)}</div>;
      },
    },
    {
      id: 'uploaded_by',
      header: 'Uploaded By',
      cell: ({ row }) => {
        const data = row.original as Receipt;
        return <div className="text-sm">{getUploadedByLabel(data.uploaded_by)}</div>;
      },
    },
    {
      id: 'attachment',
      header: 'Attachment',
      cell: ({ row }) => {
        const data = row.original as Receipt;
        const hasAttachment = !!data.receipt_image_url;
        if (!hasAttachment) return <span className="text-muted-foreground">—</span>;
        const url = toPublicUrl(data.receipt_image_url!);
        const alt = `Receipt image for ${data.vendor_name || 'receipt'}`;
        return (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Preview attachment">
                <Paperclip className="h-4 w-4" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-64">
              <div className="aspect-video w-full overflow-hidden rounded-sm bg-muted">
                <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" />
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const receipt = row.original as Receipt;
        const url = receipt.receipt_image_url ? toPublicUrl(receipt.receipt_image_url) : '';
        const actions = [
          {
            label: 'View image',
            icon: Eye,
            onClick: () => {
              if (onViewImage) return onViewImage(receipt);
              if (!url) return;
              window.open(url, '_blank');
            },
            show: !!url,
          },
          {
            label: 'Download',
            icon: Download,
            onClick: () => {
              if (onDownload) return onDownload(receipt);
              if (!url) return;
              const a = document.createElement('a');
              a.href = url;
              a.download = `receipt-${receipt.id}.png`;
              document.body.appendChild(a);
              a.click();
              a.remove();
            },
            show: !!url,
          },
          {
            label: 'Assign to work order',
            icon: LinkIcon,
            onClick: () => onAssignToWorkOrder?.(receipt),
          },
        ];

        return <TableActionsDropdown actions={actions as any} itemName={receipt.vendor_name || 'receipt'} />;
      },
    },
  ];
}
