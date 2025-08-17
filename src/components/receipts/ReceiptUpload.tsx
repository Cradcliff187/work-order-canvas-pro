import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { UniversalUploadSheet } from "@/components/upload/UniversalUploadSheet";
import { WorkOrderSelector } from "./WorkOrderSelector";
import { useReceipts } from "@/hooks/useReceipts";
import { 
  Loader2, 
  Upload, 
  CheckCircle, 
  DollarSign, 
  FileText, 
  Calendar,
  Edit3 
} from "lucide-react";
import { format } from "date-fns";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Allocation {
  work_order_id: string;
  allocated_amount: number;
  allocation_notes?: string;
}

const receiptSchema = z.object({
  vendor_name: z.string().min(1, "Vendor name is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  receipt_date: z.string().min(1, "Receipt date is required"),
  notes: z.string().optional(),
});

type ReceiptFormData = z.infer<typeof receiptSchema>;

export function ReceiptUpload() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const { availableWorkOrders, createReceipt, isUploading } = useReceipts();

  const form = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      vendor_name: "",
      amount: 0,
      description: "",
      receipt_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  const watchedAmount = form.watch("amount");
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
  const isValidAllocation = Math.abs(watchedAmount - totalAllocated) < 0.01;

  // Tab completion tracking
  const isDetailsComplete = form.watch("vendor_name") && 
                           form.watch("amount") > 0 && 
                           form.watch("receipt_date");

  const isAllocationComplete = isValidAllocation && allocations.length > 0;
  const isComplete = isDetailsComplete && isAllocationComplete;

  const onSubmit = async (data: ReceiptFormData) => {
    if (!isValidAllocation) {
      form.setError("amount", {
        message: "Amount must be fully allocated to work orders",
      });
      return;
    }

    if (allocations.length === 0) {
      form.setError("amount", {
        message: "At least one work order allocation is required",
      });
      return;
    }

    try {
      await createReceipt.mutateAsync({
        vendor_name: data.vendor_name,
        amount: data.amount,
        description: data.description,
        receipt_date: data.receipt_date,
        notes: data.notes,
        allocations,
        receipt_image: receiptFile || undefined,
      });

      // Reset form
      form.reset();
      setAllocations([]);
      setReceiptFile(null);
    } catch (error) {
      console.error("Receipt upload error:", error);
    }
  };

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setReceiptFile(files[0]);
    }
  };

  const handleFileRemove = () => {
    setReceiptFile(null);
  };

  const handleCancel = () => {
    form.reset();
    setAllocations([]);
    setReceiptFile(null);
    setActiveTab("details");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/receipts">Receipts</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Upload Receipt</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Card with Amount & Progress */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>Upload Receipt</CardTitle>
            {watchedAmount > 0 && (
              <div className="text-right">
                <div className="text-lg font-semibold">${watchedAmount.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
              </div>
            )}
          </div>
          {watchedAmount > 0 && (
            <div className="space-y-2 pt-4">
              <div className="flex justify-between text-sm">
                <span>Allocated: ${totalAllocated.toFixed(2)}</span>
                <span>Remaining: ${(watchedAmount - totalAllocated).toFixed(2)}</span>
              </div>
              <Progress value={(totalAllocated / watchedAmount) * 100} />
            </div>
          )}
        </CardHeader>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="details" className="flex items-center gap-2">
                Details
                {isDetailsComplete && <CheckCircle className="h-4 w-4 text-green-600" />}
              </TabsTrigger>
              <TabsTrigger value="allocate" disabled={!watchedAmount || watchedAmount <= 0} className="flex items-center gap-2">
                Allocate
                {isAllocationComplete && <CheckCircle className="h-4 w-4 text-green-600" />}
              </TabsTrigger>
              <TabsTrigger value="review" disabled={!isComplete} className="flex items-center gap-2">
                Review
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-6">
              <Card>
                <CardContent className="space-y-6 pt-6">
                  {/* Receipt Image Upload */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Receipt Image</h3>
                    <UniversalUploadSheet
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-20 border-dashed border-2 hover:border-primary/50"
                        >
                          <div className="text-center">
                            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm font-medium">Upload Receipt Image</p>
                            <p className="text-xs text-muted-foreground">Click to select image</p>
                          </div>
                        </Button>
                      }
                      onFilesSelected={handleFileSelect}
                      accept="image/*"
                      multiple={false}
                    />
                    {receiptFile && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">{receiptFile.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleFileRemove}
                          className="h-8"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Receipt Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="vendor_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter vendor name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="receipt_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Receipt Date *
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
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
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Additional notes about this receipt"
                              className="resize-none min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="allocate" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Allocate to Work Orders</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    Remaining: ${(watchedAmount - totalAllocated).toFixed(2)}
                  </div>
                </CardHeader>
                <CardContent>
                  <WorkOrderSelector
                    workOrders={availableWorkOrders.data || []}
                    allocations={allocations}
                    totalAmount={watchedAmount}
                    onAllocationChange={setAllocations}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="review" className="mt-6">
              <div className="space-y-6">
                {/* Receipt Summary */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>Receipt Summary</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("details")}
                        className="flex items-center gap-2"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit Details
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Vendor</label>
                        <p className="font-medium">{form.watch("vendor_name")}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Date</label>
                        <p className="font-medium">{form.watch("receipt_date")}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Amount</label>
                        <p className="font-medium">${watchedAmount.toFixed(2)}</p>
                      </div>
                    </div>
                    {form.watch("description") && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <p className="font-medium">{form.watch("description")}</p>
                      </div>
                    )}
                    {receiptFile && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Receipt Image</label>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{receiptFile.name}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Allocations Summary */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>Work Order Allocations</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("allocate")}
                        className="flex items-center gap-2"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit Allocation
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {allocations.map((allocation, index) => {
                        const workOrder = availableWorkOrders.data?.find(wo => wo.id === allocation.work_order_id);
                        return (
                          <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium">{workOrder?.work_order_number}</p>
                              <p className="text-sm text-muted-foreground">{workOrder?.title}</p>
                              {allocation.allocation_notes && (
                                <p className="text-xs text-muted-foreground mt-1">{allocation.allocation_notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${allocation.allocated_amount.toFixed(2)}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-between items-center pt-3 border-t font-semibold">
                        <span>Total Allocated:</span>
                        <span>${totalAllocated.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isUploading}
              className="min-w-[100px] h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !isComplete}
              className="min-w-[140px] h-10"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Submit Receipt"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}