import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, CheckCircle, Building2, AlertCircle } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { supabase } from '@/integrations/supabase/client';
import { QuickOrganizationForm } from './QuickOrganizationForm';

// Enhanced schema with better validation
const createUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  user_type: z.enum(['admin', 'partner', 'subcontractor', 'employee']).optional(),
  organization_id: z.string().optional(),
  phone: z.string().optional(),
}).refine((data) => {
  // User type is required
  if (!data.user_type) {
    return false;
  }
  // Non-admin users should have an organization
  if (data.user_type !== 'admin' && (!data.organization_id || data.organization_id === '')) {
    return false;
  }
  return true;
}, {
  message: "Please select a user type and organization (if applicable)",
  path: ["user_type"],
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
  const [organizationTab, setOrganizationTab] = useState<'existing' | 'new'>('existing');
  const { data: organizations, refetch: refetchOrganizations } = useOrganizations();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      user_type: undefined,  // No default selection
      organization_id: '',
      phone: '',
    },
  });

  const watchedUserType = form.watch('user_type');

  // Reset organization when user type changes
  useEffect(() => {
    if (form.formState.isDirty && watchedUserType) {
      form.setValue('organization_id', '');
      setOrganizationTab('existing');
    }
  }, [watchedUserType, form]);

  const onSubmit = async (data: CreateUserFormData) => {
    // Extra validation
    if (!data.user_type) {
      toast({
        variant: "destructive",
        title: "Please select a user type",
        description: "You must choose what type of user to create",
      });
      return;
    }

    if (data.user_type !== 'admin' && !data.organization_id) {
      toast({
        variant: "destructive",
        title: "Organization required",
        description: `${data.user_type === 'partner' ? 'Partners' : data.user_type === 'subcontractor' ? 'Subcontractors' : 'Employees'} must be assigned to an organization`,
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const hasOrganization = data.organization_id && data.organization_id !== '';
      
      console.log('Creating user:', {
        ...data,
        organization_ids: hasOrganization ? [data.organization_id] : [],
      });
      
      // Use the edge function to create user
      const { data: result, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          userData: {
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            user_type: data.user_type,
            phone: data.phone || '',
            organization_ids: hasOrganization ? [data.organization_id] : [],
          },
          send_welcome_email: true,
        },
      });

      if (error) throw error;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create user');
      }

      // Show success state
      setShowSuccess(true);
      
      // Close modal after showing success
      setTimeout(() => {
        form.reset();
        setShowSuccess(false);
        setOrganizationTab('existing');
        onOpenChange(false);
        
        toast({
          title: "User created successfully",
          description: `Welcome email sent to ${data.email}`,
        });
      }, 2000);
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create user",
      });
      setIsLoading(false);
    }
  };

  const filteredOrganizations = organizations?.filter(org => {
    switch (watchedUserType) {
      case 'partner':
        return org.organization_type === 'partner';
      case 'subcontractor':
        return org.organization_type === 'subcontractor';
      case 'employee':
        return org.organization_type === 'internal';
      default:
        return true;
    }
  });

  const showOrganizationField = watchedUserType && watchedUserType !== 'admin';

  const handleOrganizationCreated = async (newOrg: any) => {
    // Refresh organizations list
    await refetchOrganizations();
    
    // Set the new organization as selected
    form.setValue('organization_id', newOrg.id);
    
    // Switch back to existing tab
    setOrganizationTab('existing');
    
    toast({
      title: "Organization created",
      description: `${newOrg.name} has been created and selected`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New User
          </DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">User Created Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                A welcome email has been sent with login instructions.
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} disabled={isLoading} />
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
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} disabled={isLoading} />
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
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} disabled={isLoading} />
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
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="(555) 123-4567" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* User Type and Organization */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Role & Organization</h3>
                
                <FormField
                  control={form.control}
                  name="user_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Type *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose user type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                          <SelectItem value="subcontractor">Subcontractor</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {!field.value && "Select the type of user you want to create"}
                        {field.value === 'admin' && "Admins have full system access"}
                        {field.value === 'partner' && "Partners can manage work orders for their properties"}
                        {field.value === 'subcontractor' && "Subcontractors can view and complete assigned work"}
                        {field.value === 'employee' && "Employees are internal staff members"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showOrganizationField && (
                  <div className="space-y-4">
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        {watchedUserType === 'partner' && "Partners must be assigned to a partner organization"}
                        {watchedUserType === 'subcontractor' && "Subcontractors must be assigned to a subcontractor organization"}
                        {watchedUserType === 'employee' && "Employees should be assigned to the internal organization"}
                      </AlertDescription>
                    </Alert>

                    <Tabs value={organizationTab} onValueChange={(v) => setOrganizationTab(v as 'existing' | 'new')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="existing">Select Existing</TabsTrigger>
                        <TabsTrigger value="new">Create New</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="existing" className="space-y-4">
                        <FormField
                          control={form.control}
                          name="organization_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Organization *
                              </FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value || ''}
                                disabled={isLoading}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select organization..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {!filteredOrganizations || filteredOrganizations.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                      No {watchedUserType === 'partner' ? 'partner' : 
                                           watchedUserType === 'subcontractor' ? 'subcontractor' : 
                                           'internal'} organizations available
                                    </SelectItem>
                                  ) : (
                                    filteredOrganizations.map((org) => (
                                      <SelectItem key={org.id} value={org.id}>
                                        <div className="flex items-center gap-2">
                                          <Building2 className="h-4 w-4" />
                                          <span>{org.name}</span>
                                          <span className="text-muted-foreground">({org.initials})</span>
                                        </div>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      
                      <TabsContent value="new">
                        <QuickOrganizationForm
                          onOrganizationCreated={handleOrganizationCreated}
                          organizationType={
                            watchedUserType === 'partner' ? 'partner' :
                            watchedUserType === 'subcontractor' ? 'subcontractor' :
                            'internal'
                          }
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>

              <Alert>
                <AlertDescription>
                  The new user will receive an email with instructions to set up their password and access the system.
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setOrganizationTab('existing');
                    onOpenChange(false);
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !watchedUserType}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
} 