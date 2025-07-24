import { useEffect, useRef, useCallback } from 'react';
import { UseFormWatch, UseFormGetValues } from 'react-hook-form';
import { useOfflineStorage } from './useOfflineStorage';
import { useNetworkStatus } from './useNetworkStatus';
import type { PhotoAttachment } from '@/types/offline';

interface AutoSaveConfig {
  workOrderId: string;
  watch: UseFormWatch<any>;
  getValues: UseFormGetValues<any>;
  photos: PhotoAttachment[];
  enabled?: boolean;
  intervalMs?: number;
  skipFields?: string[];
}

export function useDraftAutoSave({
  workOrderId,
  watch,
  getValues,
  photos,
  enabled = true,
  intervalMs = 30000, // 30 seconds
  skipFields = ['photos'], // Fields to skip during auto-save
}: AutoSaveConfig) {
  const { saveDraft, isReady } = useOfflineStorage();
  const { isOnline } = useNetworkStatus();
  const lastSaveRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedDraftId = useRef<string | null>(null);

  // Watch for form changes
  const formData = watch();

  const performAutoSave = useCallback(async () => {
    if (!enabled || !isReady || !workOrderId) return;

    try {
      const currentValues = getValues();
      
      // Create a serializable version of the data (excluding skipFields)
      const saveData = Object.keys(currentValues).reduce((acc, key) => {
        if (!skipFields.includes(key)) {
          acc[key] = currentValues[key];
        }
        return acc;
      }, {} as any);

      // Convert to string to check for changes
      const dataString = JSON.stringify(saveData);
      
      // Only save if data has changed
      if (dataString !== lastSaveRef.current) {
        lastSaveRef.current = dataString;
        
        // Check if we have enough content to warrant saving
        const hasContent = saveData.workPerformed?.trim().length > 10 ||
                          saveData.hoursWorked > 0 ||
                          photos.length > 0;

        if (hasContent) {
          lastSavedDraftId.current = await saveDraft(
            workOrderId,
            saveData,
            photos,
            false // isManual = false for auto-save
          );
        }
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [enabled, isReady, workOrderId, getValues, skipFields, saveDraft, photos]);

  // Auto-save on interval
  useEffect(() => {
    if (!enabled || !isReady) return;

    const interval = setInterval(performAutoSave, intervalMs);
    return () => clearInterval(interval);
  }, [enabled, isReady, intervalMs, performAutoSave]);

  // Auto-save on form changes (debounced)
  useEffect(() => {
    if (!enabled || !isReady) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(performAutoSave, 5000); // 5 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, enabled, isReady, performAutoSave]);

  // Auto-save when going offline
  useEffect(() => {
    if (!isOnline && enabled && isReady) {
      performAutoSave();
    }
  }, [isOnline, enabled, isReady, performAutoSave]);

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (enabled && isReady) {
        // Synchronous save attempt (may not complete)
        performAutoSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, isReady, performAutoSave]);

  const manualSave = useCallback(async () => {
    if (!enabled || !isReady || !workOrderId) return null;

    try {
      const currentValues = getValues();
      const saveData = Object.keys(currentValues).reduce((acc, key) => {
        if (!skipFields.includes(key)) {
          acc[key] = currentValues[key];
        }
        return acc;
      }, {} as any);

      return await saveDraft(
        workOrderId,
        saveData,
        photos,
        true // isManual = true
      );
    } catch (error) {
      console.error('Manual save failed:', error);
      throw error;
    }
  }, [enabled, isReady, workOrderId, getValues, skipFields, saveDraft, photos]);

  return {
    manualSave,
    lastSavedDraftId: lastSavedDraftId.current,
    isAutoSaveEnabled: enabled && isReady,
  };
}