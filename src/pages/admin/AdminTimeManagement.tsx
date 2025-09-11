import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, DollarSign, Users, Download, CheckCheck, Flag, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTimeManagement } from '@/hooks/useTimeManagement';
import { TimeManagementFilters } from '@/components/admin/time-management/TimeManagementFilters';
import { TimeManagementTable } from '@/components/admin/time-management/TimeManagementTable';
import { TimeManagementSummary } from '@/components/admin/time-management/TimeManagementSummary';
import { TimeEntryEditModal } from '@/components/admin/time-management/TimeEntryEditModal';
import { BulkActionsBar } from '@/components/admin/time-management/BulkActionsBar';

export default function AdminTimeManagement() {
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [filters, setFilters] = useState({
    employeeIds: [] as string[],
    dateFrom: '',
    dateTo: '',
    workOrderIds: [] as string[],
    projectIds: [] as string[],
    status: [] as string[],
    search: ''
  });

  const {
    timeEntries,
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

  const handleSelectionChange = (entryId: string, selected: boolean) => {
    setSelectedEntries(prev => 
      selected 
        ? [...prev, entryId]
        : prev.filter(id => id !== entryId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedEntries(selected ? timeEntries.map(entry => entry.id) : []);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedEntries.length === 0) return;

    try {
      switch (action) {
        case 'approve':
          await bulkApprove(selectedEntries);
          break;
        case 'reject':
          await bulkReject(selectedEntries, 'Bulk rejection');
          break;
        case 'export':
          await exportToCSV(selectedEntries);
          break;
        case 'delete':
          await Promise.all(selectedEntries.map(id => deleteTimeEntry(id)));
          break;
      }
      setSelectedEntries([]);
      refetch();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleApprove = async (entryId: string) => {
    try {
      await updateTimeEntry(entryId, { approval_status: 'approved' });
      refetch();
    } catch (error) {
      console.error('Failed to approve time entry:', error);
    }
  };

  const handleReject = async (entryId: string, reason: string) => {
    try {
      await updateTimeEntry(entryId, { 
        approval_status: 'rejected',
        rejection_reason: reason 
      });
      refetch();
    } catch (error) {
      console.error('Failed to reject time entry:', error);
    }
  };

  const handleFlag = async (entryId: string) => {
    try {
      await updateTimeEntry(entryId, { approval_status: 'flagged' });
      refetch();
    } catch (error) {
      console.error('Failed to flag time entry:', error);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
  };

  const handleSaveEdit = async (updatedEntry: any) => {
    try {
      await updateTimeEntry(updatedEntry.id, updatedEntry);
      setEditingEntry(null);
      refetch();
    } catch (error) {
      console.error('Failed to update time entry:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Management</h1>
          <p className="text-muted-foreground">
            View and manage all employee time entries
          </p>
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
              {timeEntries.length} entries
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimeManagementTable
            entries={timeEntries}
            selectedEntries={selectedEntries}
            onSelectionChange={handleSelectionChange}
            onSelectAll={handleSelectAll}
            onEdit={handleEdit}
            onDelete={deleteTimeEntry}
            onApprove={handleApprove}
            onReject={handleReject}
            onFlag={handleFlag}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingEntry && (
        <TimeEntryEditModal
          entry={editingEntry}
          onSave={handleSaveEdit}
          onCancel={() => setEditingEntry(null)}
          employees={employees}
          workOrders={workOrders}
          projects={projects}
        />
      )}
    </div>
  );
}