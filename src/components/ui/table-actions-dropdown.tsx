import { MoreHorizontal } from "lucide-react";
import { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TableAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  show?: boolean;
}

export interface TableActionsDropdownProps {
  actions: TableAction[];
  align?: 'start' | 'center' | 'end';
  itemName?: string;
}

export function TableActionsDropdown({ 
  actions, 
  align = 'end',
  itemName
}: TableActionsDropdownProps) {
  // Filter actions that should be shown
  const visibleActions = actions.filter(action => action.show !== false);

  if (visibleActions.length === 0) {
    return null;
  }

  const ariaLabel = itemName 
    ? `Open actions menu for ${itemName}`
    : 'Open actions menu';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" aria-label={ariaLabel}>
          <span className="sr-only">{ariaLabel}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {visibleActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={index}
              onClick={action.onClick}
              className={action.variant === 'destructive' ? 'text-destructive' : ''}
              role="menuitem"
            >
              <Icon className="mr-2 h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}