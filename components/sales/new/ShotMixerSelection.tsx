'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import type { Dispatch, SetStateAction } from 'react';

/** El acompañamiento se incluye en el corto y conserva su propio consumo en ml. */
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
    fetch('/api/bar', { cache: 'no-store', signal: controller.signal })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.data)) throw new Error();
        setBar(data.data.filter((p: any) => Number(p.stock_bar) > 0));
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
  return (
    <section className='space-y-3 rounded-xl border p-4'>
      <h2 className='font-semibold'>Soda o gaseosa para los cortos</h2>
      <p className='text-sm text-muted-foreground'>
        Incluida en el precio. Se descontarán los ml por corto y se usará primero la botella abierta
        del producto elegido.
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
          <button type='button' className='underline' onClick={() => setReload(n => n + 1)}>
            Reintentar
          </button>
        </div>
      )}
      {productos.map(
        (p, index) =>
          p.tipo_venta === 'shot' && (
            <div key={index} className='grid gap-3 rounded-lg border p-3 sm:grid-cols-2'>
              <p className='sm:col-span-2 font-medium'>
                {p.nombre} · {p.cantidad} cortos
              </p>
              <label className='space-y-1 text-sm'>
                Producto o sabor
                <select
                  aria-label={`Soda o gaseosa para ${p.nombre}`}
                  className='h-10 w-full rounded-md border bg-background px-3'
                  disabled={loading}
                  value={p.acompanamiento_corto?.presentacion_id ?? ''}
                  onChange={e => {
                    const selected = bar.find(b => b.id === e.target.value);
                    update(
                      index,
                      selected
                        ? {
                            presentacion_id: selected.id,
                            nombre: `${selected.producto_nombre} ${selected.nombre}`,
                            ml_por_corto: p.acompanamiento_corto?.ml_por_corto ?? 0
                          }
                        : undefined
                    );
                  }}
                >
                  <option value=''>Seleccionar producto del bar</option>
                  {bar
                    .filter(
                      b =>
                        b.id !== (p.presentacion_id || p.id) &&
                        (b.id === p.acompanamiento_corto?.presentacion_id ||
                          `${b.producto_nombre} ${b.nombre}`
                            .toLowerCase()
                            .includes(search.toLowerCase()))
                    )
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        {b.producto_nombre} {b.nombre} · {b.stock_bar} en bar
                        {Number(b.ml_abierta) > 0 ? ` · ${b.ml_abierta} ml abiertos` : ''}
                      </option>
                    ))}
                </select>
              </label>
              <label className='space-y-1 text-sm'>
                Ml de soda o gaseosa por corto
                <Input
                  aria-label={`Ml de acompañamiento para ${p.nombre}`}
                  type='number'
                  min={1}
                  max={10000}
                  step={1}
                  value={p.acompanamiento_corto?.ml_por_corto || ''}
                  disabled={!p.acompanamiento_corto}
                  onChange={e =>
                    update(index, {
                      ...p.acompanamiento_corto,
                      ml_por_corto: Number(e.target.value)
                    })
                  }
                />
              </label>
              {p.acompanamiento_corto && (
                <p className='text-sm text-muted-foreground sm:col-span-2'>
                  Consumo incluido:{' '}
                  {Number(p.acompanamiento_corto.ml_por_corto) * Number(p.cantidad)} ml de{' '}
                  {p.acompanamiento_corto.nombre}
                </p>
              )}
            </div>
          )
      )}
    </section>
  );
}
