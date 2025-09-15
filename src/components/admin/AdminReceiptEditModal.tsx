import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Plus, Trash2, Edit } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminReceipts } from '@/hooks/useAdminReceipts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const editReceiptSchema = z.object({
  employee_user_id: z.string().optional(),
  vendor_name: z.string().min(1, 'Vendor name is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  subtotal: z.number().optional(),
  tax_amount: z.number().optional(),
  receipt_date: z.string().min(1, 'Receipt date is required'),
  description: z.string().optional(),
  notes: z.string().optional(),
  allocations: z.array(z.object({
    work_order_id: z.string().min(1, 'Work order is required'),
    allocated_amount: z.number().min(0.01, 'Allocated amount must be greater than 0'),
    allocation_notes: z.string().optional(),
  })).min(1, 'At least one allocation is required'),
});

type EditReceiptFormData = z.infer<typeof editReceiptSchema>;

interface AdminReceiptEditModalProps {
  receipt: {
    id: string;
    vendor_name: string;
    amount: number;
    subtotal?: number;
    tax_amount?: number;
    description?: string;
    receipt_date: string;
    notes?: string;
    employee_user_id: string;
    receipt_work_orders: Array<{
      id: string;
      work_order_id: string;
      allocated_amount: number;
      allocation_notes?: string;
      work_orders: {
        id: string;
        work_order_number: string;
        title: string;
      };
    }>;
  };
  trigger?: React.ReactNode;
}

export function AdminReceiptEditModal({ receipt, trigger }: AdminReceiptEditModalProps) {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { employees, workOrders } = useAdminReceipts();

  const form = useForm<EditReceiptFormData>({
    resolver: zodResolver(editReceiptSchema),
    defaultValues: {
      vendor_name: receipt.vendor_name,
      amount: receipt.amount,
      subtotal: receipt.subtotal,
      tax_amount: receipt.tax_amount,
      employee_user_id: receipt.employee_user_id,
      receipt_date: format(new Date(receipt.receipt_date), 'yyyy-MM-dd'),
      description: receipt.description || '',
      notes: receipt.notes || '',
      allocations: receipt.receipt_work_orders.map(allocation => ({
        work_order_id: allocation.work_order_id,
        allocated_amount: allocation.allocated_amount,
        allocation_notes: allocation.allocation_notes || '',
      })),
    },
  });

  const { watch, setValue, getValues } = form;
  const watchedAllocations = watch('allocations');
  const watchedAmount = watch('amount');

  const totalAllocated = watchedAllocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
  const remainingAmount = watchedAmount - totalAllocated;

  const updateReceiptMutation = useMutation({
    mutationFn: async (data: EditReceiptFormData) => {
      if (!profile?.id) throw new Error("No admin profile found");

      // Update the receipt
      const { error: receiptError } = await supabase
        .from("receipts")
        .update({
          employee_user_id: data.employee_user_id || profile.id,
          vendor_name: data.vendor_name,
          amount: data.amount,
          subtotal: data.subtotal,
          tax_amount: data.tax_amount,
          description: data.description,
          receipt_date: data.receipt_date,
          notes: data.notes,
        })
        .eq("id", receipt.id);

      if (receiptError) throw receiptError;

      // Delete existing allocations
      const { error: deleteError } = await supabase
        .from("receipt_work_orders")
        .delete()
        .eq("receipt_id", receipt.id);

      if (deleteError) throw deleteError;

      // Create new allocations
      const allocations = data.allocations.map(allocation => ({
        receipt_id: receipt.id,
        work_order_id: allocation.work_order_id,
        allocated_amount: allocation.allocated_amount,
        allocation_notes: allocation.allocation_notes,
      }));

      const { error: allocationError } = await supabase
        .from("receipt_work_orders")
        .insert(allocations);

      if (allocationError) throw allocationError;

      return receipt.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast({
        title: "Receipt Updated",
        description: "Receipt has been successfully updated.",
      });
      setOpen(false);
    },
    onError: (error) => {
      console.error("Receipt update error:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update receipt",
        variant: "destructive",
      });
    },
  });

  const addAllocation = () => {
    const currentAllocations = getValues('allocations');
    setValue('allocations', [
      ...currentAllocations,
      { work_order_id: '', allocated_amount: remainingAmount > 0 ? remainingAmount : 0, allocation_notes: '' }
    ]);
  };

  const removeAllocation = (index: number) => {
    const currentAllocations = getValues('allocations');
    if (currentAllocations.length > 1) {
      setValue('allocations', currentAllocations.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (data: EditReceiptFormData) => {
    // Validate allocations total
    const totalAllocated = data.allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
    if (Math.abs(totalAllocated - data.amount) > 0.01) {
      toast({
        title: "Allocation Error",
        description: `Total allocated (${totalAllocated.toFixed(2)}) must equal receipt amount (${data.amount.toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    await updateReceiptMutation.mutateAsync(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Receipt</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vendor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter vendor name" {...field} />
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
                      <FormLabel>Total Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
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
                      <FormLabel>Employee (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee (leave blank for direct allocation)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.data?.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.first_name} {employee.last_name} ({employee.email})
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
                      <FormLabel>Receipt Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="subtotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtotal (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Amount (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Work Order Allocations */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Work Order Allocations</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={Math.abs(remainingAmount) < 0.01 ? "default" : "destructive"}>
                      Remaining: ${remainingAmount.toFixed(2)}
                    </Badge>
                    <Badge variant="outline">
                      Total: ${totalAllocated.toFixed(2)} / ${watchedAmount.toFixed(2)}
                    </Badge>
                  </div>
                </div>

                {watchedAllocations.map((allocation, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Allocation {index + 1}</h4>
                      {watchedAllocations.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAllocation(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`allocations.${index}.work_order_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Work Order</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select work order" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {workOrders.data?.map((workOrder) => (
                                  <SelectItem key={workOrder.id} value={workOrder.id}>
                                    {workOrder.work_order_number} - {workOrder.title}
                                    {workOrder.organizations?.name && (
                                      <span className="text-muted-foreground"> ({workOrder.organizations.name})</span>
                                    )}
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
                            <FormLabel>Allocated Amount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
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
                          <FormLabel>Allocation Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter allocation notes" {...field} value={field.value || ''} />
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

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateReceiptMutation.isPending || Math.abs(totalAllocated - watchedAmount) > 0.01}
                  className="flex-1"
                >
                  {updateReceiptMutation.isPending ? "Updating..." : "Update Receipt"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}