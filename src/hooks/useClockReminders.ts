import { useMemo } from 'react';
import { useClockState } from '@/hooks/useClockState';
import { useTodayHours } from '@/hooks/useTodayHours';

export interface ClockReminder {
  id: string;
  type: 'morning' | 'longDay' | 'evening';
  message: string;
  icon: string;
  variant: 'yellow' | 'blue' | 'green';
  action?: 'clockIn' | 'dismiss' | 'clockOut';
}

export function useClockReminders() {
  const { isClocked, clockInTime } = useClockState();
  const { data: todayHours = 0 } = useTodayHours();

  const reminders = useMemo<ClockReminder[]>(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const today = now.toDateString();

    const morningKey = `morning-reminder-dismissed-${today}`;
    const longDayKey = `long-day-reminder-dismissed-${clockInTime}`;
    const eveningKey = `evening-reminder-dismissed-${today}-${Math.floor(currentHour)}`;

    const reminders: ClockReminder[] = [];

    // Morning reminder: After 9 AM on weekdays, not clocked in, no time today
    if (
      currentHour >= 9 &&
      isWeekday &&
      !isClocked &&
      todayHours === 0 &&
      !localStorage.getItem(morningKey)
    ) {
      reminders.push({
        id: 'morning',
        type: 'morning',
        message: 'Ready to start your day?',
        icon: 'coffee',
        variant: 'yellow',
        action: 'clockIn'
      });
    }

    // Long day reminder: Clocked in for more than 8 hours
    if (isClocked && clockInTime) {
      const hoursWorked = (now.getTime() - new Date(clockInTime).getTime()) / (1000 * 60 * 60);
      if (hoursWorked >= 8 && !localStorage.getItem(longDayKey)) {
        reminders.push({
          id: 'longDay',
          type: 'longDay',
          message: 'Long day! Remember to take breaks 💪',
          icon: 'rest',
          variant: 'blue',
          action: 'dismiss'
        });
      }
    }

    // Evening reminder: After 6 PM and still clocked in
    if (
      currentHour >= 18 &&
      isClocked &&
      !localStorage.getItem(eveningKey)
    ) {
      reminders.push({
        id: 'evening',
        type: 'evening',
        message: 'Still working? Great hustle! 🌟',
        icon: 'star',
        variant: 'green',
        action: 'clockOut'
      });
    }

    return reminders;
  }, [isClocked, clockInTime, todayHours]);

  const dismissReminder = (reminderId: string) => {
    const now = new Date();
    const today = now.toDateString();
    const currentHour = now.getHours();

    switch (reminderId) {
      case 'morning':
        localStorage.setItem(`morning-reminder-dismissed-${today}`, 'true');
        break;
      case 'longDay':
        localStorage.setItem(`long-day-reminder-dismissed-${clockInTime}`, 'true');
        break;
      case 'evening':
        localStorage.setItem(`evening-reminder-dismissed-${today}-${Math.floor(currentHour)}`, 'true');
        break;
    }
  };

  return {
    reminders,
    dismissReminder
  };
}