import { useState } from 'react';
import { Search, X, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { BillingFilters, BillingFiltersValue } from '@/components/admin/billing/BillingFilters';
import { WorkOrderPipelineTable } from '@/components/admin/dashboard/WorkOrderPipelineTable';
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { ViewMode } from '@/hooks/useViewMode';

interface BillingPipelineTableProps {
  data: any[];
  isLoading: boolean;
  isError: any;
  searchValue: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  allowedModes: ViewMode[];
  filters: BillingFiltersValue;
  onFiltersChange: (filters: BillingFiltersValue) => void;
  onClearFilters: () => void;
  filterCount: number;
  columnVisibilityColumns: any[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  onExport: (format: 'csv' | 'excel') => void;
  onRefresh: () => void;
  isMobile: boolean;
  refreshThreshold?: number;
}

export function BillingPipelineTable({
  data,
  isLoading,
  isError,
  searchValue,
  onSearchChange,
  viewMode,
  onViewModeChange,
  allowedModes,
  filters,
  onFiltersChange,
  onClearFilters,
  filterCount,
  columnVisibilityColumns,
  onToggleColumn,
  onResetColumns,
  onExport,
  onRefresh,
  isMobile,
  refreshThreshold = 60
}: BillingPipelineTableProps) {
  
  // Render mobile view
  if (isMobile) {
    return (
      <MobilePullToRefresh onRefresh={onRefresh} threshold={refreshThreshold}>
        <div className="space-y-4">
          {/* Mobile Toolbar */}
          <div className="bg-muted/30 border rounded-lg p-3 space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search WO#, partner..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSearchChange('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <BillingFilters
                value={filters}
                onChange={onFiltersChange}
                onClear={onClearFilters}
              />
            </div>
          </div>

          {!data?.length ? (
            <EmptyState
              icon={TrendingUp}
              title="No items in pipeline"
              description={filterCount > 0 
                ? "No work orders match your filters. Try adjusting your search."
                : "No work orders are currently in the billing pipeline."
              }
              action={filterCount > 0 ? {
                label: "Clear Filters",
                onClick: onClearFilters
              } : undefined}
            />
          ) : (
            <WorkOrderPipelineTable 
              data={data}
              isLoading={isLoading}
              isError={isError}
              viewMode={viewMode}
              columnVisibility={{}}
              onExport={onExport}
              onToggleColumn={onToggleColumn}
              onResetColumns={onResetColumns}
              columns={columnVisibilityColumns}
              isMobile={true}
            />
          )}
        </div>
      </MobilePullToRefresh>
    );
  }

  // Render desktop view
  return (
    <Card className="overflow-hidden">
      {/* Table toolbar with search and actions */}
      <div className="border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
          {/* Left side - Title and view mode */}
          <div className="flex items-center gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                Pipeline Items
              </h2>
            </div>
            
            {/* View mode switcher */}
            <ViewModeSwitcher
              value={viewMode}
              onValueChange={onViewModeChange}
              allowedModes={allowedModes}
              className="shrink-0"
            />
          </div>

          {/* Right side - Search and Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filters and Search */}
            <div className="flex items-center gap-2">
              <BillingFilters
                value={filters}
                onChange={onFiltersChange}
                onClear={onClearFilters}
              />
              <div className="relative flex-1 sm:flex-initial sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search WO#, partner..."
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
            </div>

            {/* Column visibility and Export */}
            <ColumnVisibilityDropdown
              columns={columnVisibilityColumns}
              onToggleColumn={onToggleColumn}
              onResetToDefaults={onResetColumns}
            />
            <ExportDropdown onExport={onExport} />
          </div>
        </div>
      </div>
      
      {/* Table content */}
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6">
            <EnhancedTableSkeleton rows={8} columns={8} showHeader={true} />
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No items in pipeline"
            description={filterCount > 0 
              ? "No work orders match your filters. Try adjusting your search."
              : "No work orders are currently in the billing pipeline."
            }
            action={filterCount > 0 ? {
              label: "Clear Filters",
              onClick: onClearFilters
            } : undefined}
          />
        ) : (
          <WorkOrderPipelineTable 
            data={data}
            isLoading={isLoading}
            isError={isError}
            viewMode={viewMode}
            columnVisibility={{}} // Pass actual column visibility state
            onExport={onExport}
            onToggleColumn={onToggleColumn}
            onResetColumns={onResetColumns}
            columns={columnVisibilityColumns}
            isMobile={false}
          />
        )}
      </CardContent>
    </Card>
  );
}