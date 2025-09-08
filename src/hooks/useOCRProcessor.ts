import { useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { mapOCRConfidenceToForm } from '@/utils/ocr-confidence-mapper';
import { logConfidenceDebug } from '@/utils/confidence-display';
import { getErrorForToast } from '@/components/receipts/ErrorDisplay';
import { supabase } from '@/integrations/supabase/client';
import type { OCRResult } from '@/types/ocr';

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
  const currentProcessIdRef = useRef<string | null>(null);

  const processWithOCR = useCallback(async (file: File) => {
    // Generate unique process ID for deduplication
    const processId = `ocr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
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

    // Cancel any existing OCR process before starting new one
    if (abortControllerRef.current) {
      console.log('🔄 Cancelling previous OCR process before starting new one');
      abortControllerRef.current.abort('New process started');
    }

    // Set current process ID and create new AbortController
    currentProcessIdRef.current = processId;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    console.log(`🚀 Starting OCR processing [${processId}] for file:`, file.name);

    try {
      // Check if this process was cancelled before we even started
      if (signal.aborted || currentProcessIdRef.current !== processId) {
        throw new Error('Processing cancelled before start');
      }
      
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

      if (signal.aborted || currentProcessIdRef.current !== processId) {
        throw new Error('Processing cancelled');
      }

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log(`✅ [${processId}] File uploaded successfully:`, uploadData);
      onOCRProgress('Processing', 50);

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('work-order-attachments')
        .getPublicUrl(fileName);

      console.log(`📄 [${processId}] Processing receipt at URL:`, publicUrl);

      // Call the edge function for OCR processing
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('process-receipt', {
        body: { 
          imageUrl: publicUrl,
          fileName: fileName,
          debug: process.env.NODE_ENV === 'development'
        }
      });

      if (signal.aborted || currentProcessIdRef.current !== processId) {
        throw new Error('Processing cancelled');
      }

      if (ocrError) {
        console.error('OCR processing error:', ocrError);
        throw new Error(`OCR processing failed: ${ocrError.message}`);
      }

      onOCRProgress('Analyzing', 85);

      console.log(`📊 [${processId}] Raw OCR Response:`, ocrData);

      // Store raw OCR response for debugging
      setRawOCRText(ocrData?.rawText || 'No raw text available');
      setDebugOCRData(ocrData);

      // Parse OCR result
      const ocrResult: OCRResult = {
        vendor: ocrData?.vendor || '',
        total: ocrData?.total || 0,
        date: ocrData?.date || '',
        lineItems: ocrData?.line_items || [],
        line_items: ocrData?.line_items || [],
        confidence: ocrData?.confidence || {}
      };

      console.log(`✅ [${processId}] Processed OCR Result:`, ocrResult);

      // Final check before success - ensure this process wasn't cancelled
      if (signal.aborted || currentProcessIdRef.current !== processId) {
        throw new Error('Processing cancelled before completion');
      }

      // Map confidence values to form field names
      const mappedConfidence = mapOCRConfidenceToForm(ocrResult.confidence || {});
      logConfidenceDebug('OCR Processing', mappedConfidence);

      onOCRProgress('Complete', 100);
      onOCRSuccess(ocrResult);

      // Clean up uploaded file after processing (don't trigger onOCRError for cleanup failures)
      try {
        const { error: deleteError } = await supabase.storage
          .from('work-order-attachments')
          .remove([fileName]);

        if (deleteError) {
          console.warn('Failed to clean up uploaded file:', deleteError);
        }
      } catch (cleanupError) {
        console.warn('Cleanup error (non-critical):', cleanupError);
      }

    } catch (error: any) {
      console.error(`❌ [${processId}] OCR processing error:`, error);
      
      if (error.name === 'AbortError' || error.message?.includes('cancelled')) {
        console.log(`🔄 [${processId}] OCR processing was cancelled by user or superseded`);
        return;
      }

      // Only trigger error handling if this is still the current process
      if (currentProcessIdRef.current === processId) {
        const toastError = getErrorForToast(error);
        onOCRError(error);
        
        toast({
          title: toastError.title,
          description: toastError.description,
          variant: toastError.variant,
        });
      } else {
        console.log(`🔄 [${processId}] Ignoring error from superseded process`);
      }
    } finally {
      // Clear current process ID if this was the current process
      if (currentProcessIdRef.current === processId) {
        currentProcessIdRef.current = null;
      }
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
      console.log(`🛑 User cancelled OCR process [${currentProcessIdRef.current}]`);
      abortControllerRef.current.abort('User cancelled');
      currentProcessIdRef.current = null;
    }
  }, []);

  return {
    processWithOCR,
    cancelOCR,
  };
}