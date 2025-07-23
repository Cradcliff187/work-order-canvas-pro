import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DollarSign } from 'lucide-react';
import { Employee, useEmployeeMutations, UpdateEmployeeRatesData } from '@/hooks/useEmployees';

const editRatesSchema = z.object({
  hourly_cost_rate: z.number().min(0, 'Cost rate must be positive').optional().or(z.literal('')),
  hourly_billable_rate: z.number().min(0, 'Billable rate must be positive').optional().or(z.literal('')),
});

type EditRatesFormData = z.infer<typeof editRatesSchema>;

interface EditEmployeeRatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function EditEmployeeRatesModal({ open, onOpenChange, employee }: EditEmployeeRatesModalProps) {
  const { updateEmployeeRates } = useEmployeeMutations();
  
  const form = useForm<EditRatesFormData>({
    resolver: zodResolver(editRatesSchema),
    defaultValues: {
      hourly_cost_rate: employee?.hourly_cost_rate || '',
      hourly_billable_rate: employee?.hourly_billable_rate || '',
    },
  });

  // Reset form when employee changes
  React.useEffect(() => {
    if (employee) {
      form.reset({
        hourly_cost_rate: employee.hourly_cost_rate || '',
        hourly_billable_rate: employee.hourly_billable_rate || '',
      });
    }
  }, [employee, form]);

  const onSubmit = async (data: EditRatesFormData) => {
    if (!employee) return;

    const ratesData: UpdateEmployeeRatesData = {
      hourly_cost_rate: data.hourly_cost_rate === '' ? undefined : Number(data.hourly_cost_rate),
      hourly_billable_rate: data.hourly_billable_rate === '' ? undefined : Number(data.hourly_billable_rate),
    };

    try {
      await updateEmployeeRates.mutateAsync({
        employeeId: employee.id,
        ...ratesData,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update employee rates:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Edit Billing Rates
          </DialogTitle>
          <DialogDescription>
            Update hourly rates for {employee.first_name} {employee.last_name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormDescription>
                    Internal cost per hour for this employee
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
                  <FormDescription>
                    Rate charged to clients for this employee's time
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateEmployeeRates.isPending}>
                {updateEmployeeRates.isPending ? 'Updating...' : 'Update Rates'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}