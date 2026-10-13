'use client';

import { useState } from 'react';
import { SaleProductPhoto } from '@/components/sales/product-modal/SaleProductPhoto';
import { AlertTriangle, GlassWater, Wine } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import type { ShotsSummary } from '@/modules/inventario/contracts';

interface BarOpenBottleDetail {
  foto?: string | null;
  venta_corto_habilitada?: boolean;
  id: string;
  cantidad: number;
  ml_disponibles: number;
  ml_cliente: number;
  ml_anfitriona: number;
  shots_anfitriona_disponibles: number;
  shots_disponibles: number;
  producto_nombre: string;
  presentacion_nombre: string;
}

export function BarStatsCards({
  resumen,
  botellasAbiertas = []
}: {
  resumen: ShotsSummary | null;
  botellasAbiertas?: BarOpenBottleDetail[];
}) {
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const stats = [
    {
      title: 'Cortos servidos hoy',
      label: 'Hoy',
      value: resumen ? resumen.shotsServidosHoy : '—',
      detail: resumen ? `${resumen.mlServidosHoy} ml servidos` : 'Cargando resumen del bar…',
      icon: GlassWater,
      color: '16, 185, 129',
      iconClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      labelClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      titleClass: 'text-emerald-700/60 dark:text-emerald-300/80',
      valueClass: 'text-emerald-900 dark:text-emerald-100',
      detailClass: 'text-emerald-700 dark:text-emerald-300'
    },
    {
      title: 'Disponible en botellas abiertas',
      label: 'Disponible',
      value: resumen ? `${resumen.mlRestantesTotales} ml` : '—',
      detail: resumen
        ? `${resumen.botellasAbiertas} ${resumen.botellasAbiertas === 1 ? 'botella abierta' : 'botellas abiertas'} en bar · clic para ver detalle`
        : 'Cargando resumen del bar…',
      icon: Wine,
      color: '139, 92, 246',
      iconClass: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
      labelClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
      titleClass: 'text-purple-700/60 dark:text-purple-300/80',
      valueClass: 'text-purple-900 dark:text-purple-100',
      detailClass: 'text-purple-700 dark:text-purple-300'
    },
    {
      title: 'Botellas por agotarse',
      label: 'Stock bajo',
      value: resumen ? resumen.botellasPorAgotarse : '—',
      detail: resumen
        ? `Con ${resumen.shotsAlerta} cortos o menos restantes`
        : 'Cargando resumen del bar…',
      icon: AlertTriangle,
      color: '245, 158, 11',
      iconClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
      labelClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
      titleClass: 'text-amber-700/60 dark:text-amber-300/80',
      valueClass: 'text-amber-900 dark:text-amber-100',
      detailClass: 'text-amber-700 dark:text-amber-300'
    }
  ];

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:[&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1'>
      {stats.map(stat => (
        <Card
          key={stat.title}
          style={{
            backgroundColor: `rgba(${stat.color}, 0.1)`,
            border: `1px solid rgba(${stat.color}, 0.2)`
          }}
          className={`relative min-w-0 overflow-hidden rounded-3xl shadow-xs backdrop-blur-xs transition-transform duration-300 motion-safe:hover:scale-[1.02] motion-reduce:transition-none ${stat.title === 'Disponible en botellas abiertas' ? 'cursor-pointer focus-within:ring-2 focus-within:ring-primary' : ''}`}
        >
          <CardContent className='p-5'>
            <div className='mb-4 flex items-center justify-between gap-2'>
              <div className={`rounded-2xl p-2.5 ${stat.iconClass}`}>
                <stat.icon className='size-4' aria-hidden='true' />
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] ${stat.labelClass}`}
              >
                {stat.label}
              </span>
            </div>
            <div className='flex flex-col gap-0.5'>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${stat.titleClass}`}>
                {stat.title}
              </p>
              <p className={`text-xl font-black tabular-nums break-words ${stat.valueClass}`}>
                {stat.value}
              </p>
              <p className={`pt-1 text-[10px] font-medium ${stat.detailClass}`}>{stat.detail}</p>
            </div>
          </CardContent>
          {stat.title === 'Disponible en botellas abiertas' && (
            <button
              type='button'
              style={{ backgroundColor: 'transparent' }}
              className='absolute inset-0 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
              onClick={() => setDetalleAbierto(true)}
              aria-label='Ver las botellas abiertas y sus mililitros disponibles'
            />
          )}
        </Card>
      ))}
      <Dialog open={detalleAbierto} onOpenChange={setDetalleAbierto}>
        <DialogContent className='flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl'>
          <DialogHeader className='shrink-0 border-b px-5 py-5 sm:px-6'>
            <DialogTitle>Mililitros disponibles por botella</DialogTitle>
            <DialogDescription>
              Contenido disponible por producto y presentación. Los cortos se calculan según su
              configuración.
            </DialogDescription>
          </DialogHeader>
          <div className='min-h-0 flex-1 divide-y divide-border overflow-y-auto px-5 sm:px-6'>
            {botellasAbiertas.length === 0 ? (
              <p className='py-8 text-center text-sm text-muted-foreground'>
                No hay botellas abiertas con contenido.
              </p>
            ) : (
              botellasAbiertas.map(botella => (
                <div
                  key={botella.id}
                  className='-mx-5 flex items-center gap-3 px-5 py-3 transition-colors duration-200 hover:bg-muted/50 sm:-mx-6 sm:px-6'
                >
                  <SaleProductPhoto
                    foto={botella.foto ?? undefined}
                    name={botella.producto_nombre}
                    large={false}
                    compact
                  />
                  <div className='grid min-w-0 flex-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4'>
                    <div className='min-w-0'>
                      <p className='text-sm font-semibold leading-snug'>
                        {botella.producto_nombre}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {botella.presentacion_nombre} · {botella.cantidad}{' '}
                        {botella.cantidad === 1 ? 'botella abierta' : 'botellas abiertas'}
                      </p>
                    </div>
                    <dl
                      className={`grid gap-x-4 ${botella.venta_corto_habilitada ? 'grid-cols-3' : 'grid-cols-1'}`}
                    >
                      <div>
                        <dt className='text-[11px] text-muted-foreground'>Disponible</dt>
                        <dd className='text-base font-semibold tabular-nums text-purple-700 dark:text-purple-300'>
                          {botella.ml_disponibles} ml
                        </dd>
                      </div>
                      {botella.venta_corto_habilitada && (
                        <>
                          <div>
                            <dt className='text-[11px] text-muted-foreground'>
                              Cliente · {botella.ml_cliente} ml
                            </dt>
                            <dd className='text-base font-semibold tabular-nums'>
                              {botella.shots_disponibles} cortos
                            </dd>
                          </div>
                          <div>
                            <dt className='text-[11px] text-muted-foreground'>
                              Anfitriona · {botella.ml_anfitriona} ml
                            </dt>
                            <dd className='text-base font-semibold tabular-nums'>
                              {botella.shots_anfitriona_disponibles} cortos
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
