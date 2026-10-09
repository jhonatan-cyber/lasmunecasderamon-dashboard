'use client';

import { useState } from 'react';
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
  id: string;
  codigo: string;
  ml_restante: number;
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
      title: 'Shots servidos hoy',
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
        ? `Con ${resumen.shotsAlerta} shots o menos restantes`
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
              className='absolute inset-0 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
              onClick={() => setDetalleAbierto(true)}
              aria-label='Ver las botellas abiertas y sus mililitros disponibles'
            />
          )}
        </Card>
      ))}
      <Dialog open={detalleAbierto} onOpenChange={setDetalleAbierto}>
        <DialogContent className='max-h-[85vh] overflow-hidden rounded-2xl sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>Mililitros disponibles por botella</DialogTitle>
            <DialogDescription>
              Contenido calculado individualmente para cada botella abierta en el bar.
            </DialogDescription>
          </DialogHeader>
          <div className='max-h-[60vh] space-y-2 overflow-y-auto pr-1'>
            {botellasAbiertas.length === 0 ? (
              <p className='py-8 text-center text-sm text-muted-foreground'>
                No hay botellas abiertas con contenido.
              </p>
            ) : (
              botellasAbiertas.map(botella => (
                <div
                  key={botella.id}
                  className='flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3'
                >
                  <div className='min-w-0'>
                    <p className='truncate font-semibold'>{botella.producto_nombre}</p>
                    <p className='truncate text-xs text-muted-foreground'>
                      {botella.presentacion_nombre} · Código {botella.codigo}
                    </p>
                  </div>
                  <span className='shrink-0 rounded-full bg-purple-500/10 px-3 py-1 text-sm font-bold text-purple-700 dark:text-purple-300'>
                    {botella.ml_restante} ml
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
