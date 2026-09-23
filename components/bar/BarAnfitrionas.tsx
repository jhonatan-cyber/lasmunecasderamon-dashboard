'use client';

import { useEffect, useState } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import {
  isChampagneProduct,
  getHostessLimit,
  isSimpleProduct
} from '@/components/orders/productModalRules';
import { CHAMPAGNE_DEFAULT_TIERS, type ChampagneTier } from '@/lib/business/champagne';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';
import type { SaleOption } from '@/types/sale-options';
import { parseSavedOptions } from './TransferModal';

/** Champagne cuyo precio depende de la tabla por N° (presentación en $0). */
export function isTierPricedItem(item: {
  categoria_nombre?: string | null;
  opciones_venta?: SaleOption[] | string | null;
  precio_venta?: number | null;
}) {
  return (
    isChampagneProduct({ categoria: item.categoria_nombre ?? '' }) &&
    !(
      parseSavedOptions(item.opciones_venta)?.some(o => Number(o.precio) > 0) ??
      Number(item.precio_venta ?? 0) > 0
    )
  );
}

interface Props {
  productoId: string;
  categoriaNombre?: string | null;
  maxAnfitrionas?: number | null;
  precio?: number | null;
  compact?: boolean;
}

/** Muestra lo configurado en Comisiones: límite + tabla champagne por N. */
export function BarAnfitrionas({
  productoId,
  categoriaNombre,
  maxAnfitrionas,
  precio,
  compact
}: Props) {
  const isChampagne = isChampagneProduct({ categoria: categoriaNombre ?? '' });
  // La tablita arranca oculta en card y tabla; se despliega con el botón.
  const [open, setOpen] = useState(false);
  const [tiers, setTiers] = useState<ChampagneTier[] | null>(null);
  const [loading, setLoading] = useState(isChampagne);

  useEffect(() => {
    if (!isChampagne) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/products/${productoId}/tiers`)
      .then(res => res.json().catch(() => ({})))
      .then(data => {
        if (!alive) return;
        setTiers(
          data.success && Array.isArray(data.data) && data.data.length > 0
            ? data.data
            : CHAMPAGNE_DEFAULT_TIERS
        );
      })
      .catch(() => {
        if (alive) setTiers(CHAMPAGNE_DEFAULT_TIERS);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [isChampagne, productoId]);

  const tiersMax =
    tiers && tiers.length > 0 ? Math.max(...tiers.map(t => Number(t.anfitrionas) || 0)) : null;
  const hasExplicitMax = maxAnfitrionas !== null && maxAnfitrionas !== undefined;
  // Venta simple (no champagne): sin anfitriona por regla, aunque haya máx. configurado.
  const esSimple = !isChampagne && isSimpleProduct(Number(precio ?? 0));

  if (esSimple) {
    return (
      <span className='inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400'>
        <Users className='h-3 w-3' />
        Sin anfitriona
      </span>
    );
  }

  // Prioridad: explícito > tiers cargados > fallback por precio.
  const limite = hasExplicitMax
    ? Number(maxAnfitrionas)
    : ((isChampagne ? (tiersMax ?? null) : null) ??
      getHostessLimit({ categoria: categoriaNombre ?? '', precio: Number(precio ?? 0) }));

  const label = hasExplicitMax
    ? `Máx. ${limite} anf.`
    : isChampagne && (loading || limite === null)
      ? '··· anf.'
      : `Hasta ${limite} anf.`;

  return (
    <div className='space-y-1.5'>
      <div className='flex items-center gap-2 flex-wrap'>
        <span className='inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 text-xs font-bold'>
          <Users className='h-3 w-3' />
          {label}
        </span>
        {isChampagne && (
          <button
            type='button'
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            className='inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors'
          >
            {open ? 'Ocultar precios' : 'Ver precios x N'}
            <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {isChampagne && open && (
        <div className='rounded-xl border border-purple-100 dark:border-purple-900/40 overflow-hidden'>
          {loading || !tiers ? (
            <p className='text-xs text-gray-400 px-3 py-2'>Cargando precios...</p>
          ) : (
            <table className='w-full text-xs'>
              <thead className='bg-purple-50 dark:bg-purple-900/20'>
                <tr>
                  <th className='px-2 py-1 font-bold text-purple-600 text-center'>N°</th>
                  <th className='px-2 py-1 font-bold text-purple-600 text-right'>Precio</th>
                  <th className='px-2 py-1 font-bold text-purple-600 text-right'>Comisión</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-purple-50 dark:divide-purple-900/20'>
                {tiers.map(t => (
                  <tr key={t.anfitrionas}>
                    <td className='px-2 py-1 text-center font-bold'>{t.anfitrionas}</td>
                    <td className='px-2 py-1 text-right tabular-nums'>
                      {formatCurrencyCLP(t.precio)}
                    </td>
                    <td className='px-2 py-1 text-right tabular-nums text-muted-foreground'>
                      {formatCurrencyCLP(t.comision)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!compact && (
            <p className='text-[10px] text-gray-400 px-3 py-1.5'>
              Configurado en Ajustes → Comisiones → Precios Champagne.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
