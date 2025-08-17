import React, { useState, useRef } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { WorkOrderSelector } from "./WorkOrderSelector";
import { useReceipts } from "@/hooks/useReceipts";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { 
  Loader2, 
  Upload, 
  CheckCircle, 
  DollarSign, 
  FileText, 
  Calendar,
  Edit3,
  Camera 
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  
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

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        // Reset form
        form.reset();
        setAllocations([]);
        setReceiptFile(null);
        setActiveTab("details");
      }, 2000);
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

  // Image compression utility
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileInputCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      try {
        const compressedFile = await compressImage(file);
        setReceiptFile(compressedFile);
      } catch (error) {
        console.error("Image compression error:", error);
        setReceiptFile(file); // Fallback to original file
      }
    }
  };

  // Touch gesture handling for tab navigation
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && activeTab === "details" && watchedAmount > 0) {
      setActiveTab("allocate");
    } else if (isLeftSwipe && activeTab === "allocate" && isComplete) {
      setActiveTab("review");
    } else if (isRightSwipe && activeTab === "review") {
      setActiveTab("allocate");
    } else if (isRightSwipe && activeTab === "allocate") {
      setActiveTab("details");
    }
  };

  return (
    <div className={cn("max-w-4xl mx-auto space-y-6", isMobile && "pb-20")}>
      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-80 mx-4">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4 animate-bounce" />
              <p className="text-lg font-medium">Receipt Uploaded!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your receipt has been saved and allocated successfully.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

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
          <div
            onTouchStart={isMobile ? onTouchStart : undefined}
            onTouchMove={isMobile ? onTouchMove : undefined}
            onTouchEnd={isMobile ? onTouchEnd : undefined}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 h-11">
                <TabsTrigger value="details" className="flex items-center gap-2 h-9">
                  Details
                  {isDetailsComplete && <CheckCircle className="h-4 w-4 text-green-600" />}
                </TabsTrigger>
                <TabsTrigger value="allocate" disabled={!watchedAmount || watchedAmount <= 0} className="flex items-center gap-2 h-9">
                  Allocate
                  {isAllocationComplete && <CheckCircle className="h-4 w-4 text-green-600" />}
                </TabsTrigger>
                <TabsTrigger value="review" disabled={!isComplete} className="flex items-center gap-2 h-9">
                  Review
                </TabsTrigger>
              </TabsList>

            <TabsContent value="details" className="mt-6">
              <Card>
                <CardContent className="space-y-6 pt-6">
                  {/* Receipt Image Upload */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Receipt Image</h3>
                    {isMobile ? (
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 flex items-center justify-center gap-2"
                          onClick={handleCameraCapture}
                        >
                          <Camera className="h-5 w-5" />
                          Take Photo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 flex items-center justify-center gap-2"
                          onClick={handleFileInputCapture}
                        >
                          <Upload className="h-5 w-5" />
                          Choose File
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-20 border-dashed border-2 hover:border-primary/50"
                        onClick={handleFileInputCapture}
                      >
                        <div className="text-center">
                          <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium">Upload Receipt Image</p>
                          <p className="text-xs text-muted-foreground">Click to select image</p>
                        </div>
                      </Button>
                    )}
                    
                    {/* Hidden file inputs */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileInputChange}
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
                          className="h-11"
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
                                <Input placeholder="Enter vendor name" className="h-11" {...field} />
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
                              <Input type="date" className="h-11" {...field} />
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
                                className="h-11"
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
                              <Input placeholder="Enter description" className="h-11" {...field} />
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
          </div>

          {/* Action Buttons */}
          <div className={cn(
            "flex justify-end gap-3 mt-6",
            isMobile && "fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-40"
          )}>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isUploading}
              className="h-11 min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !isComplete}
              className="h-11 min-w-[140px]"
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