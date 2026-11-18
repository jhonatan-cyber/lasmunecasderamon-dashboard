'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Check, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import type { TransferRecord } from '@/types/transfer';
import { TransferSaleDetails } from '@/components/bar/TransferSaleDetails';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface PendingApprovalsProps {
  pendientes: TransferRecord[];
  puedeAprobar: boolean;
  resolvingId: string | null;
  loading: boolean;
  onResolve: (id: string, accion: 'aprobar' | 'rechazar') => void;
}

export function PendingApprovals({
  pendientes,
  puedeAprobar,
  resolvingId,
  loading,
  onResolve
}: PendingApprovalsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pendientes.find(record => record.id === selectedId);
  if (pendientes.length === 0) {
    return (
      <EmptyState
        title={loading ? 'Cargando…' : 'No hay solicitudes pendientes.'}
        className='rounded-2xl border py-12'
      />
    );
  }

  return (
    <>
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {pendientes.map(record => (
          <Card
            key={record.id}
            className='flex h-full min-w-0 cursor-pointer flex-col rounded-2xl transition-shadow hover:shadow-md'
            onClick={() => setSelectedId(record.id)}
          >
            <CardHeader className='gap-2'>
              <Badge variant='secondary' className='w-fit'>
                <Clock className='mr-1 size-3' aria-hidden='true' />
                Pendiente
              </Badge>
              <CardTitle className='break-words'>{record.producto_nombre}</CardTitle>
              <CardDescription className='break-words'>
                {record.presentacion_nombre} · {record.cantidad} un.
              </CardDescription>
            </CardHeader>
            <CardContent className='flex-1 text-sm text-muted-foreground'>
              <p>Solicitada por: {record.usuario_nombre}</p>
              <p>{String(record.fecha_crea).replace('T', ' ').slice(0, 16)}</p>
              <Button
                type='button'
                variant='ghost'
                className='mt-3 rounded-full'
                onClick={event => {
                  event.stopPropagation();
                  setSelectedId(record.id);
                }}
              >
                Ver detalles
              </Button>
            </CardContent>
            <CardFooter className='flex gap-2'>
              {puedeAprobar ? (
                <>
                  <Button
                    className='flex-1 rounded-full'
                    disabled={resolvingId !== null}
                    onClick={event => {
                      event.stopPropagation();
                      onResolve(record.id, 'aprobar');
                    }}
                  >
                    <Check aria-hidden='true' />
                    Aprobar
                  </Button>
                  <Button
                    variant='outline'
                    className='flex-1 rounded-full'
                    disabled={resolvingId !== null}
                    onClick={event => {
                      event.stopPropagation();
                      onResolve(record.id, 'rechazar');
                    }}
                  >
                    <X aria-hidden='true' />
                    Rechazar
                  </Button>
                </>
              ) : (
                <span className='text-sm text-muted-foreground'>
                  No tienes permiso para aprobar.
                </span>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={open => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className='flex max-h-[92dvh] w-[calc(100vw_-_1rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:w-[calc(100vw_-_2rem)] sm:max-w-3xl'>
          <DialogHeader className='shrink-0 gap-1 border-b px-4 py-4 pr-14 text-left sm:px-6'>
            <DialogTitle className='text-base font-bold sm:text-lg'>
              Detalle de transferencia
            </DialogTitle>
            <DialogDescription className='break-words text-sm'>
              {selected?.producto_nombre} · {selected?.presentacion_nombre}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className='min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-muted/20 p-3 sm:space-y-5 sm:p-6'>
                <div className='rounded-xl border bg-card p-3 sm:p-5'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <Badge variant='secondary' className='w-fit rounded-full'>
                      <Clock className='mr-1 size-3' aria-hidden='true' />
                      Pendiente
                    </Badge>
                    <p className='min-w-0 break-words text-sm font-semibold'>
                      {selected.cantidad} unidades · Bodega → Bar
                    </p>
                  </div>
                  <dl className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                    <div className='min-w-0'>
                      <dt className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                        Enviado por
                      </dt>
                      <dd className='mt-0.5 break-words text-sm font-medium'>
                        {selected.usuario_nombre}
                      </dd>
                    </div>
                    <div className='min-w-0'>
                      <dt className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                        Fecha
                      </dt>
                      <dd className='mt-0.5 break-words text-sm font-medium'>
                        {String(selected.fecha_crea).replace('T', ' ').slice(0, 16)}
                      </dd>
                    </div>
                    {selected.categoria_nombre && (
                      <div className='min-w-0'>
                        <dt className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                          Categoría
                        </dt>
                        <dd className='mt-0.5 break-words text-sm font-medium'>
                          {selected.categoria_nombre}
                        </dd>
                      </div>
                    )}
                    {Number(selected.ml_botella) > 0 && (
                      <div className='min-w-0'>
                        <dt className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                          Contenido
                        </dt>
                        <dd className='mt-0.5 break-words text-sm font-medium'>
                          {selected.ml_botella} ml
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
                <TransferSaleDetails record={selected} />
              </div>
              <div className='shrink-0 space-y-3 border-t bg-background px-4 py-3 sm:px-6 sm:py-4'>
                <div className='flex flex-wrap items-end justify-between gap-x-4 gap-y-1'>
                  <div className='min-w-0 text-xs text-muted-foreground'>
                    <p className='text-sm font-semibold text-foreground'>
                      {selected.cantidad} {selected.cantidad === 1 ? 'unidad' : 'unidades'} · Bodega
                      → Bar
                    </p>
                    {Number(selected.precio_venta) > 0 && (
                      <p>{formatCurrencyCLP(selected.precio_venta)} c/u</p>
                    )}
                  </div>
                  {Number(selected.precio_venta) > 0 && (
                    <p className='shrink-0 text-xl font-bold tabular-nums' aria-live='polite'>
                      {formatCurrencyCLP(Number(selected.precio_venta) * selected.cantidad)}
                    </p>
                  )}
                </div>
                <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end'>
                  {puedeAprobar && (
                    <>
                      <Button
                        type='button'
                        className='w-full rounded-full sm:w-auto'
                        disabled={resolvingId !== null}
                        onClick={() => onResolve(selected.id, 'aprobar')}
                      >
                        <Check aria-hidden='true' />
                        Aprobar
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        className='w-full rounded-full sm:w-auto'
                        disabled={resolvingId !== null}
                        onClick={() => onResolve(selected.id, 'rechazar')}
                      >
                        <X aria-hidden='true' />
                        Rechazar
                      </Button>
                    </>
                  )}
                  <Button
                    type='button'
                    variant='outline'
                    className='w-full rounded-full px-8 py-2 transition-all duration-200 hover:scale-105 sm:w-auto dark:hover:bg-white dark:hover:text-black'
                    onClick={() => setSelectedId(null)}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
