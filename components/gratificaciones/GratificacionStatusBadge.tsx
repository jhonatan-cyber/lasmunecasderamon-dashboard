'use client';

/** Badge de estado de una gratificación (0 pagado, 1 por pagar, 2 pendiente, 3 rechazada). */
export default function GratificacionStatusBadge({ estado }: { estado: number }) {
  const statusMap: Record<number, { label: string; classes: string }> = {
    0: {
      label: 'Pagado',
      classes:
        'bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
    },
    1: {
      label: 'Por pagar',
      classes:
        'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
    },
    2: {
      label: 'Pendiente',
      classes:
        'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
    },
    3: {
      label: 'Rechazada',
      classes:
        'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
    }
  };

  const config = statusMap[estado] || {
    label: 'Desconocido',
    classes:
      'bg-zinc-50 text-zinc-600 border border-zinc-100 dark:bg-zinc-900/20 dark:text-zinc-400 dark:border-zinc-800'
  };

  return (
    <div
      className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.classes}`}
    >
      {config.label}
    </div>
  );
}
