import React from "react";
import { User, AlertCircle, Clock, UserX, Calendar, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickFiltersBarProps {
  activePresets: string[];
  onTogglePreset: (preset: string) => void;
}

const QUICK_FILTER_PRESETS = [
  { id: 'my-orders', label: 'My Orders', icon: User },
  { id: 'urgent', label: 'Urgent', icon: AlertCircle },
  { id: 'overdue', label: 'Overdue', icon: Clock },
  { id: 'unassigned', label: 'Unassigned', icon: UserX },
  { id: 'today', label: 'Today', icon: Calendar }
];

export const QuickFiltersBar: React.FC<QuickFiltersBarProps> = ({
  activePresets,
  onTogglePreset
}) => {
  const handleClearAll = () => {
    activePresets.forEach(preset => onTogglePreset(preset));
  };

  return (
    <div className="w-full max-w-full flex items-center justify-start gap-2 mb-4 -mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex-1 min-w-0 max-w-full flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
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
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Clear all quick filters"
        >
          <X className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Clear All</span>
          <span className="sm:hidden">Clear</span>
        </Button>
      )}
    </div>
  );
};