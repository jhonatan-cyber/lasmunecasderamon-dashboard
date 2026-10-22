'use client';

import { Clock } from 'lucide-react';
import { CuentaWithDetails } from '@/types/cuenta';
import { useCountdown, useTimer } from '@/contexts/TimerContext';

export function CuentaTimerStatus({
  cuenta,
  compact = false
}: {
  cuenta: CuentaWithDetails;
  compact?: boolean;
}) {
  const { getTimerByServicioId, formatTime } = useTimer();
  const cuentaId = String(cuenta.id_cuenta ?? (cuenta as any).id ?? '');
  const timer = cuentaId ? getTimerByServicioId(cuentaId) : null;
  const remainingTime = useCountdown(timer);

  if (!timer || !timer.isActive) {
    return null;
  }

  return (
    <div
      className={
        compact
          ? 'inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
          : 'inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
      }
    >
      <Clock className='h-3.5 w-3.5' />
      <span className='font-mono'>{formatTime(remainingTime)}</span>
    </div>
  );
}
