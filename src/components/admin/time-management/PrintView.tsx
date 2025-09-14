import React from 'react';
import { format } from 'date-fns';
import { TimeEntry } from '@/hooks/useTimeManagement';
import { Badge } from '@/components/ui/badge';
import { parseDateOnly } from '@/lib/utils/date';

interface PrintViewProps {
  timeEntries: TimeEntry[];
  summaryStats: {
    totalHours: number;
    totalLaborCost: number;
    totalMaterialsCost: number;
    pendingApproval: number;
    avgHoursPerEmployee: number;
    overtimeHours: number;
  };
  filters: any;
}

export function PrintView({ timeEntries, summaryStats, filters }: PrintViewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'flagged': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilterSummary = () => {
    const activeFilters = [];
    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom ? format(new Date(filters.dateFrom), 'MMM dd, yyyy') : 'Start';
      const to = filters.dateTo ? format(new Date(filters.dateTo), 'MMM dd, yyyy') : 'End';
      activeFilters.push(`Date Range: ${from} - ${to}`);
    }
    if (filters.search) {
      activeFilters.push(`Search: "${filters.search}"`);
    }
    if (filters.status.length > 0) {
      activeFilters.push(`Status: ${filters.status.join(', ')}`);
    }
    if (filters.employeeIds.length > 0) {
      activeFilters.push(`${filters.employeeIds.length} employee(s) selected`);
    }
    return activeFilters.length > 0 ? activeFilters.join(' | ') : 'All entries';
  };

  return (
    <div className="print:block hidden">
      {/* Print Styles */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          body {
            font-size: 11px;
            line-height: 1.3;
          }
          
          .page-break {
            page-break-after: always;
          }
          
          .no-break {
            page-break-inside: avoid;
          }
          
          table {
            border-collapse: collapse;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 4px 6px;
            text-align: left;
          }
          
          th {
            background-color: #f5f5f5 !important;
            font-weight: bold;
          }
        }
      `}</style>

      <div className="p-8 bg-white text-black">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6 no-break">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Time Management Report
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Generated on {format(new Date(), 'MMMM dd, yyyy \'at\' h:mm a')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">WorkOrderPro</div>
              <div className="text-sm text-gray-600">Time & Expense Management</div>
            </div>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mb-6 no-break">
          <h2 className="text-lg font-semibold mb-2">Report Filters</h2>
          <div className="bg-gray-50 p-3 rounded text-sm">
            {getFilterSummary()}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="mb-6 no-break">
          <h2 className="text-lg font-semibold mb-3">Summary Statistics</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold text-blue-600">
                {summaryStats.totalHours.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Total Hours</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summaryStats.totalLaborCost)}
              </div>
              <div className="text-sm text-gray-600">Labor Cost</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(summaryStats.totalMaterialsCost)}
              </div>
              <div className="text-sm text-gray-600">Materials Cost</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div className="text-center p-3 border rounded">
              <div className="text-xl font-bold text-yellow-600">
                {summaryStats.pendingApproval}
              </div>
              <div className="text-sm text-gray-600">Pending Approval</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-xl font-bold text-purple-600">
                {summaryStats.avgHoursPerEmployee.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Avg Hours/Employee</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-xl font-bold text-red-600">
                {summaryStats.overtimeHours.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Overtime Hours</div>
            </div>
          </div>
        </div>

        {/* Time Entries Table */}
        <div className="no-break">
          <h2 className="text-lg font-semibold mb-3">Time Entries ({timeEntries.length} records)</h2>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Work Item</th>
              <th>Hours</th>
              <th>Rate</th>
              <th>Labor Cost</th>
              <th>Materials</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {timeEntries.map((entry, index) => (
              <tr key={entry.id} className={index > 0 && index % 20 === 0 ? 'page-break' : ''}>
                <td className="whitespace-nowrap">
                  {format(parseDateOnly(entry.report_date), 'MM/dd/yy')}
                </td>
                <td className="whitespace-nowrap">
                  {entry.employee.first_name} {entry.employee.last_name}
                </td>
                <td className="whitespace-nowrap">
                  {entry.work_order?.work_order_number || entry.project?.project_number || '-'}
                </td>
                <td className="text-right">
                  {entry.hours_worked.toFixed(1)}
                </td>
                <td className="text-right">
                  {formatCurrency(entry.hourly_rate_snapshot)}
                </td>
                <td className="text-right">
                  {formatCurrency(entry.total_labor_cost)}
                </td>
                <td className="text-right">
                  {entry.materials_cost ? formatCurrency(entry.materials_cost) : '-'}
                </td>
                <td>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusBadgeClass(entry.approval_status)}`}>
                    {entry.approval_status}
                  </span>
                </td>
                <td className="max-w-xs">
                  <div className="truncate">
                    {entry.work_performed}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-gray-100">
              <td colSpan={3}>TOTALS</td>
              <td className="text-right">
                {timeEntries.reduce((sum, entry) => sum + Number(entry.hours_worked), 0).toFixed(1)}
              </td>
              <td></td>
              <td className="text-right">
                {formatCurrency(timeEntries.reduce((sum, entry) => sum + Number(entry.total_labor_cost), 0))}
              </td>
              <td className="text-right">
                {formatCurrency(timeEntries.reduce((sum, entry) => sum + Number(entry.materials_cost || 0), 0))}
              </td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          <p>This report was generated automatically by WorkOrderPro Time Management System</p>
          <p>For questions or discrepancies, please contact your administrator</p>
        </div>
      </div>
    </div>
  );
}