
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  variant?: 'card' | 'full' | 'table';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  variant = 'card',
  className,
}) => {
  const isMobile = useIsMobile();

  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      variant === 'card' 
        ? (isMobile ? "p-6" : "p-8")
        : (isMobile ? "py-8 px-4" : "py-12"),
      className
    )}>
      {Icon && (
        <div className={cn(
          "rounded-full bg-muted",
          isMobile ? "mb-6 p-4" : "mb-4 p-3"
        )}>
          <Icon className={cn(
            "text-muted-foreground",
            isMobile 
              ? "h-12 w-12" // 48px for mobile visibility
              : "h-8 w-8 animate-construction-bounce" // Desktop with gentle animation
          )} />
        </div>
      )}
      <h3 className={cn(
        "font-semibold mb-2",
        isMobile ? "text-xl" : "text-lg"
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          "text-muted-foreground max-w-md",
          isMobile ? "mb-8 text-base" : "mb-6 text-sm"
        )}>
          {description}
        </p>
      )}
      {action && (
        <Button 
          onClick={action.onClick} 
          size={isMobile ? "lg" : "default"}
          className={cn(
            "min-h-[44px]",
            isMobile && "px-8 py-3"
          )}
        >
          {action.icon && <action.icon className="h-4 w-4 mr-2" />}
          {action.label}
        </Button>
      )}
    </div>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
};
