import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AllocationWorkflow } from "./AllocationWorkflow";
import { useReceipts } from "@/hooks/useReceipts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { mapOCRConfidenceToForm, type FormConfidence } from '@/utils/ocrUtils';
import { 
  Loader2, 
  Upload, 
  CheckCircle, 
  DollarSign, 
  FileText, 
  Calendar,
  Edit3,
  Camera,
  X,
  Sparkles,
  Building2,
  Copy,
  Plus,
  Calculator
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

// Common vendors for quick selection
const COMMON_VENDORS = [
  'Home Depot', 'Lowes', 'Menards', 'Harbor Freight',
  'Grainger', 'Ferguson', 'Shell', 'BP', 'Speedway',
  'Circle K', 'McDonald\'s', 'Subway', 'Jimmy Johns'
];

export function ReceiptUpload() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<FormConfidence>({});
  const [ocrData, setOcrData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showSuccess, setShowSuccess] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
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
        subtotal: ocrData?.subtotal,
        tax_amount: ocrData?.tax,
        ocr_confidence: ocrData?.confidence?.overall,
        line_items_extracted: Boolean(ocrData?.lineItems?.length),
        description: data.description,
        receipt_date: data.receipt_date,
        notes: data.notes,
        allocations,
        receipt_image: receiptFile || undefined,
        line_items: ocrData?.lineItems?.map((item: any) => ({
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })) || [],
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

  // Process image with Google Vision OCR
  const processWithOCR = async (file: File) => {
    setIsProcessingOCR(true);
    
    try {
      // Upload image to Supabase Storage first
      const timestamp = Date.now();
      const fileName = `temp_ocr_${timestamp}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('work-order-attachments')
        .upload(`receipts/temp/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('work-order-attachments')
        .getPublicUrl(uploadData.path);

      // Call OCR Edge Function
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('process-receipt', {
        body: { imageUrl: publicUrl }
      });

      if (ocrError) throw ocrError;

      // Debug OCR response
      console.group('🔍 OCR Debug');
      console.log('Raw OCR Response:', ocrData);
      console.log('Vendor:', ocrData?.vendor, 'Type:', typeof ocrData?.vendor);
      console.log('Total:', ocrData?.total, 'Type:', typeof ocrData?.total);
      console.log('Date:', ocrData?.date, 'Type:', typeof ocrData?.date);
      console.log('Confidence:', ocrData?.confidence);
      console.groupEnd();

      // Auto-fill form with OCR results
      if (ocrData && !ocrData.error) {
        // Fix vendor matching with normalization
        if (ocrData.vendor) {
          const normalizedVendor = COMMON_VENDORS.find(
            v => v.toLowerCase() === ocrData.vendor.toLowerCase()
          ) || ocrData.vendor;
          
          form.setValue('vendor_name', normalizedVendor, { 
            shouldValidate: true, 
            shouldDirty: true,
            shouldTouch: true 
          });
        }
        
        if (ocrData.total) {
          // Use the total (not subtotal)
          form.setValue('amount', ocrData.total, { 
            shouldValidate: true, 
            shouldDirty: true 
          });
        } else if (ocrData.subtotal && ocrData.tax) {
          // Fallback: calculate if needed
          const calculatedTotal = ocrData.subtotal + ocrData.tax;
          form.setValue('amount', calculatedTotal, { 
            shouldValidate: true, 
            shouldDirty: true 
          });
        }
        
        if (ocrData.date) {
          form.setValue('receipt_date', ocrData.date, { 
            shouldValidate: true, 
            shouldDirty: true 
          });
        }
        
        const mappedConfidence = mapOCRConfidenceToForm(ocrData.confidence || {});
        setOcrConfidence(mappedConfidence);
        setOcrData(ocrData);
        
        // Add haptic feedback on successful OCR
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        toast({
          title: '✨ Receipt Scanned!',
          description: 'Please verify the extracted information',
        });

        // Debug form values after setting
        setTimeout(() => {
          console.group('📝 Form Values After OCR');
          console.log('Form Vendor:', form.getValues('vendor_name'));
          console.log('Form Amount:', form.getValues('amount'));
          console.log('Form Date:', form.getValues('receipt_date'));
          console.groupEnd();
        }, 100);
      }

      // Clean up temp file
      await supabase.storage
        .from('work-order-attachments')
        .remove([`receipts/temp/${fileName}`]);

    } catch (error) {
      console.error('OCR processing error:', error);
      toast({
        variant: 'destructive',
        title: 'Scan Failed',
        description: 'Could not read receipt. Please enter manually.',
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Maximum size is 10MB',
      });
      return;
    }

    setReceiptFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Process with OCR
    await processWithOCR(file);
  };

  const handleFileRemove = () => {
    setReceiptFile(null);
    setImagePreview(null);
    setOcrConfidence({});
    setOcrData(null);
  };

  const handleCancel = () => {
    form.reset();
    setAllocations([]);
    setReceiptFile(null);
    setActiveTab("details");
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
      {/* Screen Reader Announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {availableWorkOrders.isLoading && "Loading work orders..."}
        {isUploading && "Uploading receipt..."}
        {showSuccess && "Receipt uploaded successfully!"}
      </div>

      {/* Error Announcements */}
      <div role="alert" aria-live="assertive" className="sr-only">
        {form.formState.errors.vendor_name?.message}
        {form.formState.errors.amount?.message}
        {form.formState.errors.receipt_date?.message}
      </div>

      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
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
            <div className="flex items-center gap-2">
              <CardTitle>Upload Receipt</CardTitle>
              {isProcessingOCR && (
                <Badge variant="secondary" className="animate-pulse">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Scanning...
                </Badge>
              )}
              {ocrConfidence.vendor_name && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Scanned
                </Badge>
              )}
            </div>
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
        <form onSubmit={form.handleSubmit(onSubmit)} role="form" aria-label="Receipt upload form">
          <div
            onTouchStart={isMobile ? onTouchStart : undefined}
            onTouchMove={isMobile ? onTouchMove : undefined}
            onTouchEnd={isMobile ? onTouchEnd : undefined}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} aria-label="Receipt upload steps">
              <TabsList className="grid w-full grid-cols-3 h-11" role="tablist">
                <TabsTrigger 
                  value="details" 
                  className="flex items-center gap-2 h-9"
                  role="tab"
                  aria-selected={activeTab === "details"}
                  aria-label="Receipt details step"
                >
                  Details
                  {isDetailsComplete && <CheckCircle className="h-4 w-4 text-green-600" aria-label="Completed" />}
                </TabsTrigger>
                <TabsTrigger 
                  value="allocate" 
                  disabled={!watchedAmount || watchedAmount <= 0} 
                  className="flex items-center gap-2 h-9"
                  role="tab"
                  aria-selected={activeTab === "allocate"}
                  aria-label="Work order allocation step"
                >
                  Allocate
                  {isAllocationComplete && <CheckCircle className="h-4 w-4 text-green-600" aria-label="Completed" />}
                </TabsTrigger>
                <TabsTrigger 
                  value="review" 
                  disabled={!isComplete} 
                  className="flex items-center gap-2 h-9"
                  role="tab"
                  aria-selected={activeTab === "review"}
                  aria-label="Review and submit step"
                >
                  Review
                </TabsTrigger>
              </TabsList>

            <TabsContent value="details" className="mt-6">
              <Card>
                <CardContent className="space-y-6 pt-6">
                  {/* Camera-First Receipt Capture */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Receipt Image</h3>
                    
                    {!imagePreview ? (
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-24 flex flex-col gap-2 border-dashed border-2 hover:border-primary/50"
                          onClick={() => cameraInputRef.current?.click()}
                        >
                          <Camera className="h-8 w-8" />
                          <span>Take Photo</span>
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          className="h-24 flex flex-col gap-2 border-dashed border-2 hover:border-primary/50"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-8 w-8" />
                          <span>Upload File</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Receipt" 
                          className="w-full rounded-lg max-h-64 object-contain bg-muted/20"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={handleFileRemove}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        
                        {isProcessingOCR && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <div className="text-white text-center">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                              <p>Extracting text...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Hidden inputs */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    
                    {receiptFile && !isProcessingOCR && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">{receiptFile.name}</span>
                        </div>
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
                              <FormLabel className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Vendor Name *
                                {ocrConfidence.vendor_name && (
                                  <ConfidenceBadge confidence={ocrConfidence.vendor_name} />
                                )}
                              </FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select or type vendor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {COMMON_VENDORS.map(vendor => (
                                      <SelectItem key={vendor} value={vendor}>
                                        {vendor}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
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
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Total Amount *
                              {ocrConfidence.amount && (
                                <ConfidenceBadge confidence={ocrConfidence.amount} />
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="h-11 text-lg font-medium"
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

                    {/* Line Items Section */}
                    {ocrData?.lineItems && ocrData.lineItems.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Items Detected
                            <Badge variant="secondary" className="text-xs">
                              {ocrData.lineItems.length} items
                            </Badge>
                            {ocrData.confidence?.lineItems && (
                              <ConfidenceBadge confidence={ocrData.confidence.lineItems} />
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {ocrData.lineItems.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-start text-sm border-b pb-2 last:border-b-0">
                                <div className="flex-1">
                                  {item.quantity && (
                                    <span className="font-medium mr-2">{item.quantity}x</span>
                                  )}
                                  <span className="text-muted-foreground">{item.description}</span>
                                </div>
                                <span className="font-medium">${item.total_price.toFixed(2)}</span>
                              </div>
                            ))}
                            
                            {/* Totals - Show all financial data */}
                            <div className="pt-2 space-y-1 border-t">
                              {ocrData.subtotal && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Subtotal:</span>
                                  <span>${ocrData.subtotal.toFixed(2)}</span>
                                </div>
                              )}
                              {ocrData.tax && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Tax:</span>
                                  <span>${ocrData.tax.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-medium text-base pt-1 border-t">
                                <span>Total:</span>
                                <span className="text-lg">
                                  ${(ocrData.total || (ocrData.subtotal + ocrData.tax) || 0).toFixed(2)}
                                </span>
                              </div>
                              
                              {/* Show calculation validation */}
                              {ocrData.subtotal && ocrData.tax && ocrData.total && (
                                Math.abs((ocrData.subtotal + ocrData.tax) - ocrData.total) > 0.01 && (
                                  <div className="text-xs text-amber-600 pt-1">
                                    ⚠️ Total doesn't match subtotal + tax
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                          
                          {/* Copy to description button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full mt-3"
                            onClick={() => {
                              const itemList = ocrData.lineItems
                                .map((item: any) => `${item.quantity ? item.quantity + 'x ' : ''}${item.description}`)
                                .join(', ');
                              form.setValue('description', itemList);
                              toast({
                                title: 'Items copied',
                                description: 'Line items have been added to the description field',
                              });
                            }}
                          >
                            <Copy className="h-3 w-3 mr-2" />
                            Use as Description
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Debug Panel - Only in development */}
                    {process.env.NODE_ENV === 'development' && ocrData && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                          🔍 OCR Debug Info
                        </summary>
                        <Card className="mt-2">
                          <CardContent className="p-4">
                            <div className="space-y-2 text-xs font-mono">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="font-semibold">Vendor:</span> {ocrData.vendor || 'Not found'}
                                </div>
                                <div>
                                  <span className="font-semibold">Confidence:</span> {ocrData.confidence?.vendor ? `${Math.round(ocrData.confidence.vendor * 100)}%` : 'N/A'}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <span className="font-semibold">Subtotal:</span> ${ocrData.subtotal?.toFixed(2) || '0.00'}
                                </div>
                                <div>
                                  <span className="font-semibold">Tax:</span> ${ocrData.tax?.toFixed(2) || '0.00'}
                                </div>
                                <div>
                                  <span className="font-semibold">Total:</span> ${ocrData.total?.toFixed(2) || '0.00'}
                                </div>
                              </div>
                              
                              <div>
                                <span className="font-semibold">Line Items:</span> {ocrData.lineItems?.length || 0} found
                              </div>
                              
                              {ocrData.lineItems && ocrData.lineItems.length > 0 && (
                                <div className="mt-2 p-2 bg-muted rounded">
                                  <div className="font-semibold mb-1">Extracted Items:</div>
                                  {ocrData.lineItems.map((item: any, idx: number) => (
                                    <div key={idx} className="text-xs">
                                      {item.quantity && `${item.quantity}x `}{item.description}: ${item.total_price}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <div className="mt-2">
                                <span className="font-semibold">Math Check:</span>
                                {ocrData.subtotal && ocrData.tax && (
                                  <span className={
                                    Math.abs((ocrData.subtotal + ocrData.tax) - ocrData.total) < 0.01 
                                      ? "text-green-600" 
                                      : "text-red-600"
                                  }>
                                    {' '}${ocrData.subtotal} + ${ocrData.tax} = ${(ocrData.subtotal + ocrData.tax).toFixed(2)}
                                    {Math.abs((ocrData.subtotal + ocrData.tax) - ocrData.total) > 0.01 && ' ⚠️ MISMATCH!'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </details>
                    )}

                    {/* Manual Corrections */}
                    {ocrData && (
                      <Card className="mt-4">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span>Quick Corrections</span>
                            <Badge variant="outline" className="text-xs">
                              Manual Override
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          {/* Add Missing Item */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              const item = prompt('Enter item description:');
                              const price = prompt('Enter price:');
                              if (item && price) {
                                setOcrData(prev => ({
                                  ...prev,
                                  lineItems: [...(prev?.lineItems || []), {
                                    description: item,
                                    total_price: parseFloat(price)
                                  }]
                                }));
                              }
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Missing Item
                          </Button>
                          
                          {/* Recalculate Total */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              if (ocrData?.subtotal && ocrData?.tax) {
                                const correct = ocrData.subtotal + ocrData.tax;
                                form.setValue('amount', correct, { shouldValidate: true });
                                setOcrData(prev => ({ ...prev, total: correct }));
                                toast({
                                  title: 'Total Recalculated',
                                  description: `New total: $${correct.toFixed(2)}`,
                                });
                              }
                            }}
                          >
                            <Calculator className="h-4 w-4 mr-2" />
                            Recalculate Total
                          </Button>
                          
                          {/* Clear and Manual Entry */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground"
                            onClick={() => {
                              setOcrData(null);
                              form.reset();
                              toast({
                                title: 'Cleared OCR Data',
                                description: 'Enter receipt details manually',
                              });
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Clear OCR & Enter Manually
                          </Button>
                        </CardContent>
                      </Card>
                    )}

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
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Allocate to Work Orders</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("details")}
                      className="flex items-center gap-2 text-primary"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Details
                    </Button>
                  </div>
                  
                  {availableWorkOrders.isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Card key={i}>
                          <CardContent className="p-4">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-6 w-full mb-1" />
                            <Skeleton className="h-4 w-32" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                     <AllocationWorkflow
                       workOrders={availableWorkOrders.data || []}
                       totalAmount={watchedAmount}
                       allocations={allocations.map(a => ({
                         work_order_id: a.work_order_id,
                         allocated_amount: a.allocated_amount,
                         allocation_notes: a.allocation_notes
                       }))}
                       onAllocationsChange={(newAllocations) => {
                         setAllocations(newAllocations.map(a => ({
                           work_order_id: a.work_order_id,
                           allocated_amount: a.allocated_amount,
                           allocation_notes: a.allocation_notes
                         })));
                       }}
                       vendor={form.watch("vendor_name")}
                     />
                  )}
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