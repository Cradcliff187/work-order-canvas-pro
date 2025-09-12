import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Search, Plus } from 'lucide-react';
import { TimeEntry } from '@/hooks/useTimeManagement';
import { MobileTimeEntryCard } from './MobileTimeEntryCard';
import { MobileFiltersSheet } from './MobileFiltersSheet';
import { BulkActionsBar } from './BulkActionsBar';

interface MobileTimeManagementProps {
  timeEntries: TimeEntry[];
  selectedEntries: string[];
  totalEntries: number;
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  onEntrySelect: (entryId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entryId: string) => void;
  onApprove: (entryId: string) => void;
  onReject: (entryId: string) => void;
  onFlag: (entryId: string) => void;
  onBulkAction: (action: string) => void;
  employees: any[];
  workOrders: any[];
  projects: any[];
  isLoading?: boolean;
}

export function MobileTimeManagement({
  timeEntries,
  selectedEntries,
  totalEntries,
  filters,
  onFiltersChange,
  onClearFilters,
  onEntrySelect,
  onSelectAll,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onFlag,
  onBulkAction,
  employees,
  workOrders,
  projects,
  isLoading = false
}: MobileTimeManagementProps) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value, page: 1 });
  };

  const allSelected = selectedEntries.length === timeEntries.length && timeEntries.length > 0;
  const someSelected = selectedEntries.length > 0 && selectedEntries.length < timeEntries.length;

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search time entries..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center justify-between">
          <MobileFiltersSheet
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClearFilters={onClearFilters}
            employees={employees}
            workOrders={workOrders}
            projects={projects}
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
          />
          <Badge variant="secondary" className="ml-auto">
            {totalEntries} entries
          </Badge>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedEntries.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedEntries.length}
          onAction={onBulkAction}
        />
      )}

      {/* Select All */}
      {timeEntries.length > 0 && (
        <div className="flex items-center gap-2 py-2">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(input) => {
              if (input) input.indeterminate = someSelected;
            }}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm text-muted-foreground">
            {allSelected ? 'Deselect all' : someSelected ? `${selectedEntries.length} selected` : 'Select all'}
          </span>
        </div>
      )}

      {/* Time Entries */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : timeEntries.length > 0 ? (
          timeEntries.map((entry) => (
            <MobileTimeEntryCard
              key={entry.id}
              entry={entry}
              selected={selectedEntries.includes(entry.id)}
              onSelect={(checked) => onEntrySelect(entry.id)}
              onEdit={onEdit}
              onDelete={onDelete}
              onApprove={onApprove}
              onReject={onReject}
              onFlag={onFlag}
            />
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No time entries found</h3>
              <p className="text-muted-foreground">
                {filters.search || filters.employeeIds.length > 0 || filters.status.length > 0
                  ? 'Try adjusting your search or filters.'
                  : 'Time entries will appear here once employees start logging hours.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Load More or Pagination for mobile could go here */}
      {timeEntries.length > 0 && totalEntries > timeEntries.length && (
        <div className="text-center py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFiltersChange({ ...filters, limit: filters.limit + 25 })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Load More ({totalEntries - timeEntries.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}