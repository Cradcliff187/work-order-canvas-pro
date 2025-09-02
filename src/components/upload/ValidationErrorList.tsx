import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type ValidationError } from './FileValidation';

interface ValidationErrorListProps {
  errors: ValidationError[];
  onDismissError: (errorId: string) => void;
}

export function ValidationErrorList({ errors, onDismissError }: ValidationErrorListProps) {
  if (errors.length === 0) return null;

  return (
    <div className="space-y-2" role="region" aria-live="assertive" aria-label="Upload errors">
      {errors.map((error) => (
        <Alert key={error.id} variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="flex items-start justify-between space-x-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">{error.message}</p>
              <p className="text-xs opacity-90">{error.guidance}</p>
            </div>
            {error.isDismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismissError(error.id)}
                className="h-6 w-6 p-0 text-destructive-foreground hover:bg-destructive/20"
                aria-label={`Dismiss error for ${error.fileName || 'upload'}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}