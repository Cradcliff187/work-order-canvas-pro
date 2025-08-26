import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { cn } from '@/lib/utils';
import { type ViewMode } from '@/hooks/useViewMode';

interface TableToolbarProps {
  // Title and count
  title?: string;
  subtitle?: string;
  
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // View mode
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  allowedViewModes?: ViewMode[];
  
  // Selection
  selectedCount?: number;
  onClearSelection?: () => void;
  
  // Actions
  onExport?: (format: 'csv' | 'excel') => void;
  exportDisabled?: boolean;
  exportLoading?: boolean;
  
  // Column visibility
  columnVisibilityColumns?: Array<{
    id: string;
    label: string;
    description?: string;
    visible: boolean;
    canHide: boolean;
  }>;
  onToggleColumn?: (columnId: string) => void;
  onResetColumns?: () => void;
  
  className?: string;
}

export function TableToolbar({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  viewMode,
  onViewModeChange,
  allowedViewModes = ['table', 'card'],
  selectedCount = 0,
  onClearSelection,
  onExport,
  exportDisabled = false,
  exportLoading = false,
  columnVisibilityColumns,
  onToggleColumn,
  onResetColumns,
  className,
}: TableToolbarProps) {
  const showViewModeSwitcher = viewMode && onViewModeChange && allowedViewModes.length > 1;
  const showColumnVisibility = columnVisibilityColumns && onToggleColumn && onResetColumns;
  
  return (
    <div className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 border-b", className)}>
      {/* Left side - Title and subtitle */}
      <div className="min-w-0 flex-1">
        {title && (
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {/* Selection clear */}
        {selectedCount > 0 && onClearSelection && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClearSelection}
            className="shrink-0"
          >
            Clear Selection ({selectedCount})
          </Button>
        )}

        {/* Search */}
        <div className="relative flex-1 sm:flex-initial sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10 h-10"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* View mode switcher */}
        {showViewModeSwitcher && (
          <ViewModeSwitcher
            value={viewMode}
            onValueChange={onViewModeChange}
            allowedModes={allowedViewModes}
            className="shrink-0"
          />
        )}

        {/* Column visibility */}
        {showColumnVisibility && (
          <ColumnVisibilityDropdown
            columns={columnVisibilityColumns}
            onToggleColumn={onToggleColumn}
            onResetToDefaults={onResetColumns}
            variant="outline"
            size="sm"
          />
        )}

        {/* Export */}
        {onExport && (
          <ExportDropdown
            onExport={onExport}
            variant="outline"
            size="sm"
            disabled={exportDisabled}
            loading={exportLoading}
          />
        )}
      </div>
    </div>
  );
}