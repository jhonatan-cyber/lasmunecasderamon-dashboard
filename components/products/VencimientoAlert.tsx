'use client';

import { AlertTriangle } from 'lucide-react';
import { DIAS_ALERTA_VENCIMIENTO, resumenVencimientos } from '@/lib/business/vencimiento';

function productos(cantidad: number): string {
  return cantidad === 1 ? '1 producto' : `${cantidad} productos`;
}

interface VencimientoAlertProps {
  /** Fechas de vencimiento de los productos del listado. */
  fechas: (string | null | undefined)[];
}

/**
 * Aviso sobre el listado cuando hay lotes vencidos o que vencen dentro de la
 * ventana de alerta. Sin lotes en riesgo no renderiza nada.
 */
export function VencimientoAlert({ fechas }: VencimientoAlertProps) {
  const { vencidos, porVencer } = resumenVencimientos(fechas);
  if (vencidos === 0 && porVencer === 0) return null;

  const mensaje =
    vencidos > 0 && porVencer > 0
      ? `${productos(vencidos)} con lote vencido y ${productos(porVencer)} por vencer en los próximos ${DIAS_ALERTA_VENCIMIENTO} días.`
      : vencidos > 0
        ? `${productos(vencidos)} con lote vencido.`
        : `${productos(porVencer)} por vencer en los próximos ${DIAS_ALERTA_VENCIMIENTO} días.`;

  const tono =
    vencidos > 0
      ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200'
      : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200';

  return (
    <div
      role='alert'
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${tono}`}
    >
      <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
      <p>
        <strong>Revisa los lotes:</strong> {mensaje}
      </p>
    </div>
  );
}
