'use client';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';

import { matchesProductSearch } from '@/lib/utils/productSearch';
import {
  hostessMixerMl,
  requiresShortMixer,
  shortMixerConsumption
} from '@/lib/sales/productConfiguration';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import type { Dispatch, SetStateAction } from 'react';
import { Label } from '@/components/ui/label';

/** La bebida se incluye en el corto y conserva su propio consumo en ml. */
export function ShotMixerSelection({
  productos,
  setProductos
}: {
  productos: any[];
  setProductos: Dispatch<SetStateAction<any[]>>;
}) {
  const [bar, setBar] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/bar?acompanamientos=1', { cache: 'no-store', signal: controller.signal })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.data)) throw new Error();
        if (controller.signal.aborted) return;
        setBar(data.data.filter((p: any) => Number(p.stock_bar) > 0 || Number(p.ml_abierta) > 0));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('No se pudieron cargar los productos del bar');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  const update = (index: number, value: any) =>
    setProductos(prev =>
      prev.map((p, i) => (i === index ? { ...p, acompanamiento_corto: value } : p))
    );
  if (!productos.some(p => p.tipo_venta === 'shot')) return null;
  return (
    <section className='space-y-3 rounded-xl border p-4'>
      <h2 className='font-semibold'>Bebida para los cortos</h2>
      <p className='text-sm text-muted-foreground'>
        Elige Coca-Cola, Sprite u otra bebida del bar. Cada corto cliente descuenta una unidad; cada
        corto anfitriona descuenta los ml configurados.
      </p>
      <Input
        aria-label='Buscar soda o gaseosa en bar'
        placeholder='Buscar producto o sabor en el bar'
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {loading && <p role='status'>Cargando productos del bar...</p>}
      {error && (
        <div role='alert'>
          {error}{' '}
          <Button
            variant='unstyled'
            type='button'
            className='underline'
            onClick={() => setReload(n => n + 1)}
          >
            Reintentar
          </Button>
        </div>
      )}
      {productos.map(
        (p, index) =>
          p.tipo_venta === 'shot' && (
            <div key={index} className='grid gap-3 rounded-lg border p-3 sm:grid-cols-2'>
              <p className='sm:col-span-2 font-medium'>
                {p.nombre} · {p.cantidad} cortos
              </p>
              <Label className='space-y-1 text-sm'>
                Producto o sabor
                <NativeSelect
                  aria-label={`Soda o gaseosa para ${p.nombre}`}
                  className='h-10 w-full rounded-md border bg-background px-3'
                  disabled={loading || (p.shot_anfitriona && hostessMixerMl(p) <= 0)}
                  value={p.acompanamiento_corto?.presentacion_id ?? ''}
                  onChange={e => {
                    const selected = bar.find(b => b.id === e.target.value);
                    update(
                      index,
                      selected
                        ? {
                            presentacion_id: selected.id,
                            nombre: `${selected.producto_nombre} ${selected.nombre}`,
                            ...shortMixerConsumption(p)
                          }
                        : undefined
                    );
                  }}
                >
                  <option value=''>
                    {requiresShortMixer(p) ? 'Seleccionar producto del bar' : 'Sin bebida'}
                  </option>
                  {bar
                    .filter(
                      b =>
                        b.id !== (p.presentacion_id || p.id) &&
                        ('ml_por_corto' in shortMixerConsumption(p) ||
                          Number(b.stock_bar) >= Number(p.cantidad)) &&
                        (b.id === p.acompanamiento_corto?.presentacion_id ||
                          matchesProductSearch(b, search))
                    )
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        {b.producto_nombre} {b.nombre} · {b.stock_bar} en bar
                        {Number(b.ml_abierta) > 0 ? ` · ${b.ml_abierta} ml abiertos` : ''}
                      </option>
                    ))}
                </NativeSelect>
              </Label>
              {p.shot_anfitriona && hostessMixerMl(p) <= 0 && (
                <p className='text-sm text-amber-600 sm:col-span-2'>
                  Configura los ml de bebida para corto anfitriona en este producto.
                </p>
              )}
              {p.acompanamiento_corto && (
                <p className='text-sm text-muted-foreground sm:col-span-2'>
                  Consumo incluido:{' '}
                  {Number(
                    p.acompanamiento_corto.ml_por_corto ?? p.acompanamiento_corto.unidades ?? 1
                  ) * Number(p.cantidad)}{' '}
                  {p.acompanamiento_corto.ml_por_corto !== undefined ? 'ml' : 'unidades'} de{' '}
                  {p.acompanamiento_corto.nombre}
                </p>
              )}
            </div>
          )
      )}
    </section>
  );
}
