import React, { useState, useRef, useEffect } from 'react';
import { SmartInput } from './SmartInput';
import { ConfidenceBadge } from './ConfidenceBadge';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineEditFieldProps {
  value: string | number | Date;
  onSave: (value: any) => void | Promise<void>;
  inputType: 'text' | 'currency' | 'date' | 'number';
  placeholder?: string;
  validation?: (value: any) => string | null;
  confidence?: number;
  suggestions?: string[];
  disabled?: boolean;
  className?: string;
  label?: string;
  formatDisplay?: (value: any) => string;
}

export const InlineEditField: React.FC<InlineEditFieldProps> = ({
  value,
  onSave,
  inputType,
  placeholder,
  validation,
  confidence,
  suggestions = [],
  disabled = false,
  className,
  label,
  formatDisplay
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleSave();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing, editValue]);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  };

  const handleSave = async () => {
    if (validation) {
      const validationError = validation(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        handleSave();
        break;
      case 'Escape':
        e.preventDefault();
        handleCancel();
        break;
    }
  };

  const getDisplayValue = () => {
    if (formatDisplay) {
      return formatDisplay(value);
    }

    switch (inputType) {
      case 'currency':
        return typeof value === 'number' ? `$${value.toFixed(2)}` : '$0.00';
      case 'date':
        return value instanceof Date ? value.toLocaleDateString() : 'No date';
      default:
        return value?.toString() || 'No value';
    }
  };

  if (isEditing) {
    return (
      <div ref={containerRef} className={cn("space-y-2", className)}>
        {label && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            {confidence !== undefined && (
              <ConfidenceBadge confidence={confidence} />
            )}
          </div>
        )}
        
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <SmartInput
              value={editValue}
              onChange={setEditValue}
              onKeyDown={handleKeyDown}
              type={inputType}
              placeholder={placeholder}
              suggestions={suggestions}
              autoFocus
              disabled={isSaving}
            />
            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 w-8 p-0"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group relative", className)}>
      {label && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{label}</span>
          {confidence !== undefined && (
            <ConfidenceBadge confidence={confidence} />
          )}
        </div>
      )}
      
      <div
        onClick={handleEdit}
        className={cn(
          "flex items-center justify-between p-2 rounded-md border transition-colors",
          disabled 
            ? "bg-muted cursor-not-allowed opacity-50" 
            : "cursor-pointer hover:bg-muted/50 hover:border-muted-foreground/50"
        )}
      >
        <span className={cn(
          "flex-1",
          !value && "text-muted-foreground"
        )}>
          {value ? getDisplayValue() : placeholder || 'Click to edit'}
        </span>
        
        {!disabled && (
          <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );
};