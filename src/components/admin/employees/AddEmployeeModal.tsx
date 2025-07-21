
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormattedInput } from '@/components/ui/formatted-input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Copy, User, Mail, DollarSign } from 'lucide-react';
import { useEmployeeMutations, CreateEmployeeData } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';

const createEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  organization_id: z.string().optional(), // Reference to organization instead of company_name
  hourly_cost_rate: z.number().min(0, 'Cost rate must be positive').optional().or(z.literal('')),
  hourly_billable_rate: z.number().min(0, 'Billable rate must be positive').optional().or(z.literal('')),
});

type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddEmployeeModal({ open, onOpenChange, onSuccess }: AddEmployeeModalProps) {
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  
  const { toast } = useToast();
  const { createEmployee } = useEmployeeMutations();
  
  const form = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      organization_id: '',
      hourly_cost_rate: '',
      hourly_billable_rate: '',
    },
  });

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const onSubmit = async (data: CreateEmployeeFormData) => {
    try {
      const tempPassword = generatePassword();
      
      await createEmployee.mutateAsync({
        email: data.email!,
        first_name: data.first_name!,
        last_name: data.last_name!,
        phone: data.phone,
        organization_id: data.organization_id, // Updated to use organization_id
        hourly_cost_rate: data.hourly_cost_rate === '' ? undefined : Number(data.hourly_cost_rate),
        hourly_billable_rate: data.hourly_billable_rate === '' ? undefined : Number(data.hourly_billable_rate),
        
      });

      // For demo purposes, show generated credentials
      setGeneratedCredentials({
        email: data.email,
        password: tempPassword,
      });
      setShowCredentials(true);
      
      // Reset form but keep modal open to show credentials
      form.reset();
      
      onSuccess();
    } catch (error) {
      console.error('Failed to create employee:', error);
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
        description: "Employee credentials have been copied to clipboard.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showCredentials ? 'Employee Created Successfully' : 'Add New Employee'}
          </DialogTitle>
          <DialogDescription>
            {showCredentials 
              ? 'The employee has been created. Please save these credentials securely.'
              : 'Fill in the details to create a new employee account.'
            }
          </DialogDescription>
        </DialogHeader>

        {showCredentials && generatedCredentials ? (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Employee Credentials
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Email:</span>
                  <code className="bg-background px-2 py-1 rounded text-sm">
                    {generatedCredentials.email}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span>Temporary Password:</span>
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
              <span>Please save these credentials and share them with the employee securely.</span>
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
                      <FormattedInput 
                        formatter="email"
                        placeholder="john.doe@company.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <FormattedInput 
                          formatter="phone"
                          placeholder="(555) 123-4567" 
                          {...field} 
                        />
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
                      <FormLabel>Organization (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Organization ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Billing Rates (Optional)
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hourly_cost_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Cost Rate</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              step="0.01" 
                              min="0"
                              placeholder="0.00"
                              className="pl-9"
                              {...field}
                              value={field.value === '' ? '' : field.value}
                              onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Internal cost per hour
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hourly_billable_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Billable Rate</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              step="0.01" 
                              min="0"
                              placeholder="0.00"
                              className="pl-9"
                              {...field}
                              value={field.value === '' ? '' : field.value}
                              onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Rate charged to clients
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEmployee.isPending}>
                  {createEmployee.isPending ? 'Creating...' : 'Create Employee'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
