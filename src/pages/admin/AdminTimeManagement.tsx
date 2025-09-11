import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, DollarSign, Users, Download, CheckCheck, Flag, Trash2, Edit, Settings, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTimeManagement } from '@/hooks/useTimeManagement';
import { TimeManagementFilters } from '@/components/admin/time-management/TimeManagementFilters';
import { TimeManagementTable } from '@/components/admin/time-management/TimeManagementTable';
import { TimeManagementSummary } from '@/components/admin/time-management/TimeManagementSummary';
import { TimeEntryEditModal } from '@/components/admin/time-management/TimeEntryEditModal';
import { BulkActionsBar } from '@/components/admin/time-management/BulkActionsBar';
import { TimeManagementPagination } from '@/components/admin/time-management/TimeManagementPagination';
import { PrintView } from '@/components/admin/time-management/PrintView';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { useTimeManagementKeyboards } from '@/hooks/useTimeManagementKeyboards';
import { KeyboardShortcutsTooltip } from '@/components/ui/keyboard-shortcuts-tooltip';

export default function AdminTimeManagement() {
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [filters, setFilters] = useState({
    employeeIds: [] as string[],
    dateFrom: '',
    dateTo: '',
    workOrderIds: [] as string[],
    projectIds: [] as string[],
    status: [] as string[],
    search: '',
    page: 1,
    limit: 50
  });

  // Column visibility setup
  const columnMetadata = {
    date: { label: 'Date', defaultVisible: true },
    employee: { label: 'Employee', defaultVisible: true },
    workItem: { label: 'Work Item', defaultVisible: true },
    hours: { label: 'Hours', defaultVisible: true },
    rate: { label: 'Rate', defaultVisible: true },
    laborCost: { label: 'Labor Cost', defaultVisible: true },
    materials: { label: 'Materials', defaultVisible: true },
    status: { label: 'Status', defaultVisible: true },
    description: { label: 'Description', defaultVisible: true },
  };

  const {
    columnVisibility,
    toggleColumn,
    resetToDefaults,
    getAllColumns
  } = useColumnVisibility({
    storageKey: 'time-management-columns',
    columnMetadata,
  });

  const handleShowAll = () => {
    Object.keys(columnMetadata).forEach(columnId => {
      if (!columnVisibility[columnId]) {
        toggleColumn(columnId);
      }
    });
  };

  const handleHideAll = () => {
    Object.keys(columnMetadata).forEach(columnId => {
      if (columnVisibility[columnId]) {
        toggleColumn(columnId);
      }
    });
  };

  const {
    timeEntries,
    totalEntries,
    employees,
    workOrders,
    projects,
    summaryStats,
    isLoading,
    updateTimeEntry,
    deleteTimeEntry,
    bulkApprove,
    bulkReject,
    exportToCSV,
    refetch
  } = useTimeManagement(filters);

  // Pagination calculations
  const totalPages = Math.ceil(totalEntries / filters.limit);

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    setSelectedEntries([]); // Clear selections when changing pages
  };

  const handlePageSizeChange = (limit: number) => {
    setFilters(prev => ({ ...prev, page: 1, limit })); // Reset to page 1
    setSelectedEntries([]); // Clear selections when changing page size
  };

  // Selection handlers
  const handleEntrySelect = (entryId: string) => {
    setSelectedEntries(prev => 
      prev.includes(entryId)
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedEntries(timeEntries.map(entry => entry.id));
    } else {
      setSelectedEntries([]);
    }
  };

  const handleSelectAllToggle = () => {
    if (selectedEntries.length === timeEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(timeEntries.map(entry => entry.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedEntries([]);
  };

  // Action handlers
  const handleEntryEdit = (entry: any) => {
    setEditingEntry(entry);
  };

  const handleEntryDelete = async (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this time entry?')) {
      await deleteTimeEntry(entryId);
      setSelectedEntries(prev => prev.filter(id => id !== entryId));
    }
  };

  const handleEntryApprove = async (entryId: string) => {
    await updateTimeEntry(entryId, {
      approval_status: 'approved' as any,
      approved_at: new Date().toISOString(),
    });
  };

  const handleEntryReject = async (entryId: string) => {
    const reason = prompt('Reason for rejection:');
    if (reason) {
      await updateTimeEntry(entryId, {
        approval_status: 'rejected' as any,
        rejection_reason: reason,
      });
    }
  };

  const handleEntryFlag = async (entryId: string) => {
    await updateTimeEntry(entryId, {
      approval_status: 'flagged' as any,
    });
  };

  // Bulk action handlers
  const handleBulkAction = async (action: string) => {
    switch (action) {
      case 'approve':
        await bulkApprove(selectedEntries);
        setSelectedEntries([]);
        break;
      case 'reject':
        const reason = prompt('Reason for rejection:');
        if (reason) {
          await bulkReject(selectedEntries, reason);
          setSelectedEntries([]);
        }
        break;
      case 'export':
        handleBulkExport();
        break;
      case 'delete':
        await handleBulkDelete(selectedEntries);
        break;
    }
  };

  const handleBulkDelete = async (entryIds: string[]) => {
    if (window.confirm(`Are you sure you want to delete ${entryIds.length} time entries?`)) {
      await Promise.all(entryIds.map(id => deleteTimeEntry(id)));
      setSelectedEntries([]);
    }
  };

  const handleBulkExport = () => {
    exportToCSV(selectedEntries);
  };

  const handleEntrySave = async (updatedEntry: any) => {
    await updateTimeEntry(updatedEntry.id, updatedEntry);
    setEditingEntry(null);
  };

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 100);
  };

  // Enhanced keyboard shortcuts
  useTimeManagementKeyboards({
    selectedEntries,
    onSelectAll: handleSelectAllToggle,
    onClearSelection: handleClearSelection,
    onApproveSelected: () => selectedEntries.length > 0 && handleBulkAction('approve'),
    onDeleteSelected: () => selectedEntries.length > 0 && handleBulkAction('delete'),
    onPrint: handlePrint,
    onExport: handleBulkExport,
  });

  return (
    <>
      {/* Print View (hidden by default) */}
      {showPrintView && (
        <PrintView 
          timeEntries={timeEntries} 
          summaryStats={summaryStats}
          filters={filters}
        />
      )}

      <div className="space-y-6 print:hidden">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Time Management</h1>
            <p className="text-muted-foreground">
              Review and manage employee time entries, approve hours, and track project costs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
            <KeyboardShortcutsTooltip />
          </div>
        </div>

        {/* Summary Stats */}
        <TimeManagementSummary stats={summaryStats} />

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeManagementFilters
              filters={filters}
              onFiltersChange={setFilters}
              employees={employees}
              workOrders={workOrders}
              projects={projects}
            />
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedEntries.length > 0 && (
          <BulkActionsBar
            selectedCount={selectedEntries.length}
            onAction={handleBulkAction}
          />
        )}

        {/* Time Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Entries
              <Badge variant="secondary" className="ml-auto">
                {totalEntries} total entries
              </Badge>
              <ColumnVisibilityDropdown
                columns={getAllColumns()}
                onToggleColumn={toggleColumn}
                onResetToDefaults={resetToDefaults}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeManagementTable
              entries={timeEntries}
              selectedEntries={selectedEntries}
              columnVisibility={columnVisibility}
              onSelectionChange={handleEntrySelect}
              onSelectAll={handleSelectAll}
              onEdit={handleEntryEdit}
              onDelete={handleEntryDelete}
              onApprove={handleEntryApprove}
              onReject={handleEntryReject}
              onFlag={handleEntryFlag}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <TimeManagementPagination
            currentPage={filters.page}
            totalPages={totalPages}
            pageSize={filters.limit}
            totalItems={totalEntries}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>

      {editingEntry && (
        <TimeEntryEditModal
          entry={editingEntry}
          onCancel={() => setEditingEntry(null)}
          onSave={handleEntrySave}
          employees={employees}
          workOrders={workOrders}
          projects={projects}
        />
      )}
    </>
  );
}