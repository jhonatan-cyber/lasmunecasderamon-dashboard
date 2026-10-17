'use client';

import { memo, useState } from 'react';
import { Wallet, UsersRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatNumberWithSeparators, type ClienteConSaldo } from './servicioFormModel';

export type PrepagoOpcion = 'uno' | 'ambos' | 'ninguno';

/**
 * Pregunta «¿a quién descontamos el saldo?» cuando el o los clientes del
 * servicio tienen cuenta con saldo: a uno, a ambos (mitad y mitad) o a nadie.
 */
export const ServicioPrepagoChoiceModal = memo(function ServicioPrepagoChoiceModal({
  clientesConSaldo,
  montoDescontar,
  onCancel,
  onConfirm
}: {
  clientesConSaldo: ClienteConSaldo[];
  /** Monto que se intenta cubrir con saldo (total del servicio o la fila prepago del mixto). */
  montoDescontar: number;
  onCancel: () => void;
  onConfirm: (opcion: PrepagoOpcion, clienteId: string | null) => void;
}) {
  const puedeAmbos = clientesConSaldo.length === 2;
  const [opcionElegida, setOpcionElegida] = useState<PrepagoOpcion | null>(
    puedeAmbos ? 'ambos' : null
  );
  const [clienteElegido, setClienteElegido] = useState<string | null>(
    clientesConSaldo[0]?.clienteId ?? null
  );

  const mitad = Math.round(montoDescontar / 2);

  const confirmar = () => {
    if (opcionElegida === null) return;
    if (opcionElegida === 'uno' && !clienteElegido) return;
    onConfirm(
      opcionElegida,
      opcionElegida === 'uno' ? clienteElegido : (clientesConSaldo[0]?.clienteId ?? null)
    );
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-slate-950 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto'>
        <div className='flex items-start justify-between gap-3 mb-2'>
          <h3 className='text-lg sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight'>
            Descuento de saldo
          </h3>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={onCancel}
            className='w-8 h-8 p-0'
            aria-label='Cerrar'
          >
            <X className='w-4 h-4' />
          </Button>
        </div>
        <p className='text-sm sm:text-base text-gray-500 mb-4 font-medium'>
          Los clientes seleccionados tienen cuenta con saldo. ¿A quién aplicamos el descuento?
        </p>

        <div className='space-y-2 mb-4'>
          {clientesConSaldo.map(cliente => {
            const seleccionado = opcionElegida === 'uno' && clienteElegido === cliente.clienteId;
            return (
              <Button
                key={cliente.clienteId}
                variant='unstyled'
                type='button'
                onClick={() => {
                  setOpcionElegida('uno');
                  setClienteElegido(cliente.clienteId);
                }}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                  seleccionado
                    ? 'border-black bg-gray-50 dark:border-white dark:bg-slate-900/60'
                    : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900/40'
                }`}
              >
                <span className='flex items-center gap-3 min-w-0'>
                  <Wallet className='w-4 h-4 text-gray-400 shrink-0' />
                  <span className='min-w-0'>
                    <span className='block text-sm font-bold text-gray-900 dark:text-white truncate'>
                      {cliente.nombre}
                    </span>
                    <span className='block text-xs text-gray-500'>
                      Saldo: {formatNumberWithSeparators(cliente.saldo)}
                    </span>
                  </span>
                </span>
                <span className='text-xs font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap'>
                  −{formatCurrencyCLP(Math.min(cliente.saldo, montoDescontar))}
                </span>
              </Button>
            );
          })}

          {puedeAmbos && (
            <Button
              variant='unstyled'
              type='button'
              onClick={() => setOpcionElegida('ambos')}
              className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                opcionElegida === 'ambos'
                  ? 'border-black bg-gray-50 dark:border-white dark:bg-slate-900/60'
                  : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <span className='flex items-center gap-3 min-w-0'>
                <UsersRound className='w-4 h-4 text-gray-400 shrink-0' />
                <span className='min-w-0'>
                  <span className='block text-sm font-bold text-gray-900 dark:text-white truncate'>
                    Ambos (mitad y mitad)
                  </span>
                  <span className='block text-xs text-gray-500'>
                    Hasta {formatNumberWithSeparators(mitad)} a cada uno; si no cubre, el resto se
                    paga en caja
                  </span>
                </span>
              </span>
            </Button>
          )}

          <Button
            variant='unstyled'
            type='button'
            onClick={() => setOpcionElegida('ninguno')}
            className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
              opcionElegida === 'ninguno'
                ? 'border-black bg-gray-50 dark:border-white dark:bg-slate-900/60'
                : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900/40'
            }`}
          >
            <span className='block text-sm font-bold text-gray-900 dark:text-white'>
              No descontar saldo (pagar normal)
            </span>
          </Button>
        </div>

        <div className='flex gap-3 justify-center'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onCancel}
            className='px-6 py-2 text-sm font-bold rounded-full border-gray-200 h-11'
          >
            Cancelar
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={confirmar}
            disabled={opcionElegida === null}
            className='gap-2 bg-black text-white hover:bg-gray-800 px-8 py-2 text-sm font-black rounded-full h-11'
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
});
