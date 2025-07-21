
export function formatDate(date: string | Date): string {
  if (!date) return '';
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
