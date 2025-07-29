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
import { filterOrganizationsByUserType } from '@/lib/utils/userOrgMapping';

// Remove password from schema - system will handle it
const createUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  user_type: z.enum(['admin', 'partner', 'subcontractor', 'employee']),
  organization_id: z.string().optional(),
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
      user_type: undefined,
      organization_id: undefined,
      phone: '',
    },
  });

  // Reset organization when user type changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'user_type') {
        form.setValue('organization_id', undefined);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data: CreateUserFormData) => {
    const debugId = `USER_CREATE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      setIsLoading(true);
      
      console.group(`🔧 [FRONTEND DEBUG ${debugId}] User Creation Flow Started`);
      console.log('📋 Form Data Received:', {
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        userType: data.user_type,
        phone: data.phone,
        organizationId: data.organization_id,
        organizationProvided: data.organization_id && data.organization_id !== 'none',
        timestamp: new Date().toISOString()
      });

      const requestPayload = {
        userData: {
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          user_type: data.user_type,
          phone: data.phone || '',
          organization_ids: data.organization_id && data.organization_id !== 'none' ? [data.organization_id] : [],
        },
      };

      console.log('📤 Sending to create-admin-user edge function:', requestPayload);
      console.log('🎯 Organization processing:', {
        rawOrganizationId: data.organization_id,
        isNone: data.organization_id === 'none',
        finalOrganizationIds: requestPayload.userData.organization_ids,
        organizationIdsLength: requestPayload.userData.organization_ids.length
      });
      
      // Use the existing edge function to create user properly
      // Database trigger will automatically handle profile creation and welcome email
      const { data: result, error } = await supabase.functions.invoke('create-admin-user', {
        body: requestPayload,
      });

      console.log('📥 Edge function response:', {
        result,
        error,
        hasResult: !!result,
        hasError: !!error,
        resultSuccess: result?.success,
        resultMessage: result?.message
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }
      
      if (!result.success) {
        console.error('❌ Edge function returned failure:', result);
        throw new Error(result.message || 'Failed to create user');
      }

      console.log('✅ User creation successful:', result);
      console.groupEnd();

      // Show success state
      setShowSuccess(true);
      
      // Close modal after showing success
      setTimeout(() => {
        form.reset();
        setShowSuccess(false);
        onOpenChange(false);
        
        // Show toast after modal closes
        toast({
          title: "User created successfully",
          description: `Welcome email sent to ${data.email}`,
        });
      }, 2000);
      
    } catch (error: any) {
      console.error(`❌ [FRONTEND DEBUG ${debugId}] User creation failed:`, {
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        fullError: error,
        timestamp: new Date().toISOString()
      });
      console.groupEnd();
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create user",
      });
      setIsLoading(false);
    }
  };

  const watchedUserType = form.watch('user_type');
  const filteredOrganizations = watchedUserType && organizations 
    ? filterOrganizationsByUserType(organizations, watchedUserType)
    : [];

  // Show organization field for non-admin users
  const showOrganizationField = watchedUserType !== 'admin';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1 pr-6 h-[calc(90vh-200px)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
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
                          <FormLabel>Last Name *</FormLabel>
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
                        <FormLabel>Email *</FormLabel>
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
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="user_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="partner">Partner</SelectItem>
                            <SelectItem value="subcontractor">Subcontractor</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showOrganizationField && (
                    <FormField
                      control={form.control}
                      name="organization_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select organization (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No organization</SelectItem>
                              {filteredOrganizations?.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Alert>
                    <AlertDescription>
                      The new user will receive an email with instructions to set up their password and access the system.
                    </AlertDescription>
                  </Alert>
                </div>
              </ScrollArea>

              <DialogFooter className="flex-shrink-0 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
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