import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useUserMutations } from '@/hooks/useUsers';

// Phase 7: Organization-based user editing (no user_type)
const editUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  organization_id: z.string().optional(),
  organization_role: z.enum(['admin', 'manager', 'employee', 'member']).optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function EditUserModal({ open, onOpenChange, user }: EditUserModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { data: organizations } = useOrganizations();
  const { updateUser, updateUserOrganization } = useUserMutations();

  // Get current organization info
  const currentOrgMembership = user?.organization_members?.[0];
  const currentOrg = currentOrgMembership?.organization;

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      organization_id: currentOrg?.id || '',
      organization_role: currentOrgMembership?.role || 'member',
    },
  });

  // Reset form when user changes
  React.useEffect(() => {
    if (user) {
      const orgMembership = user.organization_members?.[0];
      form.reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        organization_id: orgMembership?.organization?.id || '',
        organization_role: orgMembership?.role || 'member',
      });
    }
  }, [user, form]);

  const onSubmit = async (data: EditUserFormData) => {
    try {
      setIsLoading(true);
      
      // Update user profile
      await updateUser.mutateAsync({
        id: user.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
      });

      // Update organization membership if changed
      if (data.organization_id && data.organization_id !== currentOrg?.id) {
        await updateUserOrganization.mutateAsync({
          userId: user.user_id,
          profileId: user.id,
          organizationId: data.organization_id,
        });
      }
      
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const watchedOrgId = form.watch('organization_id');
  const selectedOrg = organizations?.find(org => org.id === watchedOrgId);

  // Get available roles based on organization type
  const getAvailableRoles = (orgType: string) => {
    switch (orgType) {
      case 'internal':
        return [
          { value: 'admin', label: 'Admin' },
          { value: 'manager', label: 'Manager' },
          { value: 'employee', label: 'Employee' }
        ];
      case 'partner':
        return [
          { value: 'admin', label: 'Admin' },
          { value: 'manager', label: 'Manager' },
          { value: 'member', label: 'Member' }
        ];
      case 'subcontractor':
        return [
          { value: 'admin', label: 'Admin' },
          { value: 'member', label: 'Member' }
        ];
      default:
        return [{ value: 'member', label: 'Member' }];
    }
  };

  const availableRoles = selectedOrg ? getAvailableRoles(selectedOrg.organization_type) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit User
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organization_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} ({org.organization_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedOrg && (
              <FormField
                control={form.control}
                name="organization_role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role in {selectedOrg.name}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}