'use client';
import { NativeSelect } from '@/components/ui/native-select';

import { bottleMixerUnits } from '@/lib/sales/productConfiguration';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

export function BottleMixerSelection({
  productos,
  setProductos
}: {
  productos: any[];
  setProductos: Dispatch<SetStateAction<any[]>>;
}) {
  const [bar, setBar] = useState<any[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/bar?acompanamientos=1', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error();
        setBar(result.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, []);
  if (!productos.some(p => p.tipo_venta !== 'shot' && bottleMixerUnits(p) > 0)) return null;
  return (
    <section className='space-y-3 rounded-xl border p-4'>
      <h2 className='font-semibold'>Bebida de las botellas</h2>
      <p className='text-sm text-muted-foreground'>
        Selecciona el producto incluido. Se descontarán sus unidades del bar.
      </p>
      {error && <p role='alert'>No se pudieron cargar las bebidas. Recarga para reintentar.</p>}
      {productos.map((p, index) =>
        p.tipo_venta !== 'shot' && bottleMixerUnits(p) ? (
          <label key={index} className='block space-y-2 text-sm'>
            <span>
              {p.nombre} · {Number(p.cantidad) * Number(bottleMixerUnits(p))} unidades de bebida
            </span>
            <NativeSelect
              className='h-10 w-full rounded-md border bg-background px-3'
              aria-label={`Bebida para ${p.nombre}`}
              value={p.acompanamiento_botella?.presentacion_id ?? ''}
              onChange={event => {
                const id = event.target.value;
                setProductos(prev =>
                  prev.map((item, i) =>
                    i === index
                      ? {
                          ...item,
                          acompanamiento_botella: id
                            ? {
                                presentacion_id: id,
                                unidades: bottleMixerUnits(item)
                              }
                            : undefined
                        }
                      : item
                  )
                );
              }}
            >
              <option value=''>Seleccionar bebida del bar</option>
              {bar
                .filter(
                  item =>
                    String(item.id) !== String(p.presentacion_id || p.id) &&
                    Number(item.stock_bar) >= Number(p.cantidad) * Number(bottleMixerUnits(p))
                )
                .map(item => (
                  <option key={item.id} value={item.id}>
                    {item.producto_nombre} · {item.nombre}
                  </option>
                ))}
            </NativeSelect>
          </label>
        ) : null
      )}
    </section>
  );
}
