// Generic CSV export utilities for WorkOrderPro

export interface ExportColumn {
  key: string;
  label: string;
  type?: 'string' | 'number' | 'currency' | 'date' | 'boolean';
}

/**
 * Escapes CSV values that contain commas, quotes, or newlines
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Formats a value based on its type for CSV export
 */
function formatCSVValue(value: any, type: ExportColumn['type'] = 'string'): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case 'currency':
      return typeof value === 'number' ? `$${value.toFixed(2)}` : String(value);
    case 'number':
      return typeof value === 'number' ? value.toString() : String(value);
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString('en-US');
      }
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US');
      }
      return String(value);
    case 'boolean':
      return value ? 'Yes' : 'No';
    default:
      return String(value);
  }
}

/**
 * Gets nested property value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

/**
 * Generates a CSV filename with timestamp
 */
export function generateFilename(prefix: string, extension: string = 'csv'): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Triggers browser download of a file
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Converts array of objects to CSV string
 */
function arrayToCSV(data: any[], columns: ExportColumn[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Create header row
  const headers = columns.map(col => escapeCSVValue(col.label));
  const headerRow = headers.join(',');

  // Create data rows
  const dataRows = data.map(row => {
    const values = columns.map(col => {
      const value = getNestedValue(row, col.key);
      const formattedValue = formatCSVValue(value, col.type);
      return escapeCSVValue(formattedValue);
    });
    return values.join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Main export function - converts data to CSV and triggers download
 */
export function exportToCSV(
  data: any[],
  columns: ExportColumn[],
  filename: string
): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const csvContent = arrayToCSV(data, columns);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, filename);
}

/**
 * Export work orders with standard column mapping
 */
export function exportWorkOrders(workOrders: any[], filename?: string): void {
  const columns: ExportColumn[] = [
    { key: 'work_order_number', label: 'Work Order #', type: 'string' },
    { key: 'title', label: 'Title', type: 'string' },
    { key: 'organizations.name', label: 'Organization', type: 'string' },
    { key: 'store_location', label: 'Store Location', type: 'string' },
    { key: 'trades.name', label: 'Trade', type: 'string' },
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'work_order_assignments.0.assignee_profile.first_name', label: 'Assigned To (First)', type: 'string' },
    { key: 'work_order_assignments.0.assignee_profile.last_name', label: 'Assigned To (Last)', type: 'string' },
    { key: 'date_submitted', label: 'Date Submitted', type: 'date' },
    { key: 'due_date', label: 'Due Date', type: 'date' },
    { key: 'estimated_hours', label: 'Estimated Hours', type: 'number' },
    { key: 'actual_hours', label: 'Actual Hours', type: 'number' },
    { key: 'subcontractor_invoice_amount', label: 'Invoice Amount', type: 'currency' },
    { key: 'street_address', label: 'Street Address', type: 'string' },
    { key: 'city', label: 'City', type: 'string' },
    { key: 'state', label: 'State', type: 'string' },
    { key: 'zip_code', label: 'ZIP Code', type: 'string' },
    { key: 'description', label: 'Description', type: 'string' },
  ];

  const exportFilename = filename || generateFilename('work_orders');
  exportToCSV(workOrders, columns, exportFilename);
}

/**
 * Export analytics KPI data
 */
export function exportAnalyticsKPIs(kpiData: any, filename?: string): void {
  const kpiArray = [
    { metric: 'Total Work Orders', value: kpiData.totalWorkOrders || 0, type: 'number' },
    { metric: 'Average Completion Time (Hours)', value: kpiData.avgCompletionTime || 0, type: 'number' },
    { metric: 'First-Time Fix Rate', value: `${(kpiData.firstTimeFixRate || 0)}%`, type: 'string' },
    { metric: 'Total Invoice Value', value: kpiData.totalInvoiceValue || 0, type: 'currency' },
    { metric: 'Active Subcontractors', value: kpiData.activeSubcontractors || 0, type: 'number' },
    { metric: 'Customer Satisfaction', value: `${(kpiData.customerSatisfaction || 0)}%`, type: 'string' },
  ];

  const columns: ExportColumn[] = [
    { key: 'metric', label: 'Metric', type: 'string' },
    { key: 'value', label: 'Value', type: 'string' },
  ];

  const exportFilename = filename || generateFilename('analytics_kpis');
  exportToCSV(kpiArray, columns, exportFilename);
}

/**
 * Export subcontractor performance data
 */
export function exportSubcontractorPerformance(subcontractors: any[], filename?: string): void {
  const columns: ExportColumn[] = [
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'company', label: 'Company', type: 'string' },
    { key: 'totalJobs', label: 'Total Jobs', type: 'number' },
    { key: 'onTimeRate', label: 'On-Time Rate (%)', type: 'number' },
    { key: 'avgInvoiceAmount', label: 'Average Invoice Amount', type: 'currency' },
    { key: 'qualityScore', label: 'Quality Score (%)', type: 'number' },
  ];

  const exportFilename = filename || generateFilename('subcontractor_performance');
  exportToCSV(subcontractors, columns, exportFilename);
}

/**
 * Export organizations with comprehensive data
 */
export function exportOrganizations(organizations: any[], filename?: string): void {
  const columns: ExportColumn[] = [
    { key: 'name', label: 'Organization Name', type: 'string' },
    { key: 'initials', label: 'Initials', type: 'string' },
    { key: 'organization_type', label: 'Type', type: 'string' },
    { key: 'contact_email', label: 'Contact Email', type: 'string' },
    { key: 'contact_phone', label: 'Contact Phone', type: 'string' },
    { key: 'address', label: 'Address', type: 'string' },
    { key: 'users_count', label: 'Users Count', type: 'number' },
    { key: 'work_orders_count', label: 'Total Work Orders', type: 'number' },
    { key: 'active_work_orders_count', label: 'Active Work Orders', type: 'number' },
    { key: 'is_active', label: 'Status', type: 'boolean' },
    { key: 'created_at', label: 'Created Date', type: 'date' },
  ];

  const exportFilename = filename || generateFilename('organizations');
  exportToCSV(organizations, columns, exportFilename);
}

/**
 * Export users with comprehensive data
 */
export function exportUsers(users: any[], filename?: string): void {
  const columns: ExportColumn[] = [
    { key: 'first_name', label: 'First Name', type: 'string' },
    { key: 'last_name', label: 'Last Name', type: 'string' },
    { key: 'email', label: 'Email', type: 'string' },
    { key: 'user_type', label: 'User Type', type: 'string' },
    { key: 'is_active', label: 'Status', type: 'boolean' },
    { key: 'last_sign_in_at', label: 'Last Login', type: 'date' },
    { key: 'phone', label: 'Phone', type: 'string' },
    { key: 'company_name', label: 'Company', type: 'string' },
    { key: 'created_at', label: 'Created Date', type: 'date' },
  ];

  const exportFilename = filename || generateFilename('users_export');
  exportToCSV(users, columns, exportFilename);
}