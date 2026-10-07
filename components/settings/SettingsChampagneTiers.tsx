'use client';

import { useState, useEffect, useImperativeHandle, type Ref } from 'react';
import { CHAMPAGNE_DEFAULT_TIERS } from '@/lib/business/champagne';

interface ChampagneRow {
  anfitrionas: number;
  precio: string;
  comision: string;
}

export interface SettingsTiersHandle {
  getTiers: () => Array<{ anfitrionas: number; precio: number; comision: number }>;
}

const formatMiles = (v: string | number) =>
  String(v ?? '')
    .replace(/\D/g, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const toNumber = (v: string) => Number(String(v).replace(/\./g, '')) || 0;

function defaultRows(
  n: number,
  champagne: boolean,
  precio: number,
  comision: number
): ChampagneRow[] {
  const rows: ChampagneRow[] = [];
  for (let i = 1; i <= n; i++) {
    const base = champagne ? CHAMPAGNE_DEFAULT_TIERS.find(t => t.anfitrionas === i) : undefined;
    rows.push({
      anfitrionas: i,
      precio: formatMiles(base?.precio ?? precio),
      comision: formatMiles(base?.comision ?? comision)
    });
  }
  return rows;
}

/** Tabla de precios por cantidad de anfitrionas, controlada por el máximo del producto. */
export function SettingsChampagneTiers({
  productId,
  maxAnfitrionas,
  champagne = false,
  precioBase = 0,
  comisionBase = 0,
  ref,
  disabled = false
}: {
  productId: string;
  maxAnfitrionas: number;
  champagne?: boolean;
  precioBase?: number;
  comisionBase?: number;
  ref?: Ref<SettingsTiersHandle>;
  disabled?: boolean;
}) {
  const maxN = Math.min(10, Math.max(1, Math.floor(maxAnfitrionas)));
  const [rows, setRows] = useState<ChampagneRow[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loadingTiers, setLoadingTiers] = useState(false);

  useEffect(() => {
    if (!productId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoadingTiers(true);
    setLoadError(false);
    fetch(`/api/products/${productId}/tiers?configurados=1`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('No se pudo cargar la tabla');
        return data;
      })
      .then(data => {
        if (cancelled) return;
        const saved = data.success && Array.isArray(data.data) ? data.data : [];
        const defaults = defaultRows(10, champagne, precioBase, comisionBase);
        const merged: ChampagneRow[] = [];
        for (let i = 1; i <= 10; i++) {
          const found = saved.find((t: any) => Number(t.anfitrionas) === i);
          const base = defaults[i - 1];
          merged.push({
            anfitrionas: i,
            precio: found ? formatMiles(found.precio) : base.precio,
            comision: found ? formatMiles(found.comision) : base.comision
          });
        }
        setRows(merged);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingTiers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, champagne, precioBase, comisionBase]);
  const visibleRows = rows.slice(0, maxN);

  useImperativeHandle(
    ref,
    () => ({
      getTiers: () => {
        if (loadingTiers || loadError || visibleRows.length !== maxN)
          throw new Error('Esperá a que se cargue la tabla de precios antes de guardar');
        for (const row of visibleRows) {
          if (row.precio.trim() === '' || isNaN(toNumber(row.precio))) {
            throw new Error(`Fila ${row.anfitrionas}: precio inválido`);
          }
          if (row.comision.trim() !== '' && isNaN(toNumber(row.comision))) {
            throw new Error(`Fila ${row.anfitrionas}: comisión inválida`);
          }
        }
        return visibleRows.map(r => ({
          anfitrionas: r.anfitrionas,
          precio: toNumber(r.precio),
          comision: toNumber(r.comision)
        }));
      }
    }),
    [visibleRows, loadingTiers, loadError, maxN]
  );

  return (
    <div className='space-y-4'>
      <div className='flex flex-col sm:flex-row gap-4 sm:items-end justify-between'>
        <div>
          <p className='text-sm font-bold text-purple-900 dark:text-purple-200'>
            Precios por cantidad de anfitrionas
          </p>
          <p className='text-xs text-purple-700/70 dark:text-purple-300/70'>
            Al elegir N anfitrionas en la venta, el precio se toma de esta tabla.
          </p>
        </div>
        <p className='text-xs text-muted-foreground'>
          Máximo: {maxN} anfitrionas · tabla compartida por producto
        </p>
      </div>

      {loadingTiers ? (
        <div className='text-center py-6'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto' />
        </div>
      ) : loadError ? (
        <p role='alert'>
          No se pudo cargar la tabla. Volvé a seleccionar el producto para reintentar.
        </p>
      ) : (
        <div className='overflow-x-auto rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-white dark:bg-neutral-950'>
          <table className='w-full text-sm'>
            <thead className='bg-purple-50 dark:bg-purple-900/20'>
              <tr>
                <th className='px-4 py-3 font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider text-xs text-center'>
                  Anfitrionas
                </th>
                <th className='px-4 py-3 font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider text-xs text-right'>
                  Precio
                </th>
                <th className='px-4 py-3 font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider text-xs text-right'>
                  Comisión total
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-purple-100 dark:divide-purple-900/30'>
              {visibleRows.map((row, i) => (
                <tr
                  key={row.anfitrionas}
                  className='hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
                >
                  <td className='px-4 py-2.5 text-center'>
                    <span className='inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-sm'>
                      {row.anfitrionas}
                    </span>
                  </td>
                  <td className='px-4 py-2.5 text-right'>
                    <input
                      inputMode='numeric'
                      disabled={disabled}
                      aria-label={`Precio para ${row.anfitrionas} anfitrionas`}
                      value={row.precio}
                      onChange={e => {
                        const v = e.target.value
                          .replace(/\D/g, '')
                          .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        setRows(prev => prev.map((r, j) => (j === i ? { ...r, precio: v } : r)));
                      }}
                      className='w-32 px-3 py-1.5 text-right bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full text-sm'
                    />
                  </td>
                  <td className='px-4 py-2.5 text-right'>
                    <input
                      inputMode='numeric'
                      disabled={disabled}
                      aria-label={`Comisión para ${row.anfitrionas} anfitrionas`}
                      value={row.comision}
                      onChange={e => {
                        const v = e.target.value
                          .replace(/\D/g, '')
                          .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        setRows(prev => prev.map((r, j) => (j === i ? { ...r, comision: v } : r)));
                      }}
                      className='w-32 px-3 py-1.5 text-right bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full text-sm'
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
