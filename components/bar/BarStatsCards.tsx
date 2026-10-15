'use client';
import { Button } from '@/components/ui/button';

import { useState } from 'react';
import { SaleProductPhoto } from '@/components/sales/product-modal/SaleProductPhoto';
import { AlertTriangle, GlassWater, Wine } from 'lucide-react';
import { MetricCard } from '@/components/shared/MetricCard';
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
      icon: GlassWater
    },
    {
      title: 'Disponible en botellas abiertas',
      label: 'Disponible',
      value: resumen ? `${resumen.mlRestantesTotales} ml` : '—',
      detail: resumen
        ? `${resumen.botellasAbiertas} ${resumen.botellasAbiertas === 1 ? 'botella abierta' : 'botellas abiertas'} en bar · clic para ver detalle`
        : 'Cargando resumen del bar…',
      icon: Wine
    },
    {
      title: 'Botellas por agotarse',
      label: 'Stock bajo',
      value: resumen ? resumen.botellasPorAgotarse : '—',
      detail: resumen
        ? `Con ${resumen.shotsAlerta} cortos o menos restantes`
        : 'Cargando resumen del bar…',
      icon: AlertTriangle
    }
  ];

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:[&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1'>
      {stats.map((stat, index) => (
        <MetricCard
          key={stat.title}
          label={stat.title}
          badge={stat.label}
          value={stat.value}
          icon={<stat.icon className='size-4' aria-hidden='true' />}
          tone={index === 0 ? 'emerald' : index === 1 ? 'purple' : 'amber'}
          className='relative min-w-0'
          footer={
            <>
              <p>{stat.detail}</p>
              {stat.title === 'Disponible en botellas abiertas' && (
                <Button
                  variant='unstyled'
                  type='button'
                  className='absolute inset-0 rounded-3xl bg-transparent! focus-visible:outline-2 focus-visible:outline-primary'
                  onClick={() => setDetalleAbierto(true)}
                  aria-label='Ver las botellas abiertas y sus mililitros disponibles'
                />
              )}
            </>
          }
        />
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
