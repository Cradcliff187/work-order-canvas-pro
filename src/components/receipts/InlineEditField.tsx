import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { SmartInput } from './SmartInput';
import { ConfidenceBadge } from './ConfidenceBadge';
import { Button } from '@/components/ui/button';
import { Check, Loader2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  validateField, 
  getFormatExamples, 
  getFieldSuggestions, 
  shouldHighlightField, 
  getConfidenceHighlight,
  type FieldType,
  type ValidationResult 
} from '@/utils/receiptValidation';

interface InlineEditFieldProps {
  value: string | number | Date;
  onSave: (value: any) => void | Promise<void>;
  inputType: 'text' | 'currency' | 'date' | 'number';
  fieldType?: FieldType;
  placeholder?: string;
  validation?: (value: any) => string | null;
  confidence?: number;
  suggestions?: string[];
  disabled?: boolean;
  className?: string;
  label?: string;
  formatDisplay?: (value: any) => string;
  enableRealtimeValidation?: boolean;
}

const InlineEditFieldComponent: React.FC<InlineEditFieldProps> = ({
  value,
  onSave,
  inputType,
  fieldType,
  placeholder,
  validation,
  confidence,
  suggestions = [],
  disabled = false,
  className,
  label,
  formatDisplay,
  enableRealtimeValidation = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFormatExample, setShowFormatExample] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce edit value for validation to improve performance
  const debouncedEditValue = useDebounce(editValue, 300);

  useEffect(() => {
    setEditValue(value);
    // Reset validation when value changes
    if (fieldType && enableRealtimeValidation) {
      const result = validateField(fieldType, value, confidence);
      setValidationResult(result);
    }
  }, [value, fieldType, confidence, enableRealtimeValidation]);

  // Real-time validation with improved debouncing
  useEffect(() => {
    if (isEditing && fieldType && enableRealtimeValidation) {
      const result = validateField(fieldType, debouncedEditValue, confidence);
      setValidationResult(result);
      
      // Only set error for severe issues to avoid blocking
      if (result.severity === 'error') {
        setError(result.message);
      } else {
        setError(null);
      }
    }
  }, [debouncedEditValue, isEditing, fieldType, confidence, enableRealtimeValidation]);

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

  const handleEdit = useCallback(() => {
    if (disabled) return;
    setIsEditing(true);
    setError(null);
    setShowSuggestions(false);
    setShowFormatExample(true);
  }, [disabled]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
    setShowSuggestions(false);
    setShowFormatExample(false);
    setValidationResult(null);
  }, [value]);

  const handleSave = useCallback(async () => {
    // Progressive validation - allow save even with warnings
    if (fieldType && enableRealtimeValidation) {
      const result = validateField(fieldType, editValue, confidence);
      if (result.severity === 'error') {
        setError(result.message);
        return;
      }
    }

    // Legacy validation fallback
    if (validation) {
      const validationError = validation(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    if (editValue === value) {
      setIsEditing(false);
      setShowFormatExample(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
      setError(null);
      setShowFormatExample(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [fieldType, enableRealtimeValidation, editValue, confidence, validation, value, onSave]);

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

  const handleSuggestionClick = useCallback(async (suggestion: string) => {
    setEditValue(suggestion);
    // Auto-save when suggestion is selected
    if (validation) {
      const validationError = validation(suggestion);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave(suggestion);
      setIsEditing(false);
      setShowSuggestions(false);
      setError(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [validation, onSave]);

  const getDisplayValue = useMemo(() => {
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
  }, [formatDisplay, value, inputType]);

  // Memoize expensive computations for performance
  const smartSuggestions = useMemo(() => {
    return fieldType 
      ? getFieldSuggestions(fieldType, typeof editValue === 'string' ? editValue : '') 
      : suggestions;
  }, [fieldType, editValue, suggestions]);
  
  const topSuggestions = useMemo(() => smartSuggestions.slice(0, 4), [smartSuggestions]);
  
  const formatExamples = useMemo(() => {
    return fieldType ? getFormatExamples(fieldType) : [];
  }, [fieldType]);
  
  const shouldHighlight = useMemo(() => shouldHighlightField(confidence), [confidence]);
  const confidenceHighlight = useMemo(() => getConfidenceHighlight(confidence), [confidence]);

  if (isEditing) {
    return (
      <motion.div 
        ref={containerRef} 
        className={cn("space-y-2", className)}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        {label && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            {confidence !== undefined && (
              <ConfidenceBadge confidence={confidence} />
            )}
          </div>
        )}
        
        <div className="relative">
          <SmartInput
            value={editValue}
            onChange={setEditValue}
            onKeyDown={handleKeyDown}
            type={inputType}
            placeholder={placeholder}
            suggestions={[]}
            autoFocus
            disabled={isSaving}
            className={cn(
              "w-full transition-all duration-200",
              shouldHighlight && confidenceHighlight
            )}
          />
          
          {isSaving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {/* Real-time validation feedback */}
          <AnimatePresence>
            {validationResult && !isSaving && (
              <motion.div 
                className="flex items-start gap-2 mt-2 text-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {validationResult.severity === 'error' && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  {validationResult.severity === 'warning' && (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
                  {validationResult.severity === 'info' && (
                    <Info className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={cn(
                    "font-medium",
                    validationResult.severity === 'error' && "text-destructive",
                    validationResult.severity === 'warning' && "text-warning",
                    validationResult.severity === 'info' && "text-muted-foreground"
                  )}>
                    {validationResult.message}
                  </p>
                  {validationResult.suggestion && (
                    <p className="text-muted-foreground mt-1">
                      {validationResult.suggestion}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Format examples */}
          <AnimatePresence>
            {showFormatExample && formatExamples.length > 0 && (
              <motion.div
                className="mt-2 p-2 bg-muted/30 rounded-md border"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Format examples:
                </p>
                <div className="flex flex-wrap gap-1">
                  {formatExamples.slice(0, 3).map((example, index) => (
                    <code 
                      key={index}
                      className="text-xs bg-background px-1.5 py-0.5 rounded border"
                    >
                      {example}
                    </code>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {error && (
            <motion.p 
              className="text-sm text-destructive mt-1 flex items-center gap-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </motion.p>
          )}
        </div>
      </motion.div>
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
      
      <div className="relative">
        <motion.div
          onClick={handleEdit}
          onMouseEnter={() => !disabled && setShowSuggestions(true)}
          onMouseLeave={() => setShowSuggestions(false)}
          className={cn(
            "relative py-1 px-1 rounded transition-all duration-200",
            disabled 
              ? "cursor-not-allowed opacity-50" 
              : "cursor-text hover:bg-muted/30",
            shouldHighlight && confidenceHighlight
          )}
          whileHover={!disabled ? { scale: 1.01 } : {}}
        >
          <span className={cn(
            "inline-block min-h-[1.25rem] border-b-2 border-dotted border-transparent transition-all duration-200",
            !disabled && "group-hover:border-muted-foreground/30",
            !value && "text-muted-foreground",
            shouldHighlight && "border-warning/40"
          )}>
            {value ? getDisplayValue : placeholder || 'Click to edit'}
          </span>
          
          {/* Low confidence indicator */}
          {shouldHighlight && (
            <div className="absolute -top-1 -right-1">
              <div className="bg-warning text-warning-foreground rounded-full p-0.5">
                <AlertCircle className="h-2.5 w-2.5" />
              </div>
            </div>
          )}
        </motion.div>

        {/* Success Animation */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              className="absolute -right-1 top-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-green-500 text-white rounded-full p-1">
                <Check className="h-3 w-3" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Suggestion Pills */}
        <AnimatePresence>
          {showSuggestions && topSuggestions.length > 0 && !disabled && (
            <motion.div
              className="absolute top-full left-0 mt-1 flex flex-wrap gap-1 z-10"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {topSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSuggestionClick(suggestion);
                  }}
                  className="h-6 px-2 text-xs bg-background/80 backdrop-blur-sm border-muted hover:bg-muted/80"
                >
                  {suggestion}
                </Button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Memoize component with custom comparison for performance
export const InlineEditField = React.memo(InlineEditFieldComponent, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.confidence === nextProps.confidence &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.inputType === nextProps.inputType &&
    prevProps.fieldType === nextProps.fieldType &&
    prevProps.enableRealtimeValidation === nextProps.enableRealtimeValidation &&
    JSON.stringify(prevProps.suggestions) === JSON.stringify(nextProps.suggestions)
  );
});