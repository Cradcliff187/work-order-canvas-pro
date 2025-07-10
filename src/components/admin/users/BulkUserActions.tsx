import React, { useState } from 'react';
import { UserCheck, UserX, Users, Download, Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { User } from '@/pages/admin/AdminUsers';
import { useUserMutations } from '@/hooks/useUsers';
import { useOrganizations } from '@/hooks/useOrganizations';

interface BulkUserActionsProps {
  selectedCount: number;
  selectedUsers: User[];
  onSuccess: () => void;
}

export function BulkUserActions({ selectedCount, selectedUsers, onSuccess }: BulkUserActionsProps) {
  const [bulkAction, setBulkAction] = useState<string>('');
  const { data: organizationsData } = useOrganizations();
  const { bulkUpdateUsers } = useUserMutations();

  const handleBulkAction = async () => {
    if (!bulkAction) return;

    const userIds = selectedUsers.map(user => user.id);

    try {
      switch (bulkAction) {
        case 'activate':
          await bulkUpdateUsers.mutateAsync({
            userIds,
            updates: { is_active: true }
          });
          break;
        case 'deactivate':
          await bulkUpdateUsers.mutateAsync({
            userIds,
            updates: { is_active: false }
          });
          break;
        case 'export':
          // Export to CSV
          const csvContent = [
            ['Name', 'Email', 'Type', 'Status', 'Organizations', 'Created'],
            ...selectedUsers.map(user => [
              `${user.first_name} ${user.last_name}`,
              user.email,
              user.user_type,
              user.is_active ? 'Active' : 'Inactive',
              user.organizations?.map(o => o.name).join('; ') || '',
              new Date(user.created_at).toLocaleDateString()
            ])
          ].map(row => row.join(',')).join('\n');
          
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          break;
      }
      
      setBulkAction('');
      onSuccess();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <Card className="bg-muted/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">
              {selectedCount} user{selectedCount > 1 ? 's' : ''} selected
            </span>
            <Badge variant="outline">{selectedCount}</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Choose action..." />
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
                <SelectItem value="export">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export to CSV
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {bulkAction && bulkAction !== 'export' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant={bulkAction === 'deactivate' ? 'destructive' : 'default'}
                    disabled={!bulkAction}
                  >
                    Apply Action
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to {bulkAction} {selectedCount} user{selectedCount > 1 ? 's' : ''}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkAction}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {bulkAction === 'export' && (
              <Button onClick={handleBulkAction}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {selectedUsers.slice(0, 5).map((user) => (
              <Badge key={user.id} variant="secondary" className="text-xs">
                {user.first_name} {user.last_name}
              </Badge>
            ))}
            {selectedCount > 5 && (
              <Badge variant="outline" className="text-xs">
                +{selectedCount - 5} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}