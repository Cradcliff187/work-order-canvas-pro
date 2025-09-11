import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreHorizontal, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { TimeEntry } from '@/hooks/useTimeManagement';
import { cn } from '@/lib/utils';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';

interface TimeManagementTableProps {
  entries: TimeEntry[];
  selectedEntries: string[];
  onSelectionChange: (entryId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entryId: string) => void;
  isLoading: boolean;
}

export function TimeManagementTable({
  entries,
  selectedEntries,
  onSelectionChange,
  onSelectAll,
  onEdit,
  onDelete,
  isLoading
}: TimeManagementTableProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const getStatusBadge = (entry: TimeEntry) => {
    // TODO: Implement proper status logic based on approval system
    if (entry.hours_worked > 8) {
      return <Badge variant="secondary">Overtime</Badge>;
    }
    return <Badge variant="outline">Normal</Badge>;
  };

  const allSelected = entries.length > 0 && selectedEntries.length === entries.length;
  const someSelected = selectedEntries.length > 0 && selectedEntries.length < entries.length;

  if (isLoading) {
    return <EnhancedTableSkeleton />;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No time entries found</h3>
        <p className="text-muted-foreground">
          No time entries match your current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el && 'indeterminate' in el) {
                    (el as any).indeterminate = someSelected;
                  }
                }}
                onCheckedChange={(checked) => onSelectAll(checked as boolean)}
              />
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Work Item</TableHead>
            <TableHead className="text-right">Hours</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow 
              key={entry.id}
              className={cn(
                "hover:bg-muted/50",
                selectedEntries.includes(entry.id) && "bg-muted/20"
              )}
            >
              <TableCell>
                <Checkbox
                  checked={selectedEntries.includes(entry.id)}
                  onCheckedChange={(checked) => 
                    onSelectionChange(entry.id, checked as boolean)
                  }
                />
              </TableCell>
              
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{format(new Date(entry.report_date), 'MMM d, yyyy')}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.report_date), 'EEEE')}
                  </span>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={entry.employee?.avatar_url} />
                    <AvatarFallback>
                      {entry.employee?.first_name[0]}{entry.employee?.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {entry.employee?.first_name} {entry.employee?.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.employee?.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                {entry.work_order ? (
                  <div>
                    <div className="font-medium text-sm">
                      {entry.work_order.work_order_number}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.work_order.title}
                    </div>
                  </div>
                ) : entry.project ? (
                  <div>
                    <div className="font-medium text-sm">
                      {entry.project.project_number}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.project.name}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3" />
                  {formatHours(entry.hours_worked)}
                </div>
              </TableCell>
              
              <TableCell className="text-right">
                {formatCurrency(entry.hourly_rate_snapshot)}
              </TableCell>
              
              <TableCell className="text-right font-medium">
                <div className="flex items-center justify-end gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(entry.total_labor_cost || 0)}
                </div>
              </TableCell>
              
              <TableCell>
                {getStatusBadge(entry)}
              </TableCell>
              
              <TableCell className="max-w-xs">
                <div className="truncate" title={entry.work_performed}>
                  {entry.work_performed}
                </div>
                {entry.notes && (
                  <div className="text-xs text-muted-foreground truncate" title={entry.notes}>
                    Note: {entry.notes}
                  </div>
                )}
              </TableCell>
              
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(entry)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(entry.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}