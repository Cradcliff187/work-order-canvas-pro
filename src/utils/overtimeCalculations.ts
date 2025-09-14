import { format, startOfWeek, endOfWeek } from 'date-fns';
import { parseDateOnly } from '@/lib/utils/date';

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

export interface WeeklyHours {
  employeeId: string;
  employeeName?: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  entries: TimeEntry[];
}

export type WeekKey = string; // Format: "employeeId-YYYY-MM-DD" (week start date)

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
 * Gets the week key for a date (Sunday as first day of week)
 */
function getWeekKey(employeeId: string, dateStr: string): WeekKey {
  const date = new Date(dateStr);
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday = 0
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  return `${employeeId}-${weekStartStr}`;
}

/**
 * Groups time entries by employee and week, calculating weekly totals
 */
export function groupTimeEntriesByEmployeeAndWeek(entries: TimeEntry[]): WeeklyHours[] {
  const weeklyGroups = new Map<WeekKey, WeeklyHours>();

  entries.forEach(entry => {
    const weekKey = getWeekKey(entry.employee_user_id, entry.report_date);
    
    if (!weeklyGroups.has(weekKey)) {
      const date = parseDateOnly(entry.report_date);
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
      
      weeklyGroups.set(weekKey, {
        employeeId: entry.employee_user_id,
        employeeName: entry.employee ? `${entry.employee.first_name} ${entry.employee.last_name}` : undefined,
        weekKey,
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        weekEnd: format(weekEnd, 'yyyy-MM-dd'),
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        entries: []
      });
    }

    const weeklyHours = weeklyGroups.get(weekKey)!;
    weeklyHours.totalHours += entry.hours_worked;
    weeklyHours.entries.push(entry);
  });

  // Calculate regular vs overtime hours for each week
  weeklyGroups.forEach(weeklyHours => {
    // Check if the employee is overtime eligible
    const firstEntry = weeklyHours.entries[0];
    const isOvertimeEligible = firstEntry?.employee?.is_overtime_eligible ?? false; // Default to false
    
    if (!isOvertimeEligible || weeklyHours.totalHours <= 40) {
      weeklyHours.regularHours = weeklyHours.totalHours;
      weeklyHours.overtimeHours = 0;
    } else {
      weeklyHours.regularHours = 40;
      weeklyHours.overtimeHours = weeklyHours.totalHours - 40;
    }
  });

  return Array.from(weeklyGroups.values());
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
    const isOvertimeEligible = firstEntry?.employee?.is_overtime_eligible ?? false; // Default to false
    
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
 * Calculates overtime information for individual entries based on weekly aggregation (40h threshold)
 * Uses "last hours after 40" allocation - overtime is assigned to chronologically later entries
 */
export function calculateWeeklyEntryOvertimeInfo(entries: TimeEntry[]): EntryWithOvertimeInfo[] {
  const weeklyHours = groupTimeEntriesByEmployeeAndWeek(entries);
  const weeklyHoursMap = new Map<WeekKey, WeeklyHours>();
  
  weeklyHours.forEach(weekly => {
    weeklyHoursMap.set(weekly.weekKey, weekly);
  });

  return entries.map(entry => {
    const weekKey = getWeekKey(entry.employee_user_id, entry.report_date);
    const weeklyInfo = weeklyHoursMap.get(weekKey);
    
    // Check if employee is overtime eligible
    const isOvertimeEligible = entry.employee?.is_overtime_eligible ?? false;
    
    if (!weeklyInfo || weeklyInfo.overtimeHours === 0 || !isOvertimeEligible) {
      return {
        ...entry,
        contributesToOvertime: false,
        overtimePortion: 0,
        regularPortion: entry.hours_worked
      };
    }

    // Sort entries chronologically within the week for "last hours after 40" allocation
    const sortedEntries = [...weeklyInfo.entries].sort((a, b) => {
      const dateA = parseDateOnly(a.report_date);
      const dateB = parseDateOnly(b.report_date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      // If same date, use entry ID for consistent ordering
      return a.id.localeCompare(b.id);
    });

    // Calculate cumulative hours and determine OT allocation
    let cumulativeHours = 0;
    let overtimePortion = 0;
    let regularPortion = entry.hours_worked;

    for (const sortedEntry of sortedEntries) {
      if (sortedEntry.id === entry.id) {
        const hoursBeforeThisEntry = cumulativeHours;
        const hoursAfterThisEntry = cumulativeHours + entry.hours_worked;
        
        if (hoursBeforeThisEntry >= 40) {
          // All hours are overtime
          overtimePortion = entry.hours_worked;
          regularPortion = 0;
        } else if (hoursAfterThisEntry > 40) {
          // Partial overtime - some regular, some OT
          regularPortion = 40 - hoursBeforeThisEntry;
          overtimePortion = entry.hours_worked - regularPortion;
        } else {
          // All hours are regular
          overtimePortion = 0;
          regularPortion = entry.hours_worked;
        }
        break;
      }
      cumulativeHours += sortedEntry.hours_worked;
    }

    return {
      ...entry,
      contributesToOvertime: overtimePortion > 0,
      overtimePortion,
      regularPortion
    };
  });
}

/**
 * @deprecated Use calculateWeeklyEntryOvertimeInfo instead. Daily overtime calculation is being phased out.
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
    const isOvertimeEligible = entry.employee?.is_overtime_eligible ?? false;
    
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
 * Calculates total overtime hours across all entries using weekly aggregation (40h threshold)
 */
export function calculateTotalWeeklyOvertimeHours(entries: TimeEntry[]): number {
  const weeklyHours = groupTimeEntriesByEmployeeAndWeek(entries);
  return weeklyHours.reduce((total, weekly) => total + weekly.overtimeHours, 0);
}

/**
 * Gets overtime hours for a specific entry based on weekly aggregation (40h threshold)
 */
export function getWeeklyEntryOvertimeHours(entry: TimeEntry, allEntries: TimeEntry[]): number {
  const entriesWithOT = calculateWeeklyEntryOvertimeInfo(allEntries);
  const entryWithOT = entriesWithOT.find(e => e.id === entry.id);
  return entryWithOT?.overtimePortion || 0;
}

/**
 * @deprecated Use calculateTotalWeeklyOvertimeHours instead. Daily overtime calculation is being phased out.
 */
export function calculateTotalOvertimeHours(entries: TimeEntry[]): number {
  const dailyHours = groupTimeEntriesByEmployeeAndDate(entries);
  return dailyHours.reduce((total, daily) => total + daily.overtimeHours, 0);
}

/**
 * @deprecated Use getWeeklyEntryOvertimeHours instead. Daily overtime calculation is being phased out.
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