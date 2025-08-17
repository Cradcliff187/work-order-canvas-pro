import React, { useState, useRef, useEffect } from 'react';
import { SmartInput } from './SmartInput';
import { ConfidenceBadge } from './ConfidenceBadge';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setShowSuggestions(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
    setShowSuggestions(false);
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
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
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

  const handleSuggestionClick = async (suggestion: string) => {
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

  const topSuggestions = suggestions.slice(0, 4);

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
            className="w-full"
          />
          
          {isSaving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {error && (
            <motion.p 
              className="text-sm text-destructive mt-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
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
              : "cursor-text hover:bg-muted/30"
          )}
          whileHover={!disabled ? { scale: 1.01 } : {}}
        >
          <span className={cn(
            "inline-block min-h-[1.25rem] border-b-2 border-dotted border-transparent transition-all duration-200",
            !disabled && "group-hover:border-muted-foreground/30",
            !value && "text-muted-foreground"
          )}>
            {value ? getDisplayValue() : placeholder || 'Click to edit'}
          </span>
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