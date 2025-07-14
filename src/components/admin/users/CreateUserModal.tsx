import React, { useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Copy, Eye, EyeOff, Mail, User, Phone, Building2, Plus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserMutations, CreateUserData, useAutoAssignmentPreview } from '@/hooks/useUsers';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useToast } from '@/hooks/use-toast';
import { QuickOrganizationForm } from './QuickOrganizationForm';
import { filterOrganizationsByUserType } from '@/lib/utils/userOrgMapping';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  user_type: z.enum(['admin', 'partner', 'subcontractor', 'employee'], {
    required_error: 'User type is required',
  }),
  phone: z.string().optional(),
  organization_ids: z.array(z.string()).optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserModal({ open, onOpenChange, onSuccess }: CreateUserModalProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdUserEmail, setCreatedUserEmail] = useState<string>('');
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  
  const { toast } = useToast();
  const { data: organizationsData, refetch } = useOrganizations();
  const { createUser } = useUserMutations();
  
  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      organization_ids: [],
    },
  });

  const watchedUserType = form.watch('user_type');
  const watchedOrganizations = form.watch('organization_ids') || [];
  
  // Auto-assignment preview
  const { data: autoAssignmentData } = useAutoAssignmentPreview(watchedUserType);

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      await createUser.mutateAsync({
        email: data.email!,
        first_name: data.first_name!,
        last_name: data.last_name!,
        user_type: data.user_type!,
        phone: data.phone,
        organization_ids: data.organization_ids || [],
      });

      // Show success message
      setCreatedUserEmail(data.email);
      setShowSuccess(true);
      
      // Reset form but keep modal open to show success
      form.reset();
      
      onSuccess();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    setShowSuccess(false);
    setCreatedUserEmail('');
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showSuccess ? 'User Created Successfully' : 'Create New User'}
          </DialogTitle>
          <DialogDescription>
            {showSuccess 
              ? 'The user account has been created and a confirmation email will be sent by Supabase.'
              : 'Fill in the details to create a new user account.'
            }
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Account Setup
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Email:</Label>
                  <code className="bg-background px-2 py-1 rounded text-sm">
                    {createdUserEmail}
                  </code>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>✅ Confirmation email will be sent by Supabase</p>
                  <p>✅ Password reset link generated</p>
                </div>
              </div>
            </div>
            
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                The user will receive a confirmation email from Supabase to verify their account and set up their password. 
                Check spam folder for noreply@mail.app.supabase.io. No temporary credentials are needed.
              </AlertDescription>
            </Alert>
            
            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="user_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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


              {watchedUserType && watchedUserType !== 'admin' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Organizations</Label>
                  <FormDescription>
                    Select the organizations this user should be associated with.
                  </FormDescription>
                  
                  {/* Auto-assignment preview */}
                  {autoAssignmentData?.willAutoAssign && watchedOrganizations.length === 0 && (
                    <Alert>
                      <Building2 className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <p className="font-medium">Auto-assignment enabled</p>
                          <p className="text-sm">
                            This {watchedUserType} user will be automatically assigned to: 
                            <span className="font-medium ml-1">{autoAssignmentData.organization?.name}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            You can select different organizations below to override this.
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                   {(() => {
                     const allOrgs = organizationsData?.organizations || [];
                     const filteredOrgs = filterOrganizationsByUserType(allOrgs, watchedUserType);
                     
                     return filteredOrgs.length > 0 ? (
                       <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                         <div className="space-y-2">
                           {filteredOrgs.map((org) => (
                            <div key={org.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`org-${org.id}`}
                                checked={watchedOrganizations.includes(org.id)}
                                onCheckedChange={() => toggleOrganization(org.id)}
                              />
                              <label
                                htmlFor={`org-${org.id}`}
                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 flex items-center gap-2"
                              >
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {org.name}
                                {autoAssignmentData?.organization?.id === org.id && watchedOrganizations.length === 0 && (
                                  <Badge variant="default" className="text-xs ml-2">
                                    Auto-assigned
                                  </Badge>
                                )}
                              </label>
                            </div>
                          ))}
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
                   })()}

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
              )}

              <Separator />

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Users will automatically receive a confirmation email from Supabase to verify their account and set up their password.
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
        
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
