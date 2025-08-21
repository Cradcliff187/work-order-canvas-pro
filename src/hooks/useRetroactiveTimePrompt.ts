import { useMemo } from 'react';
import { useTodayHours } from '@/hooks/useTodayHours';
import { useClockState } from '@/hooks/useClockState';

const PROMPT_HOUR = 10; // Show prompt after 10 AM
const DISMISS_KEY = 'retroactive-prompt-dismissed';

export function useRetroactiveTimePrompt() {
  const { data: todayHours = 0 } = useTodayHours();
  const { isClocked } = useClockState();

  const shouldShowPrompt = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const todayKey = `${DISMISS_KEY}-${now.toDateString()}`;
    const isDismissedToday = localStorage.getItem(todayKey) === 'true';

    // Show prompt if:
    // - It's after 10 AM
    // - No time logged today (todayHours === 0)
    // - Not currently clocked in
    // - Not a weekend
    // - Not dismissed today
    return (
      currentHour >= PROMPT_HOUR &&
      todayHours === 0 &&
      !isClocked &&
      !isWeekend &&
      !isDismissedToday
    );
  }, [todayHours, isClocked]);

  const dismissPrompt = () => {
    const today = new Date().toDateString();
    const todayKey = `${DISMISS_KEY}-${today}`;
    localStorage.setItem(todayKey, 'true');
  };

  return {
    shouldShowPrompt,
    dismissPrompt
  };
}