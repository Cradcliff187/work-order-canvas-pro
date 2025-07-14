import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Building2, Plus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserMutations, UpdateUserData } from '@/hooks/useUsers';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useToast } from '@/hooks/use-toast';
import { useAutoOrganization } from '@/hooks/useAutoOrganization';
import { User } from '@/pages/admin/AdminUsers';
import { QuickOrganizationForm } from './QuickOrganizationForm';
import { filterOrganizationsByUserType } from '@/lib/utils/userOrgMapping';

const editUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  user_type: z.enum(['admin', 'partner', 'subcontractor', 'employee'], {
    required_error: 'User type is required',
  }),
  phone: z.string().optional(),
  
  is_active: z.boolean(),
  organization_ids: z.array(z.string()).optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

export function EditUserModal({ open, onOpenChange, user, onSuccess }: EditUserModalProps) {
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  
  const { toast } = useToast();
  const { data: organizationsData, refetch } = useOrganizations();
  const { updateUser } = useUserMutations();
  const { shouldShowSelector } = useAutoOrganization();
  
  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      
      is_active: true,
      organization_ids: [],
    },
  });

  const watchedUserType = form.watch('user_type');
  const watchedOrganizations = form.watch('organization_ids') || [];

  useEffect(() => {
    if (user && open) {
      form.reset({
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type,
        phone: user.phone || '',
        
        is_active: user.is_active,
        organization_ids: user.organizations?.map(org => org.id) || [],
      });
    }
  }, [user, open, form]);

  const onSubmit = async (data: EditUserFormData) => {
    if (!user) return;
    
    try {
      await updateUser.mutateAsync({
        userId: user.id,
        userData: {
          first_name: data.first_name,
          last_name: data.last_name,
          user_type: data.user_type,
          phone: data.phone,
          
          is_active: data.is_active,
          organization_ids: data.organization_ids,
        },
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const toggleOrganization = (orgId: string) => {
    const current = form.getValues('organization_ids') || [];
    if (current.includes(orgId)) {
      form.setValue('organization_ids', current.filter(id => id !== orgId));
    } else {
      form.setValue('organization_ids', [...current, orgId]);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and settings for {user.first_name} {user.last_name}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={user.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed after account creation</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="user_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active User</FormLabel>
                    <FormDescription>
                      Inactive users cannot log in or access the system.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {watchedUserType && watchedUserType !== 'admin' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Organizations</Label>
                <FormDescription>
                  {shouldShowSelector 
                    ? 'Select the organizations this user should be associated with.' 
                    : 'This user will be associated with your organization.'}
                </FormDescription>
                
                {shouldShowSelector ? (
                  // Admin view - show full organization selection
                  (() => {
                    const allOrgs = organizationsData?.organizations || [];
                    const filteredOrgs = filterOrganizationsByUserType(allOrgs, watchedUserType);
                    // Also include any organizations the user is already assigned to (for data integrity)
                    const userOrgIds = new Set(watchedOrganizations);
                    const userAssignedOrgs = allOrgs.filter(org => userOrgIds.has(org.id) && org.is_active);
                    const combinedOrgs = [...new Map([...filteredOrgs, ...userAssignedOrgs].map(org => [org.id, org])).values()];
                    
                    return combinedOrgs.length > 0 ? (
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                        <div className="space-y-2">
                           {combinedOrgs.map((org) => {
                             const isMatching = filteredOrgs.some(fo => fo.id === org.id);
                             return (
                               <div key={org.id} className="flex items-center space-x-2">
                                 <Checkbox
                                   id={`org-${org.id}`}
                                   checked={watchedOrganizations.includes(org.id)}
                                   onCheckedChange={() => toggleOrganization(org.id)}
                                 />
                                 <label
                                   htmlFor={`org-${org.id}`}
                                   className={`text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 flex items-center gap-2 ${!isMatching ? 'text-muted-foreground' : ''}`}
                                 >
                                   <Building2 className="h-4 w-4 text-muted-foreground" />
                                   {org.name}
                                   {!isMatching && (
                                     <Badge variant="outline" className="ml-2 text-xs">
                                       Legacy
                                     </Badge>
                                   )}
                                 </label>
                               </div>
                             );
                           })}
                         </div>
                         <div className="border-t pt-2 mt-2">
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => setShowCreateOrgDialog(true)}
                             className="w-full"
                           >
                             <Plus className="w-4 h-4 mr-2" />
                             Create New Organization
                           </Button>
                         </div>
                       </div>
                     ) : (
                       <Alert>
                         <AlertCircle className="h-4 w-4" />
                         <AlertDescription>
                           No {watchedUserType === 'partner' ? 'partner' : watchedUserType === 'subcontractor' ? 'subcontractor' : 'internal'} organizations available. Create one to continue.
                         </AlertDescription>
                       </Alert>
                     );
                   })()
                ) : (
                  // Partner/Subcontractor view - show their organization info
                  <div className="bg-muted/50 border rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      Organization assignments are managed automatically.
                    </p>
                  </div>
                )}

                {watchedOrganizations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {watchedOrganizations.map((orgId) => {
                      const org = organizationsData?.organizations?.find(o => o.id === orgId);
                      return org ? (
                        <Badge key={orgId} variant="secondary" className="text-xs">
                          {org.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        
        <QuickOrganizationForm 
          open={showCreateOrgDialog}
          onOpenChange={setShowCreateOrgDialog}
          userType={watchedUserType}
          onSuccess={(orgId) => {
            const currentOrgs = form.getValues('organization_ids') || [];
            form.setValue('organization_ids', [...currentOrgs, orgId]);
            refetch();
            toast({
              title: "Organization created",
              description: "The new organization has been created and selected.",
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}