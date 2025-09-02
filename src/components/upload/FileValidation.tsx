import { useState, useCallback, useEffect, useMemo } from 'react';
import { isSupportedFileType } from '@/utils/fileUtils';

// ============= VALIDATION INTERFACES =============

export interface ValidationError {
  id: string;
  type: 'fileSize' | 'fileType' | 'duplicate' | 'maxFiles';
  fileName?: string;
  message: string;
  guidance: string;
  isDismissible: boolean;
}

export interface ValidationOptions {
  maxFiles: number;
  maxSizeBytes: number;
  acceptedTypes: string[];
  selectionMode: 'accumulate' | 'replace';
}

export interface ValidationResult {
  valid: File[];
  errors: ValidationError[];
}

export interface FileRestrictions {
  types: string;
  size: string;
  count: number;
}

// ============= UTILITY FUNCTIONS =============

export const getFileType = (file: File): 'image' | 'document' => {
  return file.type.startsWith('image/') ? 'image' : 'document';
};

export const isValidFileType = (file: File, acceptedTypes: string[] = []): boolean => {
  if (acceptedTypes.length > 0) {
    return acceptedTypes.includes(file.type);
  }
  return isSupportedFileType(file);
};

export const isValidFileSize = (file: File, maxSizeBytes: number): boolean => {
  return file.size <= maxSizeBytes;
};

export const isSupportedImageType = (file: File): boolean => {
  return file.type.startsWith('image/') && ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
};

export const validateFile = (file: File, options: ValidationOptions, existingFiles: File[] = []): ValidationResult => {
  const errors: ValidationError[] = [];

  // Check file type
  if (!isValidFileType(file, options.acceptedTypes)) {
    const allowedFormats = options.acceptedTypes.length > 0 
      ? options.acceptedTypes.map(type => type.split('/')[1]?.toUpperCase()).join(', ')
      : 'JPEG, PNG, PDF, Word documents';
    errors.push({
      id: `fileType_${file.name}_${Date.now()}`,
      type: 'fileType',
      fileName: file.name,
      message: `${file.name} isn't supported`,
      guidance: `Try uploading ${allowedFormats} files instead.`,
      isDismissible: true
    });
  }

  // Check file size
  if (!isValidFileSize(file, options.maxSizeBytes)) {
    const maxMB = Math.round(options.maxSizeBytes / 1024 / 1024);
    const fileMB = (file.size / 1024 / 1024).toFixed(1);
    errors.push({
      id: `fileSize_${file.name}_${Date.now()}`,
      type: 'fileSize',
      fileName: file.name,
      message: `${file.name} (${fileMB}MB) exceeds the ${maxMB}MB limit`,
      guidance: 'Please compress the file and try again.',
      isDismissible: true
    });
  }

  // Check for duplicates against existing files
  const isDuplicate = existingFiles.some(existingFile => 
    existingFile.name === file.name && existingFile.size === file.size
  );
  if (isDuplicate) {
    errors.push({
      id: `duplicate_${file.name}_${Date.now()}`,
      type: 'duplicate',
      fileName: file.name,
      message: `${file.name} is already selected`,
      guidance: 'Choose a different file or rename it.',
      isDismissible: true
    });
  }

  return {
    valid: errors.length === 0 ? [file] : [],
    errors
  };
};

export const getValidationErrors = (files: File[], options: ValidationOptions, existingFiles: File[] = []): ValidationResult => {
  const errors: ValidationError[] = [];
  const valid: File[] = [];
  
  // For validation, consider the total that would exist after this selection
  const totalAfterSelection = options.selectionMode === 'accumulate' ? existingFiles.length + files.length : files.length;

  // Check file count against total after selection
  if (totalAfterSelection > options.maxFiles) {
    const remaining = options.selectionMode === 'accumulate' ? options.maxFiles - existingFiles.length : options.maxFiles;
    if (remaining <= 0) {
      errors.push({
        id: `maxFiles_${Date.now()}`,
        type: 'maxFiles',
        message: `Maximum ${options.maxFiles} files reached`,
        guidance: `Remove some files before adding more.`,
        isDismissible: true
      });
    } else {
      errors.push({
        id: `maxFiles_${Date.now()}`,
        type: 'maxFiles',
        message: `You can only add ${remaining} more file${remaining === 1 ? '' : 's'}`,
        guidance: `You currently have ${existingFiles.length} files selected out of ${options.maxFiles} maximum.`,
        isDismissible: true
      });
    }
    return { valid: [], errors };
  }

  files.forEach(file => {
    const result = validateFile(file, options, existingFiles);
    if (result.valid.length > 0) {
      valid.push(...result.valid);
    }
    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
  });

  return { valid, errors };
};

export const dismissError = (errors: ValidationError[], errorId: string): ValidationError[] => {
  return errors.filter(error => error.id !== errorId);
};

export const getFileRestrictions = (options: ValidationOptions): FileRestrictions => {
  const maxMB = Math.round(options.maxSizeBytes / 1024 / 1024);
  const supportedTypes = options.acceptedTypes.length > 0 
    ? options.acceptedTypes.map(type => {
        if (type.includes('image')) return 'Images';
        if (type.includes('pdf')) return 'PDFs'; 
        if (type.includes('word') || type.includes('document')) return 'Word docs';
        if (type.includes('sheet') || type.includes('excel')) return 'Excel files';
        return type.split('/')[1]?.toUpperCase();
      }).filter(Boolean).join(', ')
    : 'Images, PDFs, Word docs, Excel files';
  
  return {
    types: supportedTypes,
    size: `${maxMB}MB`,
    count: options.maxFiles
  };
};

// ============= VALIDATION HOOK =============

export interface UseFileValidationProps {
  maxFiles: number;
  maxSizeBytes: number;
  acceptedTypes: string[];
  selectionMode: 'accumulate' | 'replace';
  files?: File[]; // Current files for auto-clearing resolved errors
}

export interface UseFileValidationReturn {
  errors: ValidationError[];
  validateFiles: (newFiles: File[], existingFiles?: File[]) => ValidationResult;
  dismissError: (errorId: string) => void;
  clearErrors: () => void;
  getFileRestrictions: () => FileRestrictions;
}

export const useFileValidation = ({
  maxFiles,
  maxSizeBytes,
  acceptedTypes,
  selectionMode,
  files = []
}: UseFileValidationProps): UseFileValidationReturn => {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const options = useMemo((): ValidationOptions => ({
    maxFiles,
    maxSizeBytes,
    acceptedTypes,
    selectionMode
  }), [maxFiles, maxSizeBytes, acceptedTypes, selectionMode]);

  const validateFilesCallback = useCallback((newFiles: File[], existingFiles: File[] = []): ValidationResult => {
    const result = getValidationErrors(newFiles, options, existingFiles);
    setErrors(result.errors);
    return result;
  }, [options]);

  const dismissErrorCallback = useCallback((errorId: string) => {
    setErrors(prev => dismissError(prev, errorId));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getFileRestrictionsCallback = useCallback((): FileRestrictions => {
    return getFileRestrictions(options);
  }, [options]);

  // Auto-clear validation errors when the underlying issue is resolved
  useEffect(() => {
    setErrors(currentErrors => {
      return currentErrors.filter(error => {
        // Keep max files error if we're still over the limit
        if (error.type === 'maxFiles' && files.length >= maxFiles) {
          return true;
        }
        
        // Keep file-specific errors if the file still exists
        if (error.fileName) {
          const fileStillExists = files.some(f => f.name === error.fileName);
          return fileStillExists;
        }
        
        // Keep other errors
        return true;
      });
    });
  }, [files, maxFiles]);

  return {
    errors,
    validateFiles: validateFilesCallback,
    dismissError: dismissErrorCallback,
    clearErrors,
    getFileRestrictions: getFileRestrictionsCallback
  };
};
