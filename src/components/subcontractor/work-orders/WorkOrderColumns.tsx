import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, FileText, MapPin, Building, Calendar, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  status: 'assigned' | 'in_progress' | 'received' | 'completed' | 'cancelled' | 'estimate_needed' | 'estimate_approved';
  store_location: string;
  city: string;
  state: string;
  date_submitted: string;
  description: string;
  trades?: {
    name: string;
  };
  work_order_attachments?: Array<{ file_type: string }>;
}

interface WorkOrderColumnProps {
  unreadCounts: Record<string, number>;
  onView: (workOrder: WorkOrder) => void;
  onSubmitReport?: (workOrder: WorkOrder) => void;
  selectedId?: string;
  onSelectionChange?: (id: string) => void;
}

export function createSubcontractorWorkOrderColumns({ 
  unreadCounts, 
  onView, 
  onSubmitReport,
  selectedId,
  onSelectionChange 
}: WorkOrderColumnProps): ColumnDef<WorkOrder>[] {
  return [
    {
      accessorKey: 'work_order_number',
      header: 'Work Order #',
      cell: ({ row }) => {
        const workOrder = row.original;
        const unreadCount = unreadCounts[workOrder.id] || 0;
        const hasAttachments = workOrder.work_order_attachments && 
          workOrder.work_order_attachments.length > 0;
        const isSelected = selectedId === workOrder.id;

        return (
          <div className={cn(
            "flex items-center gap-2 cursor-pointer p-2 rounded transition-colors",
            isSelected && "bg-muted/50"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelectionChange?.(workOrder.id);
          }}>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{workOrder.work_order_number}</span>
              <div className="flex items-center gap-1 mt-1">
                {unreadCount > 0 && (
                  <Badge variant="default" className="h-5 px-2 text-xs flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {unreadCount}
                  </Badge>
                )}
                {hasAttachments && (
                  <Badge variant="outline" className="h-5 px-2 text-xs">
                    📎
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const workOrder = row.original;
        const isSelected = selectedId === workOrder.id;
        
        return (
          <div className={cn(
            "cursor-pointer p-2 rounded transition-colors",
            isSelected && "bg-muted/50"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelectionChange?.(workOrder.id);
          }}>
            <div className="font-medium text-sm">{workOrder.title}</div>
            <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
              {workOrder.description}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const workOrder = row.original;
        const isSelected = selectedId === workOrder.id;
        
        return (
          <div className={cn(
            "cursor-pointer p-2 rounded transition-colors",
            isSelected && "bg-muted/50"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelectionChange?.(workOrder.id);
          }}>
            <WorkOrderStatusBadge status={workOrder.status} />
          </div>
        );
      },
    },
    {
      accessorKey: 'store_location',
      header: 'Location',
      cell: ({ row }) => {
        const workOrder = row.original;
        const isSelected = selectedId === workOrder.id;
        
        return (
          <div className={cn(
            "cursor-pointer p-2 rounded transition-colors",
            isSelected && "bg-muted/50"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelectionChange?.(workOrder.id);
          }}>
            <div className="flex items-center gap-1 text-sm">
              <Building className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{workOrder.store_location}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{workOrder.city}, {workOrder.state}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'trades.name',
      header: 'Trade',
      cell: ({ row }) => {
        const workOrder = row.original;
        const isSelected = selectedId === workOrder.id;
        
        return (
          <div className={cn(
            "cursor-pointer p-2 rounded transition-colors",
            isSelected && "bg-muted/50"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelectionChange?.(workOrder.id);
          }}>
            <span className="text-sm">{workOrder.trades?.name || 'N/A'}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'date_submitted',
      header: 'Submitted',
      cell: ({ row }) => {
        const workOrder = row.original;
        const isSelected = selectedId === workOrder.id;
        
        return (
          <div className={cn(
            "cursor-pointer p-2 rounded transition-colors",
            isSelected && "bg-muted/50"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelectionChange?.(workOrder.id);
          }}>
            <div className="flex items-center gap-1 text-sm">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{format(new Date(workOrder.date_submitted), 'MMM d, yyyy')}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const workOrder = row.original;
        const canSubmitReport = workOrder.status === 'assigned' || workOrder.status === 'in_progress';
        
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onView(workOrder);
              }}
              className="h-8 px-2"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {canSubmitReport && onSubmitReport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSubmitReport(workOrder);
                }}
                className="h-8 px-2"
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}