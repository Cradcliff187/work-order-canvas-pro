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
import { useUserMutations, CreateUserData } from '@/hooks/useUsers';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useToast } from '@/hooks/use-toast';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  user_type: z.enum(['admin', 'partner', 'subcontractor', 'employee'], {
    required_error: 'User type is required',
  }),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  organization_ids: z.array(z.string()).optional(),
  send_welcome_email: z.boolean().default(false),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserModal({ open, onOpenChange, onSuccess }: CreateUserModalProps) {
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  
  const { toast } = useToast();
  const { data: organizationsData } = useOrganizations();
  const { createUser } = useUserMutations();
  
  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      company_name: '',
      organization_ids: [],
      send_welcome_email: false,
    },
  });

  const watchedUserType = form.watch('user_type');
  const watchedOrganizations = form.watch('organization_ids') || [];

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
      const result = await createUser.mutateAsync({
        email: data.email!,
        first_name: data.first_name!,
        last_name: data.last_name!,
        user_type: data.user_type!,
        phone: data.phone,
        company_name: data.company_name,
        organization_ids: data.organization_ids || [],
        send_welcome_email: data.send_welcome_email,
      });

      // Show the actual generated credentials from the server
      if (result.temporaryPassword) {
        setGeneratedCredentials({
          email: data.email,
          password: result.temporaryPassword,
        });
        setShowCredentials(true);
      }
      
      // Reset form but keep modal open to show credentials
      form.reset();
      
      onSuccess();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    setShowCredentials(false);
    setGeneratedCredentials(null);
    onOpenChange(false);
  };

  const copyCredentials = () => {
    if (generatedCredentials) {
      const text = `Email: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}`;
      navigator.clipboard.writeText(text);
      toast({
        title: "Credentials copied",
        description: "User credentials have been copied to clipboard.",
      });
    }
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
            {showCredentials ? 'User Created Successfully' : 'Create New User'}
          </DialogTitle>
          <DialogDescription>
            {showCredentials 
              ? 'The user has been created. Please save these credentials securely.'
              : 'Fill in the details to create a new user account.'
            }
          </DialogDescription>
        </DialogHeader>

        {showCredentials && generatedCredentials ? (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                User Credentials
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Email:</Label>
                  <code className="bg-background px-2 py-1 rounded text-sm">
                    {generatedCredentials.email}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Temporary Password:</Label>
                  <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                    {generatedCredentials.password}
                  </code>
                </div>
              </div>
              <Button onClick={copyCredentials} className="w-full mt-3" variant="outline">
                <Copy className="mr-2 h-4 w-4" />
                Copy Credentials
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>The user will receive a welcome email with login instructions.</span>
            </div>
            
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

              {(watchedUserType === 'partner' || watchedUserType === 'subcontractor' || watchedUserType === 'employee') && (
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedUserType && watchedUserType !== 'admin' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Organizations</Label>
                  <FormDescription>
                    Select the organizations this user should be associated with.
                  </FormDescription>
                  
                  {organizationsData?.organizations && organizationsData.organizations.length > 0 ? (
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                      <div className="space-y-2">
                        {organizationsData.organizations
                          .filter(org => org.is_active)
                          .map((org) => (
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
                              </label>
                            </div>
                          ))}
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
                         No organizations available. Create one to continue.
                       </AlertDescription>
                     </Alert>
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

              <Separator />

              <FormField
                control={form.control}
                name="send_welcome_email"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Send Welcome Email</FormLabel>
                      <FormDescription>
                        Send an email to the user with their login credentials and getting started information.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

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
      </DialogContent>
    </Dialog>
  );
}
