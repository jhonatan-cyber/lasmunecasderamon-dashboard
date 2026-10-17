'use client';

import { Wallet } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface PrepagoNoticeProps {
  /** Saldo prepago disponible del cliente seleccionado. */
  saldo: number | string | null | undefined;
  /** Total a pagar (incluye IVA/propina cuando corresponde). */
  total: number | string | null | undefined;
  /**
   * En pedidos y solicitudes el prepago no se cobra al crearlos, sino al registrar
   * la venta/servicio. Cambia el texto a "se aplicará al cobrar".
   */
  diferido?: boolean;
  className?: string;
}

/**
 * El backend descuenta automáticamente `min(saldo, total)` cuando la venta o el
 * servicio llevan `cliente_id` (no requiere elegir un método «prepago»). Este aviso
 * muestra cuánto del total cubre el saldo y cuánto queda por pagar con otro método.
 */
export function PrepagoNotice({
  saldo,
  total,
  diferido = false,
  className = ''
}: PrepagoNoticeProps) {
  const disponible = Math.max(0, Math.floor(Number(saldo) || 0));
  const montoTotal = Math.max(0, Number(total) || 0);
  if (disponible <= 0 || montoTotal <= 0) return null;

  const aplicado = Math.min(disponible, montoTotal);
  const restante = Math.max(0, montoTotal - aplicado);
  const cubreTodo = restante === 0;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/10 ${className}`}
    >
      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'>
        <Wallet className='h-4 w-4' />
      </div>
      <div className='text-xs leading-5 text-slate-700 dark:text-slate-100'>
        <span className='font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300'>
          Saldo prepago
        </span>
        <div className='mt-1 space-y-0.5'>
          <div>
            {diferido ? 'Se aplicará al cobrar:' : 'Aplicado:'}{' '}
            <span className='font-black text-emerald-700 dark:text-emerald-300'>
              {formatCurrencyCLP(aplicado)}
            </span>{' '}
            <span className='text-slate-400 dark:text-slate-500'>
              de {formatCurrencyCLP(disponible)}
            </span>
          </div>
          <div>
            {cubreTodo ? (
              <span className='font-semibold text-emerald-700 dark:text-emerald-300'>
                El saldo cubre el total.
              </span>
            ) : (
              <>
                Falta por pagar:{' '}
                <span className='font-black text-slate-900 dark:text-white'>
                  {formatCurrencyCLP(restante)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrepagoNotice;
