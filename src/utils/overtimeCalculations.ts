import { format } from 'date-fns';

export interface TimeEntry {
  id: string;
  report_date: string;
  hours_worked: number;
  employee_user_id: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    is_overtime_eligible?: boolean;
  };
}

export interface DailyHours {
  employeeId: string;
  employeeName?: string;
  date: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  entries: TimeEntry[];
}

export interface EntryWithOvertimeInfo extends TimeEntry {
  contributesToOvertime: boolean;
  overtimePortion: number;
  regularPortion: number;
}

/**
 * Normalizes date string to YYYY-MM-DD format
 */
function normalizeDate(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'yyyy-MM-dd');
}

/**
 * Groups time entries by employee and date, calculating daily totals
 */
export function groupTimeEntriesByEmployeeAndDate(entries: TimeEntry[]): DailyHours[] {
  const dailyGroups = new Map<string, DailyHours>();

  entries.forEach(entry => {
    const normalizedDate = normalizeDate(entry.report_date);
    const key = `${entry.employee_user_id}-${normalizedDate}`;
    
    if (!dailyGroups.has(key)) {
      dailyGroups.set(key, {
        employeeId: entry.employee_user_id,
        employeeName: entry.employee ? `${entry.employee.first_name} ${entry.employee.last_name}` : undefined,
        date: normalizedDate,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        entries: []
      });
    }

    const dailyHours = dailyGroups.get(key)!;
    dailyHours.totalHours += entry.hours_worked;
    dailyHours.entries.push(entry);
  });

  // Calculate regular vs overtime hours for each day
  dailyGroups.forEach(dailyHours => {
    // Check if the employee is overtime eligible
    const firstEntry = dailyHours.entries[0];
    const isOvertimeEligible = firstEntry?.employee?.is_overtime_eligible ?? true; // Default to true if not specified
    
    if (!isOvertimeEligible || dailyHours.totalHours <= 8) {
      dailyHours.regularHours = dailyHours.totalHours;
      dailyHours.overtimeHours = 0;
    } else {
      dailyHours.regularHours = 8;
      dailyHours.overtimeHours = dailyHours.totalHours - 8;
    }
  });

  return Array.from(dailyGroups.values());
}

/**
 * Calculates overtime information for individual entries based on daily aggregation
 */
export function calculateEntryOvertimeInfo(entries: TimeEntry[]): EntryWithOvertimeInfo[] {
  const dailyHours = groupTimeEntriesByEmployeeAndDate(entries);
  const dailyHoursMap = new Map<string, DailyHours>();
  
  dailyHours.forEach(daily => {
    const key = `${daily.employeeId}-${daily.date}`;
    dailyHoursMap.set(key, daily);
  });

  return entries.map(entry => {
    const normalizedDate = normalizeDate(entry.report_date);
    const key = `${entry.employee_user_id}-${normalizedDate}`;
    const dailyInfo = dailyHoursMap.get(key);
    
    // Check if employee is overtime eligible
    const isOvertimeEligible = entry.employee?.is_overtime_eligible ?? true;
    
    if (!dailyInfo || dailyInfo.overtimeHours === 0 || !isOvertimeEligible) {
      return {
        ...entry,
        contributesToOvertime: false,
        overtimePortion: 0,
        regularPortion: entry.hours_worked
      };
    }

    // This entry contributes to overtime since the daily total > 8 and employee is eligible
    // We need to distribute the overtime proportionally among all entries for this day
    const entryProportion = entry.hours_worked / dailyInfo.totalHours;
    const overtimePortionForEntry = dailyInfo.overtimeHours * entryProportion;
    const regularPortionForEntry = entry.hours_worked - overtimePortionForEntry;

    return {
      ...entry,
      contributesToOvertime: true,
      overtimePortion: overtimePortionForEntry,
      regularPortion: regularPortionForEntry
    };
  });
}

/**
 * Calculates total overtime hours across all entries using daily aggregation
 */
export function calculateTotalOvertimeHours(entries: TimeEntry[]): number {
  const dailyHours = groupTimeEntriesByEmployeeAndDate(entries);
  return dailyHours.reduce((total, daily) => total + daily.overtimeHours, 0);
}

/**
 * Gets overtime hours for a specific entry based on daily aggregation
 */
export function getEntryOvertimeHours(entry: TimeEntry, allEntries: TimeEntry[]): number {
  const entriesWithOT = calculateEntryOvertimeInfo(allEntries);
  const entryWithOT = entriesWithOT.find(e => e.id === entry.id);
  return entryWithOT?.overtimePortion || 0;
}

/**
 * Format daily hours for display
 */
export function formatDailyHours(dailyHours: DailyHours): string {
  return `${dailyHours.totalHours.toFixed(2)} hrs (${dailyHours.regularHours.toFixed(2)} reg + ${dailyHours.overtimeHours.toFixed(2)} OT)`;
}