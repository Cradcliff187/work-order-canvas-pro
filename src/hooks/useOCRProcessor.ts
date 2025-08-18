import { useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { mapOCRConfidenceToForm } from '@/utils/ocr-confidence-mapper';
import { logConfidenceDebug } from '@/utils/confidence-display';
import { getErrorForToast } from '@/components/receipts/ErrorDisplay';
import { supabase } from '@/integrations/supabase/client';

export interface OCRResult {
  vendor?: string;
  total?: number;
  date?: string;
  line_items?: Array<{
    description: string;
    amount: number;
  }>;
  confidence?: {
    vendor?: number;
    total?: number;
    date?: number;
  };
}

interface UseOCRProcessorProps {
  onOCRStart: () => void;
  onOCRProgress: (stage: string, progress: number) => void;
  onOCRSuccess: (result: OCRResult) => void;
  onOCRError: (error: any) => void;
  setRawOCRText: (text: string | null) => void;
  setDebugOCRData: (data: any) => void;
  isProcessingLocked: boolean;
}

export function useOCRProcessor({
  onOCRStart,
  onOCRProgress,
  onOCRSuccess,
  onOCRError,
  setRawOCRText,
  setDebugOCRData,
  isProcessingLocked,
}: UseOCRProcessorProps) {
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const processWithOCR = useCallback(async (file: File) => {
    // Check if already processing
    if (isProcessingLocked) {
      console.warn('OCR processing rejected - already locked');
      toast({
        title: 'Processing in Progress',
        description: 'Please wait for current processing to complete',
        variant: 'destructive',
      });
      return;
    }

    // Create new AbortController for this processing session
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      console.log('🚀 Starting OCR processing for file:', file.name);
      
      onOCRStart();
      onOCRProgress('Uploading', 10);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `receipt-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('work-order-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (signal.aborted) throw new Error('Processing cancelled');

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ File uploaded successfully:', uploadData);
      onOCRProgress('Processing', 50);

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('work-order-attachments')
        .getPublicUrl(fileName);

      console.log('📄 Processing receipt at URL:', publicUrl);

      // Call the edge function for OCR processing
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('process-receipt-ocr', {
        body: { 
          imageUrl: publicUrl,
          fileName: fileName,
          debug: process.env.NODE_ENV === 'development'
        }
      });

      if (signal.aborted) throw new Error('Processing cancelled');

      if (ocrError) {
        console.error('OCR processing error:', ocrError);
        throw new Error(`OCR processing failed: ${ocrError.message}`);
      }

      onOCRProgress('Analyzing', 85);

      console.log('📊 Raw OCR Response:', ocrData);

      // Store raw OCR response for debugging
      setRawOCRText(ocrData?.rawText || 'No raw text available');
      setDebugOCRData(ocrData);

      // Parse OCR result
      const ocrResult: OCRResult = {
        vendor: ocrData?.vendor || '',
        total: ocrData?.total || 0,
        date: ocrData?.date || '',
        line_items: ocrData?.line_items || [],
        confidence: ocrData?.confidence || {}
      };

      console.log('✅ Processed OCR Result:', ocrResult);

      // Map confidence values to form field names
      const mappedConfidence = mapOCRConfidenceToForm(ocrResult.confidence || {});
      logConfidenceDebug('OCR Processing', mappedConfidence);

      onOCRProgress('Complete', 100);
      onOCRSuccess(ocrResult);

      // Clean up uploaded file after processing
      const { error: deleteError } = await supabase.storage
        .from('work-order-attachments')
        .remove([fileName]);

      if (deleteError) {
        console.warn('Failed to clean up uploaded file:', deleteError);
      }

    } catch (error: any) {
      console.error('OCR processing error:', error);
      
      if (error.name === 'AbortError' || error.message?.includes('cancelled')) {
        console.log('OCR processing was cancelled by user');
        return;
      }

      const toastError = getErrorForToast(error);
      onOCRError(error);
      
      toast({
        title: toastError.title,
        description: toastError.description,
        variant: toastError.variant,
      });
    }
  }, [
    isProcessingLocked, 
    onOCRStart, 
    onOCRProgress, 
    onOCRSuccess, 
    onOCRError,
    setRawOCRText,
    setDebugOCRData,
    toast
  ]);

  const cancelOCR = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('User cancelled');
    }
  }, []);

  return {
    processWithOCR,
    cancelOCR,
  };
}