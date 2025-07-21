
import React from 'react';
import { cn } from '@/lib/utils';

interface StandardFormLayoutProps {
  children: React.ReactNode;
  variant?: 'single' | 'two-column';
  className?: string;
  sectionSpacing?: 'compact' | 'normal' | 'spacious';
  fieldSpacing?: 'tight' | 'normal' | 'loose';
}

interface FormSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

interface FormFieldGroupProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2;
}

interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Main form layout component that provides consistent spacing and responsive grid layouts.
 * Uses mobile-first responsive design with configurable spacing options.
 */
const StandardFormLayout: React.FC<StandardFormLayoutProps> & {
  Section: React.FC<FormSectionProps>;
  FieldGroup: React.FC<FormFieldGroupProps>;
  Actions: React.FC<FormActionsProps>;
} = ({ 
  children, 
  variant = 'single', 
  className = '',
  sectionSpacing = 'normal',
  fieldSpacing = 'normal'
}) => {
  const sectionSpacingClasses = {
    compact: 'space-y-4',
    normal: 'space-y-6',
    spacious: 'space-y-8'
  };

  const fieldSpacingClasses = {
    tight: 'gap-2',
    normal: 'gap-4',
    loose: 'gap-6'
  };

  const layoutClasses = {
    single: 'grid grid-cols-1',
    'two-column': 'grid grid-cols-1 md:grid-cols-2'
  };

  return (
    <div className={cn(
      'w-full',
      sectionSpacingClasses[sectionSpacing],
      className
    )}>
      <div className={cn(
        layoutClasses[variant],
        fieldSpacingClasses[fieldSpacing]
      )}>
        {children}
      </div>
    </div>
  );
};

/**
 * Form section component that provides consistent spacing and optional title/description.
 */
const FormSection: React.FC<FormSectionProps> = ({ 
  children, 
  className = '', 
  title, 
  description 
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

/**
 * Field group component that provides consistent spacing for form fields.
 * Supports responsive column layouts.
 */
const FormFieldGroup: React.FC<FormFieldGroupProps> = ({ 
  children, 
  className = '', 
  columns = 1 
}) => {
  const columnClasses = {
    1: 'grid grid-cols-1 gap-4',
    2: 'grid grid-cols-1 md:grid-cols-2 gap-4'
  };

  return (
    <div className={cn(columnClasses[columns], className)}>
      {children}
    </div>
  );
};

/**
 * Form actions component for buttons and action items.
 * Provides consistent spacing and alignment options.
 */
const FormActions: React.FC<FormActionsProps> = ({ 
  children, 
  className = '', 
  align = 'right' 
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };

  return (
    <div className={cn(
      'flex flex-col sm:flex-row gap-3 pt-6 border-t border-border',
      alignClasses[align],
      className
    )}>
      {children}
    </div>
  );
};

// Attach sub-components to main component
StandardFormLayout.Section = FormSection;
StandardFormLayout.FieldGroup = FormFieldGroup;
StandardFormLayout.Actions = FormActions;

export default StandardFormLayout;
export type { StandardFormLayoutProps, FormSectionProps, FormFieldGroupProps, FormActionsProps };
