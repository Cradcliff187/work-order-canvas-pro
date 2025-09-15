import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Plus, Minus, Receipt, User, Building } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { useAdminReceipts, type AdminCreateReceiptData } from '@/hooks/useAdminReceipts';

const receiptSchema = z.object({
  employee_user_id: z.string().optional(),
  vendor_name: z.string().min(1, 'Vendor name is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().optional(),
  receipt_date: z.string().min(1, 'Receipt date is required'),
  notes: z.string().optional(),
  allocations: z.array(z.object({
    work_order_id: z.string().min(1, 'Work order is required'),
    allocated_amount: z.number().min(0.01, 'Amount must be greater than 0'),
    allocation_notes: z.string().optional(),
  })).min(1, 'At least one allocation is required'),
});

type ReceiptFormData = z.infer<typeof receiptSchema>;

interface AdminReceiptCreateModalProps {
  trigger?: React.ReactNode;
}

export function AdminReceiptCreateModal({ trigger }: AdminReceiptCreateModalProps) {
  const [open, setOpen] = useState(false);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  
  const { employees, workOrders, createAdminReceipt, isUploading } = useAdminReceipts();

  const form = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      vendor_name: '',
      amount: 0,
      description: '',
      receipt_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      allocations: [{ work_order_id: '', allocated_amount: 0, allocation_notes: '' }],
    },
  });

  const watchedAllocations = form.watch('allocations');
  const watchedAmount = form.watch('amount');

  const totalAllocated = watchedAllocations.reduce((sum, allocation) => sum + (allocation.allocated_amount || 0), 0);
  const remainingAmount = watchedAmount - totalAllocated;

  const addAllocation = () => {
    const currentAllocations = form.getValues('allocations');
    form.setValue('allocations', [
      ...currentAllocations,
      { work_order_id: '', allocated_amount: remainingAmount > 0 ? remainingAmount : 0, allocation_notes: '' }
    ]);
  };

  const removeAllocation = (index: number) => {
    const currentAllocations = form.getValues('allocations');
    if (currentAllocations.length > 1) {
      form.setValue('allocations', currentAllocations.filter((_, i) => i !== index));
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReceiptImage(file);
    }
  };

  const onSubmit = async (data: ReceiptFormData) => {
    const receiptData: AdminCreateReceiptData = {
      employee_user_id: data.employee_user_id,
      vendor_name: data.vendor_name,
      amount: data.amount,
      description: data.description,
      receipt_date: data.receipt_date,
      notes: data.notes,
      allocations: data.allocations.map(allocation => ({
        work_order_id: allocation.work_order_id,
        allocated_amount: allocation.allocated_amount,
        allocation_notes: allocation.allocation_notes,
      })),
      receipt_image: receiptImage || undefined,
    };

    try {
      await createAdminReceipt.mutateAsync(receiptData);
      form.reset();
      setReceiptImage(null);
      setOpen(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const employeesList = employees.data || [];
  const workOrdersList = workOrders.data || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Receipt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Create Admin Receipt
          </DialogTitle>
          <DialogDescription>
            Create a receipt on behalf of an employee or directly for work orders.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Basic Receipt Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Receipt className="h-4 w-4" />
                  Receipt Details
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vendor_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Home Depot, Lowes, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Amount *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="employee_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <User className="h-4 w-4 inline mr-1" />
                          Employee (Optional)
                        </FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(val === '__none__' ? undefined : val)} 
                          value={field.value ?? '__none__'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee or leave blank" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">No specific employee</SelectItem>
                            {employeesList.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.first_name} {employee.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="receipt_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receipt Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the purchase..."
                          className="min-h-[60px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Receipt Image Upload */}
                <div className="space-y-2">
                  <Label>Receipt Image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {receiptImage && (
                    <Badge variant="outline" className="text-xs">
                      {receiptImage.name}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Work Order Allocations */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Building className="h-4 w-4" />
                    Work Order Allocations
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant={Math.abs(remainingAmount) < 0.01 ? 'default' : 'destructive'}>
                      Remaining: ${remainingAmount.toFixed(2)}
                    </Badge>
                    <Badge variant="outline">
                      Total: ${totalAllocated.toFixed(2)} / ${watchedAmount.toFixed(2)}
                    </Badge>
                  </div>
                </div>

                {watchedAllocations.map((_, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Allocation {index + 1}</span>
                      {watchedAllocations.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAllocation(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`allocations.${index}.work_order_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Work Order *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select work order" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {workOrdersList.map((wo) => (
                                  <SelectItem key={wo.id} value={wo.id}>
                                    {wo.work_order_number} - {wo.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`allocations.${index}.allocated_amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`allocations.${index}.allocation_notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Optional notes for this allocation..."
                              className="min-h-[50px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addAllocation}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Allocation
                </Button>
              </div>

              <Separator />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional notes about this receipt..."
                        className="min-h-[60px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || Math.abs(remainingAmount) > 0.01}
                >
                  {isUploading ? 'Creating...' : 'Create Receipt'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}