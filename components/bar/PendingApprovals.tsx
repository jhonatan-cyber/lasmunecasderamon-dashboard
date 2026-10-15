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
      <p className='rounded-2xl border border-dashed py-12 text-center text-muted-foreground'>
        {loading ? 'Cargando…' : 'No hay solicitudes pendientes.'}
      </p>
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
                <span className='text-sm text-muted-foreground'>Solo el Barman puede aprobar.</span>
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
        <DialogContent className='flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl'>
          <DialogHeader className='shrink-0 border-b px-5 py-5 pr-12 sm:px-6'>
            <DialogTitle>Detalle de transferencia</DialogTitle>
            <DialogDescription>
              {selected?.producto_nombre} · {selected?.presentacion_nombre}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className='min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6'>
                <div className='grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-4 text-sm'>
                  <p className='col-span-2 font-semibold'>
                    {selected.cantidad} unidades · Bodega → Bar
                  </p>
                  <p>Enviado por: {selected.usuario_nombre}</p>
                  <p>Fecha: {String(selected.fecha_crea).replace('T', ' ').slice(0, 16)}</p>
                  {selected.categoria_nombre && <p>Categoría: {selected.categoria_nombre}</p>}
                  {Number(selected.ml_botella) > 0 && <p>Contenido: {selected.ml_botella} ml</p>}
                </div>
                <TransferSaleDetails record={selected} />
              </div>
              <div className='flex shrink-0 flex-wrap justify-end gap-2 border-t bg-background px-5 py-4 sm:px-6'>
                <Button
                  type='button'
                  variant='outline'
                  className='rounded-full'
                  onClick={() => setSelectedId(null)}
                >
                  Cerrar
                </Button>
                {puedeAprobar && (
                  <>
                    <Button
                      className='rounded-full'
                      disabled={resolvingId !== null}
                      onClick={() => onResolve(selected.id, 'aprobar')}
                    >
                      <Check aria-hidden='true' />
                      Aprobar
                    </Button>
                    <Button
                      variant='outline'
                      className='rounded-full'
                      disabled={resolvingId !== null}
                      onClick={() => onResolve(selected.id, 'rechazar')}
                    >
                      <X aria-hidden='true' />
                      Rechazar
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
