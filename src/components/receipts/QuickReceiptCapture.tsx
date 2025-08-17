import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useReceipts } from '@/hooks/useReceipts';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// Icons
import { 
  Camera, Receipt, Loader2, CheckCircle,
  DollarSign, Building2, Sparkles, X,
  Upload, Zap
} from 'lucide-react';

// Common vendors for quick selection
const COMMON_VENDORS = [
  'Home Depot', 'Lowes', 'Menards', 'Harbor Freight',
  'Shell', 'BP', 'Speedway', 'Circle K',
  'McDonald\'s', 'Subway', 'Jimmy Johns'
];

// Quick amount buttons
const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

export function QuickReceiptCapture() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<Record<string, number>>({});
  
  const { availableWorkOrders, createReceipt, isUploading } = useReceipts();

  // Form schema
  const schema = z.object({
    vendor_name: z.string().min(1, 'Vendor is required'),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    receipt_date: z.string(),
    work_order_id: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      vendor_name: '',
      amount: 0,
      receipt_date: format(new Date(), 'yyyy-MM-dd'),
      work_order_id: '',
    },
  });

  // Process image with Google Vision OCR
  const processWithOCR = async (file: File) => {
    setIsProcessing(true);
    
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
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('process-receipt', {
        body: { imageUrl: publicUrl }
      });

      if (ocrError) throw ocrError;

      // Auto-fill form with OCR results
      if (ocrData) {
        if (ocrData.vendor) form.setValue('vendor_name', ocrData.vendor);
        if (ocrData.total) form.setValue('amount', ocrData.total);
        if (ocrData.date) form.setValue('receipt_date', ocrData.date);
        
        setOcrConfidence(ocrData.confidence || {});
        
        toast({
          title: '✨ Receipt Scanned!',
          description: 'Please verify the extracted information',
        });
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
      setIsProcessing(false);
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
        description: 'Please use a file smaller than 10MB',
      });
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Process with OCR
    await processWithOCR(file);
  };

  // Submit handler
  const onSubmit = async (data: any) => {
    if (!imageFile) {
      toast({
        variant: 'destructive',
        title: 'No receipt image',
        description: 'Please capture or upload a receipt image',
      });
      return;
    }

    try {
      await createReceipt.mutateAsync({
        vendor_name: data.vendor_name,
        amount: data.amount,
        receipt_date: data.receipt_date,
        allocations: data.work_order_id ? [{
          work_order_id: data.work_order_id,
          allocated_amount: data.amount,
        }] : [],
        receipt_image: imageFile,
      });

      // Reset form
      form.reset();
      setImageFile(null);
      setImagePreview(null);
      
      toast({
        title: '✅ Receipt Saved!',
        description: 'Your expense has been recorded',
      });
      
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-20">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Quick Receipt
            </div>
            {isProcessing && (
              <Badge variant="secondary" className="animate-pulse">
                <Sparkles className="h-3 w-3 mr-1" />
                Scanning...
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Snap, scan, and save in seconds
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Camera/Upload Selection */}
      {!imagePreview && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-16 flex flex-col gap-1"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs">Camera</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-16 flex flex-col gap-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-6 w-6" />
                <span className="text-xs">Upload</span>
              </Button>
            </div>
            
            {/* Hidden file inputs */}
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
          </CardContent>
        </Card>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Receipt" 
                className="w-full rounded-lg max-h-48 object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  setImagePreview(null);
                  setImageFile(null);
                  form.reset();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Vendor */}
          <Card>
            <CardContent className="p-4">
              <FormField
                control={form.control}
                name="vendor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Vendor
                      {ocrConfidence.vendor && (
                        <Badge variant={ocrConfidence.vendor > 0.7 ? 'default' : 'secondary'}>
                          {Math.round(ocrConfidence.vendor * 100)}%
                        </Badge>
                      )}
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          placeholder="Enter vendor name"
                          className="h-11"
                          {...field}
                        />
                        {/* Quick vendor buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {COMMON_VENDORS.slice(0, 6).map(vendor => (
                            <Button
                              key={vendor}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => field.onChange(vendor)}
                            >
                              {vendor}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Amount */}
          <Card>
            <CardContent className="p-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Amount
                      {ocrConfidence.total && (
                        <Badge variant={ocrConfidence.total > 0.7 ? 'default' : 'secondary'}>
                          {Math.round(ocrConfidence.total * 100)}%
                        </Badge>
                      )}
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="h-11 text-lg"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                        {/* Quick amount buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {QUICK_AMOUNTS.map(amount => (
                            <Button
                              key={amount}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => field.onChange(amount)}
                            >
                              ${amount}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Work Order Allocation */}
          {form.watch('amount') > 0 && (
            <Card>
              <CardContent className="p-4">
                <FormField
                  control={form.control}
                  name="work_order_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quick Allocate (Optional)
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select work order" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableWorkOrders.data?.slice(0, 5).map(wo => (
                              <SelectItem key={wo.id} value={wo.id}>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    {wo.work_order_number}
                                  </Badge>
                                  <span className="truncate">{wo.title}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isUploading || isProcessing || !imageFile}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Save Receipt
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}