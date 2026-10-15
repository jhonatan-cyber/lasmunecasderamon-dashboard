import { Badge } from '@/components/ui/badge';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';

export function EmployeeAdvanceStatus({
  status,
  request = false
}: {
  status: number;
  request?: boolean;
}) {
  const states = {
    0: {
      label: 'Entregado',
      className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    },
    1: {
      label: request ? 'Pendiente de entrega' : 'Por pagar',
      className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
    },
    2: {
      label: 'Pendiente de aprobación',
      className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
    },
    3: {
      label: 'Rechazado',
      className: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
    }
  };
  const state = states[status as keyof typeof states];
  return (
    <Badge
      variant='outline'
      className={`whitespace-nowrap border-0 px-3 py-1 font-medium ${state?.className || 'bg-muted text-muted-foreground'}`}
    >
      {state?.label || 'Desconocido'}
    </Badge>
  );
}

export function EmployeeAdvanceDate({ value }: { value?: string | null }) {
  if (!value) return <span className='text-muted-foreground'>—</span>;
  const formatted = formatDateTimeDmyLabel(value);
  return (
    <div className='space-y-0.5 whitespace-nowrap'>
      <p className='font-medium text-foreground'>{formatted.date}</p>
      <p className='text-xs text-muted-foreground'>{formatted.time}</p>
    </div>
  );
}
