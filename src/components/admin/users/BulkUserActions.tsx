
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserCheck, UserX } from 'lucide-react';
import { User, useUserMutations } from '@/hooks/useUsers';

interface BulkUserActionsProps {
  selectedUsers: User[];
  onClearSelection: () => void;
}

export function BulkUserActions({ selectedUsers, onClearSelection }: BulkUserActionsProps) {
  const [bulkAction, setBulkAction] = useState<string>('');
  const { bulkUpdateUsers, deleteUser } = useUserMutations();

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) return;

    const userIds = selectedUsers.map(user => user.id);

    try {
      switch (bulkAction) {
        case 'activate':
          await bulkUpdateUsers.mutateAsync({
            ids: userIds,
            data: { is_active: true }
          });
          break;
        case 'deactivate':
          await bulkUpdateUsers.mutateAsync({
            ids: userIds,
            data: { is_active: false }
          });
          break;
        case 'delete':
          // Delete users one by one since we don't have a bulk delete function
          for (const userId of userIds) {
            await deleteUser.mutateAsync(userId);
          }
          break;
      }
      onClearSelection();
      setBulkAction('');
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  if (selectedUsers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="secondary">{selectedUsers.length}</Badge>
          Users Selected
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activate">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Activate Users
                </div>
              </SelectItem>
              <SelectItem value="deactivate">
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4" />
                  Deactivate Users
                </div>
              </SelectItem>
              <SelectItem value="delete">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Users
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleBulkAction}
            disabled={!bulkAction || bulkUpdateUsers.isPending || deleteUser.isPending}
            variant={bulkAction === 'delete' ? 'destructive' : 'default'}
          >
            Apply Action
          </Button>
          
          <Button variant="outline" onClick={onClearSelection}>
            Clear Selection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
