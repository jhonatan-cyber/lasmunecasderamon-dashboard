'use client';

import { useState, useEffect, useMemo } from 'react';
import { Save, Wine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';
import { isChampagneProduct } from '@/components/orders/productModalRules';
import { useSettingsProducts } from '@/hooks/settings/useSettingsProducts';
import { CHAMPAGNE_DEFAULT_TIERS, CHAMPAGNE_MAX_ANFITRIONAS } from '@/lib/business/champagne';

interface ChampagneRow {
  anfitrionas: number;
  precio: string;
  comision: string;
}

interface ChampagneProduct {
  id: string;
  name: string;
  categoria?: string;
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

export function SettingsChampagneCard() {
  const { productos: allProductos, loading } = useSettingsProducts();
  const [selectedId, setSelectedId] = useState<string>('');
  const [maxN, setMaxN] = useState(CHAMPAGNE_MAX_ANFITRIONAS);
  const [rows, setRows] = useState<ChampagneRow[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [saving, setSaving] = useState(false);

  const productos: ChampagneProduct[] = useMemo(
    () =>
      allProductos.filter((p: any) =>
        isChampagneProduct({ categoria: p.categoria, category_name: p.categoria })
      ),
    [allProductos]
  );

  useEffect(() => {
    if (productos.length > 0 && !selectedId) {
      setSelectedId(String(productos[0].id));
    }
  }, [productos, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoadingTiers(true);
    fetch(`/api/products/${selectedId}/tiers`)
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
  }, [selectedId]);

  const handleMaxChange = (n: number) => {
    const capped = Math.min(Math.max(1, Math.floor(n) || 1), 10);
    setMaxN(capped);
    setRows(prev => {
      if (capped <= prev.length) return prev.slice(0, capped);
      return [...prev, ...defaultRows(capped).slice(prev.length)];
    });
  };

  const handleSave = async () => {
    if (!selectedId) return;
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
      const res = await fetch(`/api/products/${selectedId}/tiers`, {
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
      logger.captureException(error, { context: 'SettingsChampagneCard:save' });
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className='border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-xl font-bold dark:text-white'>
          <Wine className='h-5 w-5 text-neutral-500' />
          Precios Champagne por Anfitrionas
        </CardTitle>
        <CardDescription className='text-neutral-500 dark:text-neutral-400'>
          Definí por producto el precio y la comisión según la cantidad de anfitrionas. En ventas,
          al elegir N anfitrionas el precio se toma de esta tabla.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='text-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-500 mx-auto' />
            <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-2'>
              Cargando productos champagne...
            </p>
          </div>
        ) : productos.length === 0 ? (
          <p className='text-center py-8 text-neutral-400 text-sm'>
            No hay productos en la categoría Champagne.
          </p>
        ) : (
          <div className='space-y-6'>
            <div className='flex flex-col sm:flex-row gap-4 sm:items-end'>
              <div className='flex-1 space-y-1'>
                <label className='block text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1'>
                  Producto champagne
                </label>
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  className='w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full text-sm'
                >
                  {productos.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1'>
                <label className='block text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1'>
                  N° máx. anfitrionas
                </label>
                <input
                  type='number'
                  min={1}
                  max={10}
                  value={maxN}
                  onChange={e => handleMaxChange(Number(e.target.value))}
                  className='w-28 px-3 py-2.5 text-center bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full text-sm'
                />
              </div>
            </div>

            {loadingTiers ? (
              <div className='text-center py-6'>
                <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-500 mx-auto' />
              </div>
            ) : (
              <div className='overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800'>
                <table className='w-full text-sm'>
                  <thead className='bg-neutral-100 dark:bg-neutral-800/50'>
                    <tr>
                      <th className='px-4 py-3 font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider text-xs text-center'>
                        Anfitrionas
                      </th>
                      <th className='px-4 py-3 font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider text-xs text-right'>
                        Precio
                      </th>
                      <th className='px-4 py-3 font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider text-xs text-right'>
                        Comisión total
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
                    {rows.map((row, i) => (
                      <tr
                        key={row.anfitrionas}
                        className='hover:bg-neutral-50 dark:hover:bg-neutral-800/20'
                      >
                        <td className='px-4 py-2.5 text-center'>
                          <span className='inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-sm'>
                            {row.anfitrionas}
                          </span>
                        </td>
                        <td className='px-4 py-2.5 text-right'>
                          <input
                            inputMode='numeric'
                            value={row.precio}
                            onChange={e => {
                              const v = e.target.value
                                .replace(/\D/g, '')
                                .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                              setRows(prev =>
                                prev.map((r, j) => (j === i ? { ...r, precio: v } : r))
                              );
                            }}
                            className='w-32 px-3 py-1.5 text-right bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full text-sm'
                          />
                        </td>
                        <td className='px-4 py-2.5 text-right'>
                          <input
                            inputMode='numeric'
                            value={row.comision}
                            onChange={e => {
                              const v = e.target.value
                                .replace(/\D/g, '')
                                .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                              setRows(prev =>
                                prev.map((r, j) => (j === i ? { ...r, comision: v } : r))
                              );
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

            <div className='flex justify-end pt-2'>
              <button
                onClick={handleSave}
                disabled={saving || loadingTiers}
                className='flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white hover:scale-105 active:scale-95 transition-all duration-200 rounded-full font-bold disabled:opacity-50'
              >
                <Save className='h-4 w-4' />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
