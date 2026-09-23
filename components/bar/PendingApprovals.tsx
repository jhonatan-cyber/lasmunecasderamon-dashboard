'use client';

import React from 'react';
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
  if (pendientes.length === 0) {
    return (
      <p className='rounded-2xl border border-dashed py-12 text-center text-muted-foreground'>
        {loading ? 'Cargando…' : 'No hay solicitudes pendientes.'}
      </p>
    );
  }

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
      {pendientes.map(record => (
        <Card key={record.id} className='flex h-full min-w-0 flex-col rounded-2xl'>
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
          </CardContent>
          <CardFooter className='flex gap-2'>
            {puedeAprobar ? (
              <>
                <Button
                  className='flex-1 rounded-full'
                  disabled={resolvingId === record.id}
                  onClick={() => onResolve(record.id, 'aprobar')}
                >
                  <Check aria-hidden='true' />
                  Aprobar
                </Button>
                <Button
                  variant='outline'
                  className='flex-1 rounded-full'
                  disabled={resolvingId === record.id}
                  onClick={() => onResolve(record.id, 'rechazar')}
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
  );
}
