import { parseDateSafe } from '@/lib/utils/timeUtils';
import { Timer } from '@/contexts/TimerContext';

export const saveTimersToStorage = (timers: Timer[]) => {
  if (typeof window !== 'undefined') localStorage.setItem('roomTimers', JSON.stringify(timers));
};

export const loadTimersFromStorage = (): Timer[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('roomTimers');
    if (stored) {
      return JSON.parse(stored).map((t: any) => ({ ...t, startTime: parseDateSafe(t.startTime) }));
    }
  }
  return [];
};
