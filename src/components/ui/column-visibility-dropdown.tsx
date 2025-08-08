import { Eye, EyeOff, Settings, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export interface ColumnOption {
  id: string;
  label: string;
  description?: string;
  visible: boolean;
  canHide: boolean;
}

export interface ColumnVisibilityDropdownProps {
  columns: ColumnOption[];
  onToggleColumn: (columnId: string) => void;
  onResetToDefaults: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
  visibleCount?: number;
  totalCount?: number;
}

export function ColumnVisibilityDropdown({ 
  columns,
  onToggleColumn,
  onResetToDefaults,
  variant = 'outline',
  size = 'default',
  disabled = false,
  visibleCount,
  totalCount
}: ColumnVisibilityDropdownProps) {
  const hideableColumns = columns.filter(col => col.canHide);
  const visibleColumns = hideableColumns.filter(col => col.visible);
  
  const displayCount = visibleCount ?? visibleColumns.length;
  const displayTotal = totalCount ?? hideableColumns.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          disabled={disabled}
          aria-label={`Manage column visibility (${displayCount}/${displayTotal} visible)`}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Columns
          <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
            {displayCount}/{displayTotal}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 bg-popover min-w-[220px] w-56">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Column Visibility</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetToDefaults}
            className="h-6 w-6 p-0"
            aria-label="Reset columns to default"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            hideableColumns.forEach((c) => {
              if (!c.visible) onToggleColumn(c.id);
            });
          }}
        >
          <Eye className="h-3 w-3 mr-2 text-muted-foreground" />
          Show all
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            hideableColumns.forEach((c) => {
              if (c.visible) onToggleColumn(c.id);
            });
          }}
        >
          <EyeOff className="h-3 w-3 mr-2 text-muted-foreground" />
          Hide all
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        
        {hideableColumns.map((column) => (
          <DropdownMenuItem
            key={column.id}
            className="flex items-center space-x-2 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              onToggleColumn(column.id);
            }}
          >
            <Checkbox
              checked={column.visible}
              onChange={() => onToggleColumn(column.id)}
              aria-label={`Toggle ${column.label} column visibility`}
            />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {column.visible ? (
                <Eye className="h-3 w-3 text-muted-foreground" />
              ) : (
                <EyeOff className="h-3 w-3 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {column.label}
                </div>
                {column.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {column.description}
                  </div>
                )}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        
        {hideableColumns.length === 0 && (
          <DropdownMenuItem disabled>
            <div className="text-sm text-muted-foreground">
              No customizable columns
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}