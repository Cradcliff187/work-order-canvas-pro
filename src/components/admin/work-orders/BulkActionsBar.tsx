import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Users, Download, RotateCcw, X } from 'lucide-react';
import { useUsers, useWorkOrderMutations } from '@/hooks/useWorkOrders';
import { Database } from '@/integrations/supabase/types';

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onExport: (ids: string[]) => void;
}

const statusOptions: { value: WorkOrderStatus; label: string }[] = [
  { value: 'received', label: 'Received' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function BulkActionsBar({ selectedCount, selectedIds, onClearSelection, onExport }: BulkActionsBarProps) {
  const [selectedStatus, setSelectedStatus] = useState<WorkOrderStatus | ''>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  
  const { data: users } = useUsers();
  const { bulkUpdateWorkOrders } = useWorkOrderMutations();

  const handleStatusUpdate = () => {
    if (!selectedStatus) return;
    
    bulkUpdateWorkOrders.mutate({
      ids: selectedIds,
      updates: { status: selectedStatus }
    });
    
    setSelectedStatus('');
    onClearSelection();
  };

  const handleAssignUsers = () => {
    if (!selectedUser) return;
    
    bulkUpdateWorkOrders.mutate({
      ids: selectedIds,
      updates: { 
        assigned_to: selectedUser,
        assigned_to_type: 'internal',
        date_assigned: new Date().toISOString()
      }
    });
    
    setSelectedUser('');
    onClearSelection();
  };

  const handleExport = () => {
    onExport(selectedIds);
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-4 min-w-[600px]">
        <Badge variant="secondary" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {selectedCount} selected
        </Badge>

        <Separator orientation="vertical" className="h-6" />

        {/* Status Update */}
        <div className="flex items-center gap-2">
          <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as WorkOrderStatus)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            onClick={handleStatusUpdate}
            disabled={!selectedStatus || bulkUpdateWorkOrders.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Update Status
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Assign Users */}
        <div className="flex items-center gap-2">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Assign to" />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.user_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            onClick={handleAssignUsers}
            disabled={!selectedUser || bulkUpdateWorkOrders.isPending}
          >
            <Users className="h-4 w-4 mr-2" />
            Assign
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Export */}
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>

        {/* Clear Selection */}
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}