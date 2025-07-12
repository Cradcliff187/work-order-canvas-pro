import React from "react";
import { FileX } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-8">
        <div className="flex flex-col items-center gap-2">
          <Icon className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
          {action && (
            <Button
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="mt-2"
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