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
import { Progress } from "@/components/ui/progress";
import { useReceipts } from "@/hooks/useReceipts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { isIOS, isAndroid, getCameraAttribute } from "@/utils/mobileDetection";
import { isSupportedFileType, formatFileSize, SUPPORTED_IMAGE_TYPES } from "@/utils/fileUtils";
import { FieldGroup } from "./FieldGroup";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { 
  Loader2, 
  Upload, 
  CheckCircle, 
  DollarSign, 
  FileText, 
  Calendar,
  Camera,
  X,
  Sparkles,
  Building2,
  AlertCircle,
  Plus,
  Calculator,
  Briefcase,
  List,
  PenTool
} from "lucide-react";
import { format } from "date-fns";

// TypeScript interfaces
interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
}

interface OCRResult {
  vendor: string;
  total: number;
  date: string;
  confidence: {
    vendor: number;
    total: number;
    lineItems: number;
    date: number;
  };
  subtotal?: number;
  tax?: number;
  lineItems: LineItem[];
}

interface SmartReceiptFormData {
  vendor_name: string;
  amount: number;
  description?: string;
  receipt_date: string;
  notes?: string;
  work_order_id?: string;
}

// Form validation schema
const receiptSchema = z.object({
  vendor_name: z.string().min(1, "Vendor name is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  receipt_date: z.string().min(1, "Receipt date is required"),
  notes: z.string().optional(),
  work_order_id: z.string().optional(),
});

// Common vendors for quick selection
const COMMON_VENDORS = [
  'Home Depot', 'Lowes', 'Menards', 'Harbor Freight',
  'Grainger', 'Ferguson', 'Shell', 'BP', 'Speedway',
  'Circle K', 'McDonald\'s', 'Subway', 'Jimmy Johns'
];

// Quick amount buttons for mobile
const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

// File size limit (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function SmartReceiptFlow() {
  // State management
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrData, setOcrData] = useState<OCRResult | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<Record<string, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Hooks
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const { availableWorkOrders, createReceipt, isUploading } = useReceipts();

  // Form setup
  const form = useForm<SmartReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      vendor_name: "",
      amount: 0,
      description: "",
      receipt_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      work_order_id: "",
    },
  });

  // OCR processing function (preserves exact implementation)
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

      // Call Edge Function for OCR
      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('process-receipt', {
        body: { imageUrl: publicUrl }
      });

      if (ocrError) throw ocrError;

      // Auto-fill form with OCR results
      if (ocrResult) {
        if (ocrResult.vendor) form.setValue('vendor_name', ocrResult.vendor);
        if (ocrResult.total) form.setValue('amount', ocrResult.total);
        if (ocrResult.date) form.setValue('receipt_date', ocrResult.date);
        
        setOcrData(ocrResult);
        setOcrConfidence(ocrResult.confidence || {});
        
        toast({
          title: '✨ Receipt Scanned!',
          description: `Found ${ocrResult.vendor || 'vendor'} - $${ocrResult.total || 0}`,
        });
      }

      // Clean up temp file
      await supabase.storage
        .from('work-order-attachments')
        .remove([uploadData.path]);

    } catch (error: any) {
      console.error('OCR processing error:', error);
      toast({
        title: 'OCR Failed',
        description: 'Could not read receipt. Please enter details manually.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // File handling functions
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File Too Large',
        description: `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`,
        variant: 'destructive',
      });
      return;
    }

    if (!isSupportedFileType(file) && !SUPPORTED_IMAGE_TYPES.includes(file.type) && file.type !== 'application/pdf') {
      toast({
        title: 'Unsupported File Type',
        description: 'Please upload an image (JPEG, PNG, WebP, HEIC) or PDF file',
        variant: 'destructive',
      });
      return;
    }

    setReceiptFile(file);

    // Create image preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Process with OCR
      await processWithOCR(file);
    } else {
      // For PDFs, no preview but still process OCR
      setImagePreview(null);
      await processWithOCR(file);
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
    setImagePreview(null);
    setOcrData(null);
    setOcrConfidence({});
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Form submission
  const onSubmit = async (data: SmartReceiptFormData) => {
    try {
      const receiptData = {
        vendor_name: data.vendor_name,
        amount: data.amount,
        description: data.description || '',
        receipt_date: data.receipt_date,
        notes: data.notes || '',
        allocations: data.work_order_id ? [{ 
          work_order_id: data.work_order_id, 
          allocated_amount: data.amount 
        }] : [],
        receipt_image: receiptFile,
      };

        await createReceipt.mutateAsync(receiptData);

      // Success state
      setShowSuccess(true);
      setTimeout(() => {
        // Reset form and state
        form.reset();
        removeFile();
        setShowSuccess(false);
      }, 2000);

      toast({
        title: 'Receipt Saved!',
        description: 'Your receipt has been processed and saved.',
      });

    } catch (error: any) {
      console.error('Receipt submission error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save receipt',
        variant: 'destructive',
      });
    }
  };

  // Get confidence indicator
  const getConfidenceColor = (field: string) => {
    const confidence = ocrConfidence[field] || 0;
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.5) return 'text-warning';
    return 'text-destructive';
  };

  // Render confidence badge
  const renderConfidenceBadge = (field: string, value: any) => {
    if (!ocrData || !ocrConfidence[field]) return null;
    
    const confidence = ocrConfidence[field];
    const variant = confidence >= 0.8 ? 'default' : confidence >= 0.5 ? 'secondary' : 'destructive';
    
    return (
      <Badge variant={variant} className="ml-2 text-xs">
        {Math.round(confidence * 100)}% confident
      </Badge>
    );
  };

  if (showSuccess) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Receipt Saved!</h3>
          <p className="text-muted-foreground">Your receipt has been processed and saved successfully.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Camera/Upload Capture Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Smart Receipt Capture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!imagePreview && !receiptFile ? (
            <div className="space-y-4">
              {/* Mobile-optimized capture buttons */}
              {isMobile ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-20 flex-col"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="h-6 w-6 mb-2" />
                    <span className="text-sm">Camera</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-20 flex-col"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 mb-2" />
                    <span className="text-sm">Upload</span>
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Upload Receipt or Invoice</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag and drop or click to select files
                    </p>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Browse Files
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Supports images (JPEG, PNG, WebP, HEIC) and PDF files up to {formatFileSize(MAX_FILE_SIZE)}
              </p>
            </div>
          ) : (
            /* Image Preview Section */
            <div className="space-y-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Receipt preview"
                    className="w-full max-h-64 object-contain rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : receiptFile ? (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{receiptFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(receiptFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}

              {/* OCR Processing Status */}
              {isProcessingOCR && (
                <div className="flex items-center justify-center py-4 space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Reading receipt with AI...</span>
                </div>
              )}
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture={getCameraAttribute() === 'camera' ? 'user' : getCameraAttribute() === 'environment' ? 'environment' : undefined}
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

      {/* Progressive Review Form Section - Only show after file selection */}
      {(ocrData || receiptFile) && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Essential Details - Always Open */}
            <FieldGroup
              title="Essential Details"
              icon={<FileText className="h-4 w-4" />}
              defaultOpen={true}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vendor Name */}
                <FormField
                  control={form.control}
                  name="vendor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Vendor Name
                        {ocrConfidence.vendor && (
                          <ConfidenceBadge confidence={ocrConfidence.vendor * 100} />
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input placeholder="Enter vendor name" {...field} />
                          {isMobile && (
                            <div className="flex flex-wrap gap-2">
                              {COMMON_VENDORS.slice(0, 6).map((vendor) => (
                                <Button
                                  key={vendor}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => form.setValue('vendor_name', vendor)}
                                >
                                  {vendor}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Amount
                        {ocrConfidence.total && (
                          <ConfidenceBadge confidence={ocrConfidence.total * 100} />
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                          {isMobile && (
                            <div className="flex flex-wrap gap-2">
                              {QUICK_AMOUNTS.map((amount) => (
                                <Button
                                  key={amount}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => form.setValue('amount', amount)}
                                >
                                  ${amount}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Receipt Date */}
                <FormField
                  control={form.control}
                  name="receipt_date"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Receipt Date
                        {ocrConfidence.date && (
                          <ConfidenceBadge confidence={ocrConfidence.date * 100} />
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="md:w-1/2" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FieldGroup>

            {/* Assign to Project */}
            {availableWorkOrders.data && availableWorkOrders.data.length > 0 && (
              <FieldGroup
                title="Assign to Project"
                icon={<Briefcase className="h-4 w-4" />}
                badge={form.watch('work_order_id') && (
                  <Badge variant="secondary" className="ml-2">
                    Assigned
                  </Badge>
                )}
              >
                <FormField
                  control={form.control}
                  name="work_order_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Order (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select work order..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No work order</SelectItem>
                          {availableWorkOrders.data?.map((wo) => (
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
              </FieldGroup>
            )}

            {/* Line Items */}
            {ocrData?.lineItems && ocrData.lineItems.length > 0 && (
              <FieldGroup
                title="Line Items"
                icon={<List className="h-4 w-4" />}
                badge={
                  <Badge variant="secondary" className="ml-2">
                    {ocrData.lineItems.length} items
                  </Badge>
                }
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                    <span>Description</span>
                    <span>Quantity × Price</span>
                    <span className="text-right">Total</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {ocrData.lineItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-3 gap-4 text-sm p-2 bg-muted rounded">
                        <span className="font-medium">{item.description}</span>
                        <span className="text-muted-foreground">
                          {item.quantity && item.unit_price 
                            ? `${item.quantity} × $${item.unit_price.toFixed(2)}`
                            : 'N/A'
                          }
                        </span>
                        <span className="text-right font-medium">
                          ${item.total_price?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {(ocrData.subtotal || ocrData.tax || ocrData.total) && (
                    <div className="border-t pt-4 space-y-2">
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
                      {ocrData.total && (
                        <div className="flex justify-between font-medium border-t pt-2">
                          <span>Total:</span>
                          <span>${ocrData.total.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick correction buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const item = prompt('Enter item description:');
                        const price = prompt('Enter price:');
                        if (item && price) {
                          setOcrData(prev => ({
                            ...prev!,
                            lineItems: [...(prev?.lineItems || []), {
                              description: item,
                              total_price: parseFloat(price)
                            }]
                          }));
                        }
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Item
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (ocrData?.subtotal && ocrData?.tax) {
                          const correct = ocrData.subtotal + ocrData.tax;
                          form.setValue('amount', correct, { shouldValidate: true });
                          setOcrData(prev => ({ ...prev!, total: correct }));
                          toast({
                            title: 'Total Recalculated',
                            description: `New total: $${correct.toFixed(2)}`,
                          });
                        }
                      }}
                    >
                      <Calculator className="h-3 w-3 mr-1" />
                      Recalculate
                    </Button>
                  </div>
                </div>
              </FieldGroup>
            )}

            {/* Additional Details */}
            <FieldGroup
              title="Additional Details"
              icon={<PenTool className="h-4 w-4" />}
              badge={form.watch('notes') && (
                <Badge variant="secondary" className="ml-2">
                  Notes added
                </Badge>
              )}
            >
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this receipt..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FieldGroup>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isUploading || isProcessingOCR}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving Receipt...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Receipt
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}

    </div>
  );
}