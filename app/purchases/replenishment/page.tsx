'use client';

import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardList,
  PackageCheck,
  PackagePlus,
  Printer,
  RefreshCw,
  MessageCircle,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PURCHASE_BUTTON_CLASS } from '@/components/purchases/buttonStyles';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import type { OrdenReposicion } from '@/modules/inventario/contracts';
import { toast } from 'sonner';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import {
  subtotalReposicion,
  totalReposicion,
  textoOrdenReposicion
} from '@/lib/business/replenishmentOrder';

export default function ReplenishmentPage() {
  const [rows, setRows] = useState<OrdenReposicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/purchases/replenishment', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo cargar la orden');
      setRows(result.data);
      setError('');
      return result.data as OrdenReposicion[];
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load().catch(() => {});
  }, [load]);
  useRealtimeRefresh('/api/purchases', load);

  const exportOrder = async (whatsapp: boolean) => {
    setBusy(true);
    try {
      const fresh = await load();
      if (!fresh.length) {
        toast.info('El stock ya no requiere reposición');
        return;
      }
      if (whatsapp) {
        const text = textoOrdenReposicion(fresh);
        window.location.assign(`https://wa.me/?text=${encodeURIComponent(text)}`);
      } else {
        flushSync(() => setRows(fresh));
        window.print();
      }
    } catch {
      toast.error('No se pudo actualizar la orden. Reintenta antes de compartir.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PermissionGuard module='products' action='view'>
      <style>{`@media print { body * { visibility: hidden; } #replenishment-order, #replenishment-order * { visibility: visible; } #replenishment-order { position: absolute; left: 0; top: 0; width: 100%; padding: 0; background: white; color: black; } #replenishment-order * { color: black !important; background: transparent !important; overflow: visible !important; } #replenishment-order tr { break-inside: avoid; } #replenishment-order table { width: 100%; border-collapse: collapse; } #replenishment-order th, #replenishment-order td { border-bottom: 1px solid #aaa; padding: 5px; font-size: 9px; } @page { size: A4 landscape; margin: 10mm; } }`}</style>
      <main className='p-4 sm:p-6 lg:p-10 space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5'>
          <div className='space-y-2'>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2'>
              <ClipboardList className='h-6 w-6 shrink-0' />
              Orden de compra
            </h1>
            <p className='text-sm text-muted-foreground'>
              Reposición de productos con stock bajo en Bar y Bodega.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button asChild variant='outline' className='rounded-full'>
              <Link href='/purchases'>
                <ArrowLeft className='h-4 w-4' />
                Volver
              </Link>
            </Button>
            <Button
              variant='outline'
              className='rounded-full'
              onClick={() => void load().catch(() => {})}
              disabled={busy || loading}
            >
              <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              variant='outline'
              className='rounded-full'
              onClick={() => void exportOrder(false)}
              disabled={busy || !rows.length || Boolean(error)}
            >
              <Printer className='h-4 w-4' />
              Imprimir orden
            </Button>
            <Button
              className={PURCHASE_BUTTON_CLASS}
              onClick={() => void exportOrder(true)}
              disabled={busy || !rows.length || Boolean(error)}
            >
              <MessageCircle className='h-4 w-4' />
              Compartir por WhatsApp
            </Button>
          </div>
        </div>
        {!loading && !error && (
          <div className='grid gap-4 sm:grid-cols-3'>
            {[
              {
                label: 'Presentaciones por reponer',
                value: rows.length.toLocaleString('es-CL'),
                Icon: ClipboardList,
                color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              },
              {
                label: 'Unidades a comprar',
                value: rows.reduce((sum, row) => sum + row.cantidad, 0).toLocaleString('es-CL'),
                Icon: PackagePlus,
                color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              },
              {
                label: 'Importe estimado de compra',
                value: formatCurrencyCLP(totalReposicion(rows)),
                Icon: Wallet,
                color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }
            ].map(({ label, value, Icon, color }) => (
              <div
                key={label}
                className='rounded-3xl bg-white dark:bg-slate-900/40 p-5 shadow-md flex items-center gap-4'
              >
                <div className={`rounded-2xl p-3 ${color}`}>
                  <Icon className='h-5 w-5' />
                </div>
                <div className='min-w-0'>
                  <p className='text-xs text-muted-foreground'>{label}</p>
                  <p className='text-2xl font-bold tabular-nums break-words'>{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {error && (
          <p
            role='alert'
            className='rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400'
          >
            {error}
          </p>
        )}
        {loading ? (
          <div
            role='status'
            className='rounded-3xl bg-white dark:bg-slate-900/40 p-12 flex items-center justify-center gap-3 text-sm text-muted-foreground'
          >
            <RefreshCw className='h-5 w-5 animate-spin' />
            Comprobando Bar y Bodega…
          </div>
        ) : (
          <section
            id='replenishment-order'
            className='rounded-3xl bg-white dark:bg-slate-900/40 shadow-md overflow-hidden'
          >
            <div className='p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3'>
              <div>
                <h2 className='text-lg font-semibold'>Orden de compra por reposición</h2>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Cantidades necesarias para completar el stock máximo.
                </p>
              </div>
              {rows.length > 0 && (
                <Badge className='rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400 px-3 py-1'>
                  Pendiente de compra
                </Badge>
              )}
            </div>
            {error && !rows.length ? (
              <p className='p-8 text-center text-sm text-muted-foreground'>
                Actualiza la orden para volver a comprobar el stock.
              </p>
            ) : !rows.length ? (
              <div className='px-6 py-16 text-center flex flex-col items-center gap-3'>
                <div className='rounded-full bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400'>
                  <PackageCheck className='h-8 w-8' />
                </div>
                <p className='font-semibold'>No hay productos que necesiten reposición.</p>
                <p className='max-w-sm text-sm text-muted-foreground'>
                  Los productos con límites configurados están dentro del stock mínimo requerido.
                </p>
              </div>
            ) : (
              <div className='overflow-x-auto [&>div:has(>table)]:border-y-0'>
                <Table className='w-full text-sm'>
                  <TableHeader>
                    <TableRow>
                      {[
                        'Producto / presentación',
                        'Bodega',
                        'Bar',
                        'Stock total',
                        'Mínimo',
                        'Máximo',
                        'Comprar',
                        'Precio unitario de referencia',
                        'Subtotal estimado'
                      ].map(title => (
                        <TableHead
                          key={title}
                          className={`px-4 py-4 ${title === 'Producto / presentación' ? 'text-left min-w-48' : 'text-center'}`}
                        >
                          {title}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow key={row.id} className='border-t'>
                        <TableCell className='px-4 py-4 text-left'>
                          <strong>{row.producto}</strong>
                          <br />
                          {row.presentacion}
                          <small className='hidden print:block text-muted-foreground'>
                            Ref. {row.id}
                          </small>
                        </TableCell>
                        {[
                          row.stock_bodega,
                          row.stock_bar,
                          row.stock_actual,
                          row.stock_minimo,
                          row.stock_maximo,
                          row.cantidad
                        ].map((value, index) => (
                          <TableCell
                            key={index}
                            className={`px-4 py-4 tabular-nums text-center ${index === 5 ? 'font-bold text-blue-700 dark:text-blue-400' : index === 2 ? 'font-semibold text-amber-700 dark:text-amber-400' : ''}`}
                          >
                            {value.toLocaleString('es-CL')}
                          </TableCell>
                        ))}
                        <TableCell className='p-3 tabular-nums whitespace-nowrap'>
                          {formatCurrencyCLP(row.precio_compra)}
                        </TableCell>
                        <TableCell className='p-3 tabular-nums whitespace-nowrap font-semibold'>
                          {formatCurrencyCLP(subtotalReposicion(row))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className='p-5 sm:p-6'>
                  <p className='text-right text-xl font-bold'>
                    Total estimado: {formatCurrencyCLP(totalReposicion(rows))}
                  </p>
                  <p className='mt-1 text-right text-xs text-muted-foreground'>
                    Precios de referencia sugeridos a partir del precio de compra registrado en
                    Bodega. El importe final puede variar según el proveedor.
                  </p>
                </div>
              </div>
            )}
            <p className='px-5 sm:px-6 py-4 text-xs text-muted-foreground'>
              El stock y los precios se verifican antes de imprimir o compartir. Al recibir la
              mercadería, registra el ingreso en Compras.
            </p>
          </section>
        )}
      </main>
    </PermissionGuard>
  );
}
