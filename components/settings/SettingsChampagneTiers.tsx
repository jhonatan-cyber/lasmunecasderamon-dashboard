'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';
import { CHAMPAGNE_DEFAULT_TIERS, CHAMPAGNE_MAX_ANFITRIONAS } from '@/lib/business/champagne';

interface ChampagneRow {
  anfitrionas: number;
  precio: string;
  comision: string;
}

const formatMiles = (v: string | number) =>
  String(v ?? '')
    .replace(/\D/g, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const toNumber = (v: string) => Number(String(v).replace(/\./g, '')) || 0;

function defaultRows(n: number): ChampagneRow[] {
  const rows: ChampagneRow[] = [];
  for (let i = 1; i <= n; i++) {
    const base = CHAMPAGNE_DEFAULT_TIERS.find(t => t.anfitrionas === i);
    rows.push({
      anfitrionas: i,
      precio: base ? formatMiles(base.precio) : '',
      comision: base ? formatMiles(base.comision) : ''
    });
  }
  return rows;
}

/** Tabla de precios por N° de anfitrionas para un producto champagne. */
export function SettingsChampagneTiers({ productId }: { productId: string }) {
  const [maxN, setMaxN] = useState(CHAMPAGNE_MAX_ANFITRIONAS);
  const [rows, setRows] = useState<ChampagneRow[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!productId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoadingTiers(true);
    fetch(`/api/products/${productId}/tiers`)
      .then(res => res.json().catch(() => ({})))
      .then(data => {
        if (cancelled) return;
        const saved = data.success && Array.isArray(data.data) ? data.data : [];
        const n = Math.max(
          saved.length > 0 ? Math.max(...saved.map((t: any) => Number(t.anfitrionas))) : 0,
          1
        );
        const capped = Math.min(Math.max(n, 1), 10);
        setMaxN(capped);
        const merged: ChampagneRow[] = [];
        for (let i = 1; i <= capped; i++) {
          const found = saved.find((t: any) => Number(t.anfitrionas) === i);
          const base = CHAMPAGNE_DEFAULT_TIERS.find(t => t.anfitrionas === i);
          merged.push({
            anfitrionas: i,
            precio: formatMiles(found?.precio ?? base?.precio ?? ''),
            comision: formatMiles(found?.comision ?? base?.comision ?? '')
          });
        }
        setRows(merged);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingTiers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleMaxChange = (n: number) => {
    const capped = Math.min(Math.max(1, Math.floor(n) || 1), 10);
    setMaxN(capped);
    setRows(prev => {
      if (capped <= prev.length) return prev.slice(0, capped);
      return [...prev, ...defaultRows(capped).slice(prev.length)];
    });
  };

  const handleSave = async () => {
    if (!productId) return;
    for (const row of rows) {
      if (row.precio.trim() === '' || isNaN(toNumber(row.precio))) {
        toast.error(`Fila ${row.anfitrionas}: precio inválido`);
        return;
      }
      if (row.comision.trim() !== '' && isNaN(toNumber(row.comision))) {
        toast.error(`Fila ${row.anfitrionas}: comisión inválida`);
        return;
      }
    }
    try {
      setSaving(true);
      const res = await fetch(`/api/products/${productId}/tiers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiers: rows.map(r => ({
            anfitrionas: r.anfitrionas,
            precio: toNumber(r.precio),
            comision: toNumber(r.comision)
          }))
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) throw new Error(result.message || 'Error al guardar');
      toast.success('Tabla de precios champagne actualizada');
    } catch (error) {
      logger.captureException(error, { context: 'SettingsChampagneTiers:save' });
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-4 rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/10 p-4'>
      <div className='flex flex-col sm:flex-row gap-4 sm:items-end justify-between'>
        <div>
          <p className='text-sm font-bold text-purple-900 dark:text-purple-200'>
            Precios champagne por anfitrionas
          </p>
          <p className='text-xs text-purple-700/70 dark:text-purple-300/70'>
            Al elegir N anfitrionas en la venta, el precio se toma de esta tabla.
          </p>
        </div>
        <div className='space-y-1'>
          <label
            htmlFor='champagne-max'
            className='block text-xs font-bold uppercase tracking-wider text-purple-700/70 dark:text-purple-300/70 ml-1'
          >
            N° máx. anfitrionas
          </label>
          <input
            id='champagne-max'
            type='number'
            min={1}
            max={10}
            value={maxN}
            onChange={e => handleMaxChange(Number(e.target.value))}
            className='w-28 px-3 py-2 text-center bg-white dark:bg-neutral-950 border border-purple-200 dark:border-purple-900/40 rounded-full text-sm'
          />
        </div>
      </div>

      {loadingTiers ? (
        <div className='text-center py-6'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto' />
        </div>
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
              {rows.map((row, i) => (
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

      <div className='flex justify-end'>
        <button
          type='button'
          onClick={handleSave}
          disabled={saving || loadingTiers}
          className='flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm bg-purple-600 hover:bg-purple-700 text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50'
        >
          <Save className='h-4 w-4' />
          {saving ? 'Guardando...' : 'Guardar precios'}
        </button>
      </div>
    </div>
  );
}
