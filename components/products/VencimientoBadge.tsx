'use client';

import { CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/utils';
import { estadoVencimiento, type VencimientoInfo } from '@/lib/business/vencimiento';

/** `12-04-2026` a partir de un ISO `YYYY-MM-DD`, sin pasar por zonas horarias. */
function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}-${mes}-${anio}`;
}

function etiqueta(info: VencimientoInfo): string {
  if (info.estado === 'vencido') return 'Vencido';
  if (info.dias === 0) return 'Vence hoy';
  return `Vence en ${info.dias} d`;
}

function detalle(info: VencimientoInfo): string {
  if (info.estado === 'vencido') {
    const dias = Math.abs(info.dias);
    return dias === 1 ? 'Vencido hace 1 día' : `Vencido hace ${dias} días`;
  }
  if (info.dias === 0) return 'Vence hoy';
  return info.dias === 1 ? 'Vence en 1 día' : `Vence en ${info.dias} días`;
}

const ESTILO: Record<VencimientoInfo['estado'], string> = {
  vencido: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  por_vencer: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  vigente: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300'
};

interface VencimientoBadgeProps {
  fecha?: string | null;
  className?: string;
}

/**
 * Fecha de vencimiento de un lote con su estado: vencido (rojo), por vencer
 * dentro de la ventana de aviso (ámbar) o vigente (gris). No renderiza nada si
 * el producto no tiene fecha.
 */
export function VencimientoBadge({ fecha, className }: VencimientoBadgeProps) {
  const info = estadoVencimiento(fecha);
  if (!info) return null;

  return (
    <span
      title={detalle(info)}
      className={cn('inline-flex flex-wrap items-center justify-center gap-1.5', className)}
    >
      <CalendarClock className='h-3.5 w-3.5 text-gray-400 dark:text-gray-500' aria-hidden='true' />
      <span className='font-mono text-xs text-gray-600 dark:text-gray-300'>
        {fechaCorta(info.fecha)}
      </span>
      {info.estado !== 'vigente' && (
        <Badge
          className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', ESTILO[info.estado])}
        >
          {etiqueta(info)}
        </Badge>
      )}
    </span>
  );
}
