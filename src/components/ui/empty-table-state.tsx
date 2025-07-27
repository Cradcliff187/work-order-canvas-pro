import React from "react";
import { FileX } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface EmptyTableStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  colSpan: number;
}

export function EmptyTableState({
  icon: Icon = FileX,
  title,
  description,
  action,
  colSpan,
}: EmptyTableStateProps) {
  const isMobile = useIsMobile();

  return (
    <TableRow>
      <TableCell colSpan={colSpan} className={cn(
        "text-center",
        isMobile ? "py-8 px-4" : "py-8"
      )}>
        <div className={cn(
          "flex flex-col items-center",
          isMobile ? "gap-4" : "gap-2"
        )}>
          <Icon className={cn(
            "text-muted-foreground",
            isMobile 
              ? "h-12 w-12" // 48px for mobile (finger-friendly visibility)
              : "h-8 w-8 animate-construction-bounce" // Desktop with gentle animation
          )} />
          <div className={cn(
            "font-medium text-muted-foreground",
            isMobile ? "text-base" : "text-sm"
          )}>
            {title}
          </div>
          {description && (
            <div className={cn(
              "text-muted-foreground max-w-md text-center",
              isMobile ? "text-sm" : "text-xs"
            )}>
              {description}
            </div>
          )}
          {action && (
            <Button
              variant="outline"
              size={isMobile ? "lg" : "sm"}
              onClick={action.onClick}
              className={cn(
                isMobile ? "mt-4 min-h-[44px] px-6" : "mt-2"
              )}
            >
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}