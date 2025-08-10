import React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


interface QuickFiltersBarProps {
  activePresets: string[];
  onTogglePreset: (preset: string) => void;
}

import { QUICK_FILTER_PRESETS } from "./quickFilterPresets";

export const QuickFiltersBar: React.FC<QuickFiltersBarProps> = ({
  activePresets,
  onTogglePreset
}) => {
  const handleClearAll = () => {
    activePresets.forEach(preset => onTogglePreset(preset));
  };

  return (
    <div className="hidden md:flex w-full max-w-full items-center justify-start gap-2 mb-4 -mx-4 px-4 md:mx-0 md:px-0">

      {/* Desktop: original quick filter chips */}
      <div className="hidden md:flex flex-1 min-w-0 max-w-full items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
        {QUICK_FILTER_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isActive = activePresets.includes(preset.id);

          return (
            <button
              key={preset.id}
              onClick={() => onTogglePreset(preset.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap smooth-transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                isActive
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-background border border-border text-foreground hover:bg-muted hover:text-accent-foreground"
              )}
              type="button"
              role="button"
              aria-pressed={isActive}
              aria-label={`Filter by ${preset.label}`}
            >
              <Icon className="h-4 w-4" />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {activePresets.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="hidden md:inline-flex text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Clear all quick filters"
        >
          <X className="h-4 w-4 mr-1" />
          <span className="hidden lg:inline">Clear All</span>
          <span className="lg:hidden">Clear</span>
        </Button>
      )}
    </div>
  );
};