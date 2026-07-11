'use client';

import { DollarSign, Split } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyCLP, parseNumberInput } from '@/lib/utils/formatters';

interface PagoMixto {
  metodo: string;
  baseMonto: number;
  monto: number;
  display: string;
}

interface Props {
  pagosMixtos: PagoMixto[];
  onUpdate: (pagos: PagoMixto[]) => void;
  total: number;
  selectedClientData?: { saldo?: number } | null;
  ivaRate: number;
}

const FORMAT_METODOS = ['efectivo', 'tarjeta', 'transferencia', 'prepago'] as const;

export function PagosMixtosSection({
  pagosMixtos,
  onUpdate,
  total,
  selectedClientData,
  ivaRate
}: Props) {
  const calcularMontoPagoMixto = (metodo: string, montoBase: number) => {
    if (metodo === 'tarjeta') return Math.floor(montoBase * (1 + ivaRate));
    return montoBase;
  };

  const crearPagoMixto = (metodo: string, montoBase: number): PagoMixto => ({
    metodo,
    baseMonto: montoBase,
    monto: calcularMontoPagoMixto(metodo, montoBase),
    display: ''
  });

  const formatNumberWithSeparators = (value: number): string => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  return (
    <div className='rounded-2xl border border-dotted border-slate-300 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 transition-all duration-300'>
      <div className='mb-3 flex items-center gap-2'>
        <Split className='h-4 w-4 text-slate-700 dark:text-slate-200' />
        <p className='text-xs font-bold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200'>
          Distribución de pagos
        </p>
      </div>

      <div className='space-y-3'>
        {pagosMixtos.map((pago, index) => (
          <div key={`${pago.metodo}-${index}`} className='flex items-center gap-2'>
            <div className='w-28 text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300'>
              {pago.metodo}
            </div>
            <div className='relative flex-1'>
              <span className='absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500'>
                <DollarSign className='h-4 w-4' />
              </span>
              <input
                type='text'
                value={pago.display}
                placeholder='0'
                onChange={e => {
                  const montoBase = parseNumberInput(e.target.value);
                  onUpdate(
                    pagosMixtos.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            baseMonto: montoBase,
                            monto: calcularMontoPagoMixto(item.metodo, montoBase),
                            display: montoBase > 0 ? formatNumberWithSeparators(montoBase) : ''
                          }
                        : item
                    )
                  );
                }}
                className='w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-black focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400'
              />
            </div>
            {pago.metodo === 'tarjeta' && Number(pago.baseMonto || 0) > 0 && (
              <p className='text-[10px] font-bold text-purple-600'>
                Cargo tarjeta: {formatCurrencyCLP(pago.monto)} = base{' '}
                {formatCurrencyCLP(pago.baseMonto)} + IVA{' '}
                {formatCurrencyCLP(Math.max(0, pago.monto - pago.baseMonto))}
              </p>
            )}
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onUpdate(pagosMixtos.filter((_, itemIndex) => itemIndex !== index))}
              className='rounded-full px-3 h-10 border-red-200 text-red-500 hover:bg-red-500 hover:text-white transition-colors'
            >
              Quitar
            </Button>
          </div>
        ))}
      </div>

      <div className='mt-4 flex flex-wrap gap-2'>
        {FORMAT_METODOS.map(metodo => {
          if (pagosMixtos.some(pago => pago.metodo === metodo)) return null;

          const sinSaldo = metodo === 'prepago' && Number(selectedClientData?.saldo || 0) <= 0;

          return (
            <Button
              key={metodo}
              type='button'
              variant='outline'
              size='sm'
              disabled={sinSaldo}
              onClick={() => onUpdate([...pagosMixtos, crearPagoMixto(metodo, 0)])}
              className='rounded-full uppercase text-[10px] font-black h-8 px-4 border-slate-300 shadow-sm'
            >
              + {metodo}
            </Button>
          );
        })}
      </div>

      <div className='mt-4 border-t border-slate-200 border-dashed pt-3 text-sm dark:border-slate-800'>
        <div className='flex items-center justify-between text-slate-600 dark:text-slate-300'>
          <span className='font-bold uppercase text-[10px]'>Suma actual</span>
          <span
            className={
              pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0) === total
                ? 'font-black text-emerald-600'
                : 'font-black text-red-500'
            }
          >
            {formatCurrencyCLP(pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0))}
          </span>
        </div>
        {pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0) !== total && (
          <p className='mt-1 text-[10px] font-bold text-red-500 uppercase text-right'>
            Falta{' '}
            {formatCurrencyCLP(total - pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0))}
          </p>
        )}
      </div>
    </div>
  );
}
