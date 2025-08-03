import * as React from "react";
import { Table, LayoutGrid, List } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { type ViewMode } from "@/hooks/useViewMode";

const viewModeIcons = {
  table: Table,
  card: LayoutGrid,
  list: List,
} as const;

const viewModeLabels = {
  table: "Table",
  card: "Cards", 
  list: "List",
} as const;

interface ViewModeSwitcherProps {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  allowedModes: ViewMode[];
  className?: string;
}

export function ViewModeSwitcher({
  value,
  onValueChange,
  allowedModes,
  className,
}: ViewModeSwitcherProps) {
  const isMobile = useIsMobile();

  // Only render if multiple modes are allowed
  if (allowedModes.length <= 1) {
    return null;
  }

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(newValue) => {
        if (newValue && allowedModes.includes(newValue as ViewMode)) {
          onValueChange(newValue as ViewMode);
        }
      }}
      className={cn("bg-muted rounded-lg p-1", className)}
    >
      {allowedModes.map((mode) => {
        const Icon = viewModeIcons[mode];
        const label = viewModeLabels[mode];

        return (
          <ToggleGroupItem
            key={mode}
            value={mode}
            aria-label={`Switch to ${label} view`}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              "hover:bg-background hover:text-foreground",
              "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
              "data-[state=on]:shadow-sm"
            )}
          >
            <Icon className="h-4 w-4" />
            {!isMobile && (
              <span className="hidden md:inline">{label}</span>
            )}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}