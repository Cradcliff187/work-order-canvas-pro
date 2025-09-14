
/**
 * Parse a date-only string (YYYY-MM-DD) without timezone conversion.
 * This prevents the date from shifting due to timezone offsets.
 */
export function parseDateOnly(dateString: string): Date {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date-only string for display without timezone conversion.
 */
export function formatDateOnly(dateString: string, format?: string): string {
  if (!dateString) return '';
  const date = parseDateOnly(dateString);
  return date.toLocaleDateString();
}

export function formatDate(date: string | Date): string {
  if (!date) return '';
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return formatDateOnly(date);
  }
  return new Date(date).toLocaleDateString();
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '';
  return new Date(date).toLocaleString();
}

export function isOverdue(dueDate: string | Date): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function getDaysUntilDue(dueDate: string | Date): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
