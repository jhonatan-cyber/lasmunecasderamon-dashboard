'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  LoaderCircle,
  Plus,
  ScanLine,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import type { StockReconciliationProduct } from '@/modules/inventario/contracts';

type ReclassificationPayload = {
  productoId: string;
  presentacionOrigenId: string;
  presentacionDestinoId: string;
  codigosUnidades: string[];
};

async function cargarConciliacion(signal: AbortSignal): Promise<StockReconciliationProduct[]> {
  const response = await fetch('/api/products/stock-reconciliation', { signal });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    throw new Error(result?.message || 'No se pudo cargar la conciliación de inventario');
  }
  return result.data as StockReconciliationProduct[];
}

function PresentationReconciliationForm({
  product,
  presentation,
  destinations,
  canWrite,
  onReclassify,
  isPending
}: {
  product: StockReconciliationProduct;
  presentation: StockReconciliationProduct['presentaciones'][number];
  destinations: StockReconciliationProduct['presentaciones'];
  canWrite: boolean;
  onReclassify: (payload: ReclassificationPayload) => Promise<void>;
  isPending: boolean;
}) {
  const [destinationId, setDestinationId] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [unitCodes, setUnitCodes] = useState<string[]>([]);

  const addCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = unitCode.trim();
    if (!code || unitCodes.includes(code)) return;
    setUnitCodes(previous => [...previous, code]);
    setUnitCode('');
  };

  const submit = async () => {
    if (!destinationId || unitCodes.length === 0) return;
    try {
      await onReclassify({
        productoId: product.productoId,
        presentacionOrigenId: presentation.id,
        presentacionDestinoId: destinationId,
        codigosUnidades: unitCodes
      });
      setUnitCodes([]);
      setDestinationId('');
    } catch {
      // La mutación comunica el error al usuario y conserva los códigos para reintentar.
    }
  };

  return (
    <div className='rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <p className='font-semibold text-slate-900 dark:text-white'>{presentation.nombre}</p>
          <p className='text-sm text-slate-600 dark:text-slate-300'>
            {presentation.stockBodega} unidades en Bodega pendientes de identificar
          </p>
        </div>
        <ScanLine className='h-5 w-5 text-amber-700 dark:text-amber-300' aria-hidden='true' />
      </div>

      {canWrite ? (
        destinations.length > 0 ? (
          <div className='mt-4 space-y-3'>
            <form onSubmit={addCode} className='flex flex-col gap-2 sm:flex-row'>
              <Input
                value={unitCode}
                onChange={event => setUnitCode(event.target.value)}
                placeholder='Escanea o ingresa el código de la unidad'
                aria-label={`Código físico de unidad para ${product.productoNombre}`}
                autoComplete='off'
                maxLength={64}
              />
              <Button type='submit' variant='outline' disabled={!unitCode.trim()}>
                <Plus aria-hidden='true' />
                Agregar
              </Button>
            </form>

            {unitCodes.length > 0 && (
              <ul className='flex flex-wrap gap-2' aria-label='Unidades escaneadas'>
                {unitCodes.map(code => (
                  <li
                    key={code}
                    className='flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-mono dark:bg-slate-900'
                  >
                    {code}
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-5 w-5 rounded-full p-0 text-slate-500 hover:text-red-600'
                      aria-label={`Quitar código ${code}`}
                      onClick={() =>
                        setUnitCodes(previous => previous.filter(item => item !== code))
                      }
                    >
                      <X className='h-3 w-3' aria-hidden='true' />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className='flex flex-col gap-2 sm:flex-row'>
              <NativeSelect
                value={destinationId}
                onChange={event => setDestinationId(event.target.value)}
                aria-label={`Presentación confirmada para ${product.productoNombre}`}
                className='min-w-0 flex-1'
              >
                <option value=''>Selecciona la presentación física correcta</option>
                {destinations.map(destination => (
                  <option key={destination.id} value={destination.id}>
                    {destination.nombre}
                  </option>
                ))}
              </NativeSelect>
              <Button
                type='button'
                onClick={submit}
                disabled={!destinationId || unitCodes.length === 0 || isPending}
              >
                <Check aria-hidden='true' />
                Confirmar {unitCodes.length} {unitCodes.length === 1 ? 'unidad' : 'unidades'}
              </Button>
            </div>
            <p className='text-xs text-slate-600 dark:text-slate-300'>
              Solo se actualizarán los códigos escaneados que aún estén activos en Bodega.
            </p>
          </div>
        ) : (
          <p className='mt-3 text-sm text-slate-600 dark:text-slate-300'>
            Este producto no tiene una presentación confirmada para usar como destino.
          </p>
        )
      ) : (
        <p className='mt-3 text-sm text-slate-600 dark:text-slate-300'>
          Necesitas permiso de escritura en Productos para confirmar presentaciones.
        </p>
      )}
    </div>
  );
}

function ProductReconciliationCard({
  product,
  canWrite,
  onReclassify,
  isPending
}: {
  product: StockReconciliationProduct;
  canWrite: boolean;
  onReclassify: (payload: ReclassificationPayload) => Promise<void>;
  isPending: boolean;
}) {
  const pendingPresentations = product.presentaciones.filter(
    presentation => presentation.pendiente && presentation.stockBodega > 0
  );
  const destinations = product.presentaciones.filter(presentation => !presentation.pendiente);

  return (
    <article className='space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5'>
      <header className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h2 className='text-lg font-bold text-slate-900 dark:text-white'>
            {product.productoNombre}
          </h2>
          {product.productoCodigo && (
            <p className='text-xs text-slate-500'>Código: {product.productoCodigo}</p>
          )}
        </div>
        {product.discrepanciaStock && (
          <span className='inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300'>
            <AlertTriangle className='h-3.5 w-3.5' aria-hidden='true' />
            Conteo agregado distinto
          </span>
        )}
      </header>

      <dl className='grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900/60 sm:grid-cols-3'>
        <div>
          <dt className='text-xs text-slate-500'>Stock agregado</dt>
          <dd className='font-bold'>{product.stockProducto}</dd>
        </div>
        <div>
          <dt className='text-xs text-slate-500'>Unidades activas en Bodega</dt>
          <dd className='font-bold'>{product.stockUnidades}</dd>
        </div>
        <div className='col-span-2 sm:col-span-1'>
          <dt className='text-xs text-slate-500'>Diferencia</dt>
          <dd className='font-bold'>{product.stockProducto - product.stockUnidades}</dd>
        </div>
      </dl>

      {pendingPresentations.length > 0 ? (
        <div className='space-y-3'>
          {pendingPresentations.map(presentation => (
            <PresentationReconciliationForm
              key={presentation.id}
              product={product}
              presentation={presentation}
              destinations={destinations}
              canWrite={canWrite}
              onReclassify={onReclassify}
              isPending={isPending}
            />
          ))}
        </div>
      ) : (
        <p className='text-sm text-slate-600 dark:text-slate-300'>
          La diferencia requiere revisar el registro de stock; no hay unidades provisionales
          escaneables para asignar.
        </p>
      )}
    </article>
  );
}

export function StockReconciliationClient() {
  const queryClient = useQueryClient();
  const { hasPermission } = useUserPermissions();
  const canWrite = hasPermission('products', 'write');
  const reconciliation = useQuery({
    queryKey: ['products', 'stock-reconciliation'],
    queryFn: ({ signal }) => cargarConciliacion(signal)
  });
  const reclassify = useMutation({
    mutationFn: async (payload: ReclassificationPayload) => {
      const response = await fetch('/api/products/stock-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'No se pudo confirmar la presentación');
      }
      return Number(result.data?.unidadesActualizadas ?? 0);
    },
    onSuccess: async count => {
      toast.success(
        `${count} ${count === 1 ? 'unidad conciliada' : 'unidades conciliadas'} sin cambiar el stock de Bodega`
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products', 'stock-reconciliation'] }),
        queryClient.invalidateQueries({ queryKey: ['product-presentations'] })
      ]);
    },
    onError: error => toast.error(error.message)
  });

  if (reconciliation.isLoading) {
    return (
      <div
        className='flex min-h-64 items-center justify-center gap-2 p-6 text-slate-600'
        role='status'
      >
        <LoaderCircle className='h-5 w-5 animate-spin' aria-hidden='true' />
        Cargando conciliación de inventario…
      </div>
    );
  }

  if (reconciliation.isError) {
    return (
      <div className='p-4 sm:p-6' role='alert'>
        <p className='text-red-700'>{reconciliation.error.message}</p>
        <Button className='mt-3' variant='outline' onClick={() => reconciliation.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const products = reconciliation.data ?? [];
  return (
    <main className='mx-auto min-w-0 max-w-5xl space-y-5 p-4 sm:p-6 lg:p-8'>
      <header className='flex items-start gap-3'>
        <ClipboardCheck className='mt-1 h-6 w-6 shrink-0 text-emerald-600' aria-hidden='true' />
        <div>
          <h1 className='text-2xl font-bold text-slate-900 dark:text-white'>
            Conciliar stock por presentación
          </h1>
          <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
            Compara el stock agregado con las unidades activas en Bodega. Identifica el formato real
            escaneando cada unidad; ninguna se reasigna automáticamente.
          </p>
        </div>
      </header>

      {products.length === 0 ? (
        <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/20'>
          <Check className='mx-auto h-8 w-8 text-emerald-600' aria-hidden='true' />
          <p className='mt-2 font-semibold'>No hay stock pendiente de conciliación.</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {products.map(product => (
            <ProductReconciliationCard
              key={product.productoId}
              product={product}
              canWrite={canWrite}
              onReclassify={payload => reclassify.mutateAsync(payload).then(() => undefined)}
              isPending={reclassify.isPending}
            />
          ))}
        </div>
      )}
    </main>
  );
}
