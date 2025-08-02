import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, CheckCircle } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { supabase } from '@/integrations/supabase/client';

// Phase 7: Organization-based user creation (no user_type)
const createUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  organization_id: z.string().min(1, 'Organization is required'),
  organization_role: z.enum(['admin', 'manager', 'employee', 'member']),
  phone: z.string().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserModal({ open, onOpenChange }: CreateUserModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { data: organizations } = useOrganizations();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      organization_id: '',
      organization_role: 'member',
      phone: '',
    },
  });

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      setIsLoading(true);
      
      console.log('🔧 Creating user via Edge Function:', {
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        organizationId: data.organization_id,
        organizationRole: data.organization_role,
      });

      // Call the Edge Function instead of database function
      const response = await supabase.functions.invoke('create-admin-user', {
        body: {
          userData: {
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            organization_id: data.organization_id,
            organization_role: data.organization_role,
            phone: data.phone || undefined,
          }
        }
      });

      // Handle Edge Function response
      if (response.error) {
        console.error('❌ Edge Function error:', response.error);
        throw new Error(response.error.message || 'Failed to create user');
      }

      // Check the response data
      const responseData = response.data;
      if (!responseData?.success) {
        console.error('❌ User creation failed:', responseData);
        throw new Error(responseData?.message || 'User creation failed');
      }

      console.log('✅ User created successfully:', responseData);

      setShowSuccess(true);
      
      toast({
        title: "Success",
        description: responseData.message || "User created successfully. They will receive an email to set their password.",
      });

      // Don't auto-close, let user manually close

    } catch (error: any) {
      console.error('❌ User creation failed:', error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create user",
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
      case 'subcontractor':
        return [
          { value: 'member', label: 'Member' }
        ];
      default:
        return [{ value: 'member', label: 'Member' }];
    }
  };

  const availableRoles = selectedOrg ? getAvailableRoles(selectedOrg.organization_type) : [];

  // Reset role when organization changes
  useEffect(() => {
    if (selectedOrg) {
      const firstAvailableRole = availableRoles[availableRoles.length - 1]?.value || 'member';
      form.setValue('organization_role', firstAvailableRole as any);
    }
  }, [selectedOrg, availableRoles, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col"
        aria-describedby="create-user-description"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <p id="create-user-description" className="text-sm text-muted-foreground">
            Add a new user to your organization with appropriate permissions.
          </p>
        </DialogHeader>

        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-green-700">User Created Successfully!</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                The user has been created and will receive an email with instructions to set their password.
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
              <ScrollArea className="flex-1 overflow-auto pr-6">
                <div className="space-y-6 pb-6">
                  {/* Personal Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Personal Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

                  {/* Contact Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Contact Information
                    </h4>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Organization Assignment Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Organization Assignment
                    </h4>
                    <div className="space-y-4">
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

                      {selectedOrg && (
                        <Alert>
                          <AlertDescription>
                            User will be created in the <strong>{selectedOrg.organization_type}</strong> organization "{selectedOrg.name}" 
                            with the role of <strong>{form.watch('organization_role')}</strong>.
                            {selectedOrg.organization_type !== 'internal' && (
                              <><br /><strong>Note:</strong> {selectedOrg.organization_type} organizations can only have member roles.</>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </form>
          </Form>
        )}

        <DialogFooter className="flex-shrink-0 pt-6">
          {showSuccess ? (
            <Button type="button" onClick={() => {
              setShowSuccess(false);
              onOpenChange(false);
              form.reset();
            }}>
              Close
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                onClick={form.handleSubmit(onSubmit)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}