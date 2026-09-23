'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ClipboardCheck, Package, Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import type { BarStockItem } from './TransferModal';
import type { TransferRecord } from '@/types/transfer';

export default function BarmanDashboard({ name }: { name: string }) {
  const [stock, setStock] = useState<BarStockItem[]>([]);
  const [pending, setPending] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const read = async (url: string) => {
          const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
          const result = await response.json();
          if (!response.ok || !result.success || !Array.isArray(result.data)) {
            throw new Error(result.message || 'No se pudo cargar el resumen de barra.');
          }
          return result.data;
        };
        const [items, transfers] = await Promise.all([
          read('/api/bar'),
          read('/api/transfers/pending')
        ]);
        if (!controller.signal.aborted) {
          setStock(items);
          setPending(transfers);
        }
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'Error de conexión');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const available = stock.filter(item => (item.stock_bar ?? 0) > 0);
  const lowest = [...available].sort((a, b) => (a.stock_bar ?? 0) - (b.stock_bar ?? 0)).slice(0, 6);
  const receipts = [...pending]
    .sort((a, b) => a.fecha_crea.localeCompare(b.fecha_crea))
    .slice(0, 5);
  const metrics = [
    { label: 'Recepciones pendientes', value: pending.length, icon: ClipboardCheck },
    {
      label: 'Unidades por recibir',
      value: pending.reduce((sum, record) => sum + record.cantidad, 0),
      icon: Package
    },
    {
      label: 'Unidades en barra',
      value: available.reduce((sum, item) => sum + (item.stock_bar ?? 0), 0),
      icon: Wine
    },
    { label: 'Presentaciones disponibles', value: available.length, icon: CheckCircle2 }
  ];

  return (
    <main className='mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-10'>
      <header className='flex flex-wrap items-end justify-between gap-4 border-b pb-6'>
        <div className='flex flex-col gap-2'>
          <Badge variant='secondary' className='w-fit rounded-full'>
            Barman
          </Badge>
          <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>Tu barra, al día</h1>
          <p className='text-sm text-muted-foreground'>
            Hola, {name}. Revisa las recepciones y prepara la atención.
          </p>
        </div>
        <Button asChild className='rounded-full'>
          <Link href='/bar'>
            <Wine aria-hidden='true' />
            Ir al bar
          </Link>
        </Button>
      </header>

      <nav aria-label='Accesos de barra' className='flex flex-wrap gap-2'>
        <PermissionGuard module='sales' action='view' fallback={null}>
          <Button asChild variant='outline' className='rounded-full'>
            <Link href='/sales'>
              Ventas <ArrowRight aria-hidden='true' />
            </Link>
          </Button>
        </PermissionGuard>
        <PermissionGuard module='private_rooms' action='view' fallback={null}>
          <Button asChild variant='outline' className='rounded-full'>
            <Link href='/private-rooms'>
              Servicios / Privados <ArrowRight aria-hidden='true' />
            </Link>
          </Button>
        </PermissionGuard>
      </nav>

      {error ? (
        <Alert variant='destructive'>
          <AlertTitle>No se pudo cargar el dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            variant='outline'
            className='mt-3 rounded-full'
            onClick={() => setRevision(value => value + 1)}
          >
            Reintentar
          </Button>
        </Alert>
      ) : loading ? (
        <div
          role='status'
          aria-label='Cargando resumen de barra'
          className='grid grid-cols-2 gap-3 lg:grid-cols-4'
        >
          {metrics.map(metric => (
            <Skeleton key={metric.label} className='h-28 rounded-2xl' />
          ))}
        </div>
      ) : (
        <>
          <section aria-label='Resumen de barra' className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
            {metrics.map(({ label, value, icon: Icon }) => (
              <Card key={label} className='rounded-2xl'>
                <CardHeader className='gap-2 p-4 pb-2'>
                  <Icon className='size-5 text-muted-foreground' aria-hidden='true' />
                  <CardDescription>{label}</CardDescription>
                </CardHeader>
                <CardContent className='px-4 pb-4'>
                  <p className='text-3xl font-semibold tabular-nums'>{value}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <div className='grid items-start gap-6 lg:grid-cols-5'>
            <Card className='rounded-2xl lg:col-span-3'>
              <CardHeader>
                <CardTitle>Por recibir</CardTitle>
                <CardDescription>
                  Confirma en Bar lo que recibiste del almacén. Primero, las solicitudes más
                  antiguas.
                </CardDescription>
              </CardHeader>
              <CardContent className='flex flex-col gap-4'>
                {receipts.length === 0 ? (
                  <p className='rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground'>
                    Todo al día. No hay transferencias pendientes.
                  </p>
                ) : (
                  <ul className='divide-y'>
                    {receipts.map(record => (
                      <li
                        key={record.id}
                        className='flex items-start justify-between gap-3 py-3 first:pt-0'
                      >
                        <div className='flex min-w-0 flex-col gap-1'>
                          <p className='font-medium'>{record.producto_nombre}</p>
                          <p className='text-sm text-muted-foreground'>
                            {record.presentacion_nombre} · Enviado por {record.usuario_nombre}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {record.fecha_crea.replace('T', ' ').slice(0, 16)}
                          </p>
                        </div>
                        <Badge variant='secondary' className='shrink-0 rounded-full'>
                          {record.cantidad} un.
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {pending.length > 0 && (
                  <Button asChild className='w-full rounded-full'>
                    <Link href='/bar?tab=pendientes'>
                      Revisar recepciones ({pending.length}) <ArrowRight aria-hidden='true' />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className='rounded-2xl lg:col-span-2'>
              <CardHeader>
                <CardTitle>Existencias en barra</CardTitle>
                <CardDescription>
                  Hasta seis presentaciones disponibles, ordenadas de menor a mayor stock.
                </CardDescription>
              </CardHeader>
              <CardContent className='flex flex-col gap-4'>
                {lowest.length === 0 ? (
                  <p className='py-6 text-sm text-muted-foreground'>
                    No hay existencias disponibles. Las unidades recibidas aparecerán al aceptar una
                    transferencia.
                  </p>
                ) : (
                  <ul className='divide-y'>
                    {lowest.map(item => (
                      <li
                        key={item.id}
                        className='flex items-center justify-between gap-3 py-3 first:pt-0'
                      >
                        <div className='min-w-0'>
                          <p className='text-sm font-medium'>{item.producto_nombre}</p>
                          <p className='text-xs text-muted-foreground'>{item.nombre}</p>
                        </div>
                        <span className='shrink-0 text-lg font-semibold tabular-nums'>
                          {item.stock_bar}{' '}
                          <span className='text-xs font-normal text-muted-foreground'>un.</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button asChild variant='outline' className='w-full rounded-full'>
                  <Link href='/bar'>Ver todas las existencias</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
