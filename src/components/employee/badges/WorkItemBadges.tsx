import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText, Briefcase } from 'lucide-react';

interface TypeBadgeProps {
  type: 'work_order' | 'project';
  variant?: 'default' | 'outline' | 'compact';
  showIcon?: boolean;
  className?: string;
}

interface EnhancedAssignmentBadgeProps {
  isAssignedToMe: boolean;
  assigneeName?: string;
  variant?: 'default' | 'compact';
  showIcon?: boolean;
  className?: string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({
  type,
  variant = 'default',
  showIcon = false,
  className
}) => {
  const isWorkOrder = type === 'work_order';
  const Icon = isWorkOrder ? FileText : Briefcase;
  
  const baseClasses = "inline-flex items-center gap-1 font-medium transition-all duration-200 hover:scale-105";
  
  const variantClasses = {
    default: cn(
      "px-2 py-1 text-xs rounded-md",
      isWorkOrder 
        ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
        : "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
    ),
    outline: cn(
      "px-2 py-1 text-xs rounded-md border",
      isWorkOrder
        ? "border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400"
        : "border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-400"
    ),
    compact: cn(
      "px-1 py-0.5 text-[10px] rounded",
      isWorkOrder
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
        : "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
    )
  };

  const iconSize = variant === 'compact' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  
  const getText = () => {
    if (variant === 'compact') {
      return isWorkOrder ? 'WO' : 'PRJ';
    }
    return (
      <>
        <span className="sm:hidden">{isWorkOrder ? 'WO' : 'PRJ'}</span>
        <span className="hidden sm:inline">{isWorkOrder ? 'WORK ORDER' : 'PROJECT'}</span>
      </>
    );
  };

  return (
    <Badge 
      className={cn(baseClasses, variantClasses[variant], className)}
      variant="outline"
    >
      {showIcon && <Icon className={iconSize} />}
      {getText()}
    </Badge>
  );
};

export const EnhancedAssignmentBadge: React.FC<EnhancedAssignmentBadgeProps> = ({
  isAssignedToMe,
  assigneeName,
  variant = 'default',
  showIcon = true,
  className
}) => {
  // Re-export the existing AssignmentBadge with enhanced props
  // Import and use the existing component but with new variant support
  if (isAssignedToMe) {
    const compactClasses = variant === 'compact' ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1 py-0.5';
    return (
      <Badge variant="success" className={cn(compactClasses, "shrink-0", className)}>
        {variant === 'compact' ? (
          <span>MY</span>
        ) : (
          <>
            <span className="xs:hidden">MY</span>
            <span className="hidden xs:inline sm:hidden">YOURS</span>
            <span className="hidden sm:inline">ASSIGNED TO YOU</span>
          </>
        )}
      </Badge>
    );
  }

  if (assigneeName) {
    const compactClasses = variant === 'compact' ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1 py-0.5';
    return (
      <Badge variant="secondary" className={cn(compactClasses, "shrink-0", className)}>
        <span className={cn(
          "truncate",
          variant === 'compact' ? "max-w-[50px]" : "max-w-[60px] xs:max-w-[80px] sm:max-w-none"
        )}>
          {assigneeName}
        </span>
      </Badge>
    );
  }

  const compactClasses = variant === 'compact' ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1 py-0.5';
  return (
    <Badge variant="warning" className={cn(compactClasses, "shrink-0", className)}>
      {variant === 'compact' ? (
        <span>●</span>
      ) : (
        <>
          <span className="xs:hidden">●</span>
          <span className="hidden xs:inline sm:hidden">OPEN</span>
          <span className="hidden sm:inline">AVAILABLE</span>
        </>
      )}
    </Badge>
  );
};