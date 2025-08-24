import { useCallback } from 'react';
import { isSupportedFileType } from '@/utils/fileUtils';

interface ValidationError {
  id: string;
  type: 'fileSize' | 'fileType' | 'duplicate' | 'maxFiles';
  fileName?: string;
  message: string;
  guidance: string;
  isDismissible: boolean;
}

interface UseFileValidationProps {
  maxFiles: number;
  maxSizeBytes: number;
  acceptedTypes?: string[];
  selectionMode?: 'accumulate' | 'replace';
}

interface ValidationResult {
  valid: File[];
  errors: ValidationError[];
}

export function useFileValidation({
  maxFiles,
  maxSizeBytes,
  acceptedTypes = [],
  selectionMode = 'replace'
}: UseFileValidationProps) {
  
  const isValidFileType = useCallback((file: File): boolean => {
    if (acceptedTypes.length > 0) {
      return acceptedTypes.includes(file.type);
    }
    return isSupportedFileType(file);
  }, [acceptedTypes]);

  const getFileType = useCallback((file: File): 'image' | 'document' => {
    return file.type.startsWith('image/') ? 'image' : 'document';
  }, []);

  const validateFiles = useCallback((files: File[], existingFiles: File[] = []): ValidationResult => {
    const errors: ValidationError[] = [];
    const valid: File[] = [];
    
    // For validation, consider the total that would exist after this selection
    const totalAfterSelection = selectionMode === 'accumulate' ? existingFiles.length + files.length : files.length;

    // Check file count against total after selection
    if (totalAfterSelection > maxFiles) {
      const remaining = selectionMode === 'accumulate' ? maxFiles - existingFiles.length : maxFiles;
      if (remaining <= 0) {
        errors.push({
          id: `maxFiles_${Date.now()}`,
          type: 'maxFiles',
          message: `Maximum ${maxFiles} files reached`,
          guidance: `Remove some files before adding more.`,
          isDismissible: true
        });
      } else {
        errors.push({
          id: `maxFiles_${Date.now()}`,
          type: 'maxFiles',
          message: `You can only add ${remaining} more file${remaining === 1 ? '' : 's'}`,
          guidance: `You currently have ${existingFiles.length} files selected out of ${maxFiles} maximum.`,
          isDismissible: true
        });
      }
      return { valid: [], errors };
    }

    files.forEach(file => {
      // Check file type
      if (!isValidFileType(file)) {
        const allowedFormats = acceptedTypes.length > 0 
          ? acceptedTypes.map(type => type.split('/')[1]?.toUpperCase()).join(', ')
          : 'JPEG, PNG, PDF, Word documents';
        errors.push({
          id: `fileType_${file.name}_${Date.now()}`,
          type: 'fileType',
          fileName: file.name,
          message: `${file.name} isn't supported`,
          guidance: `Try uploading ${allowedFormats} files instead.`,
          isDismissible: true
        });
        return;
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        const maxMB = Math.round(maxSizeBytes / 1024 / 1024);
        const fileMB = (file.size / 1024 / 1024).toFixed(1);
        errors.push({
          id: `fileSize_${file.name}_${Date.now()}`,
          type: 'fileSize',
          fileName: file.name,
          message: `${file.name} (${fileMB}MB) exceeds the ${maxMB}MB limit`,
          guidance: 'Please compress the file and try again.',
          isDismissible: true
        });
        return;
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
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  }, [maxFiles, maxSizeBytes, acceptedTypes, selectionMode, isValidFileType]);

  return {
    validateFiles,
    isValidFileType,
    getFileType
  };
}