'use client';

import { useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { formatCurrencyCLP, formatFechaConHora } from '@/lib/utils/formatters';
import type { ReservaQuincho } from '@/types/quincho';

interface QuinchosTableProps {
  reservas: ReservaQuincho[];
  isLoading: boolean;
  isCancelling: boolean;
  canCancel: boolean;
  onCancel: (reserva: ReservaQuincho) => Promise<boolean>;
}

/** `2026-11-20` → `20-11-2026`, sin pasar por zonas horarias. */
function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return dia && mes && anio ? `${dia}-${mes}-${anio}` : fecha;
}

export function QuinchosTable({
  reservas,
  isLoading,
  isCancelling,
  canCancel,
  onCancel
}: QuinchosTableProps) {
  const [reservaAAnular, setReservaAAnular] = useState<ReservaQuincho | null>(null);

  const confirmarAnulacion = async () => {
    if (!reservaAAnular) return;
    const anulada = await onCancel(reservaAAnular);
    if (anulada) setReservaAAnular(null);
  };

  return (
    <>
      <div className='overflow-x-auto rounded-3xl border-none bg-white shadow-md dark:bg-slate-900/40'>
        <Table className='min-w-full text-center'>
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='text-center'>Fecha reserva</TableHead>
              <TableHead className='text-center'>Cliente</TableHead>
              <TableHead className='text-center'>Personas</TableHead>
              <TableHead className='text-center'>Monto por persona</TableHead>
              <TableHead className='text-center'>Total</TableHead>
              <TableHead className='text-center'>Método de pago</TableHead>
              <TableHead className='text-center'>Registrada</TableHead>
              <TableHead className='text-center'>Estado</TableHead>
              <TableHead className='text-center'>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className='py-8 text-center text-gray-500'>
                  {isLoading ? 'Cargando reservas...' : 'Todavía no hay reservas de quincho'}
                </TableCell>
              </TableRow>
            )}
            {reservas.map(reserva => (
              <TableRow key={reserva.id} className='border-b'>
                <TableCell className='font-mono sm:px-4'>
                  {fechaCorta(reserva.fecha_reserva)}
                </TableCell>
                <TableCell className='sm:px-4'>
                  <div className='flex flex-col'>
                    <span className='font-medium text-gray-900 dark:text-neutral-100'>
                      {reserva.cliente_nombre} {reserva.cliente_apellido}
                    </span>
                    {reserva.cliente_run && (
                      <span className='text-xs text-gray-500'>{reserva.cliente_run}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className='sm:px-4 font-mono'>
                  {reserva.cantidad_personas.toLocaleString('es-CL')}
                </TableCell>
                <TableCell className='sm:px-4 font-mono'>
                  {formatCurrencyCLP(reserva.monto_por_persona)}
                </TableCell>
                <TableCell className='sm:px-4 font-mono font-bold text-emerald-700 dark:text-emerald-300'>
                  {formatCurrencyCLP(reserva.total)}
                </TableCell>
                <TableCell className='sm:px-4 capitalize'>{reserva.metodo_pago}</TableCell>
                <TableCell className='sm:px-4 text-xs text-gray-500'>
                  {formatFechaConHora(reserva.fecha_crea)}
                </TableCell>
                <TableCell className='sm:px-4'>
                  {reserva.estado === 'activa' ? (
                    <Badge className='rounded-full bg-green-100 px-3 py-1 text-green-700 dark:bg-green-900/40 dark:text-green-300'>
                      Activa
                    </Badge>
                  ) : (
                    <Badge className='rounded-full bg-red-100 px-3 py-1 text-red-700 dark:bg-red-900/40 dark:text-red-300'>
                      Anulada
                    </Badge>
                  )}
                </TableCell>
                <TableCell className='sm:px-4'>
                  {canCancel && reserva.estado === 'activa' ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40'
                      onClick={() => setReservaAAnular(reserva)}
                      aria-label={`Anular reserva de ${reserva.cliente_nombre} ${reserva.cliente_apellido}`}
                    >
                      <Ban className='mr-1 h-4 w-4' />
                      Anular
                    </Button>
                  ) : (
                    <span className='text-xs text-gray-400'>—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={reservaAAnular !== null}
        onOpenChange={open => !open && setReservaAAnular(null)}
      >
        <DialogContent className='max-w-md rounded-2xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Ban className='h-5 w-5 text-red-500' />
              Anular reserva
            </DialogTitle>
            <DialogDescription asChild>
              <div className='space-y-2 text-sm text-gray-600 dark:text-gray-300'>
                <p>
                  ¿Anular la reserva de{' '}
                  <strong>
                    {reservaAAnular?.cliente_nombre} {reservaAAnular?.cliente_apellido}
                  </strong>{' '}
                  del{' '}
                  <strong>{reservaAAnular ? fechaCorta(reservaAAnular.fecha_reserva) : ''}</strong>?
                </p>
                <p>
                  Se devolverán{' '}
                  <strong>
                    {reservaAAnular
                      ? formatCurrencyCLP(reservaAAnular.total)
                      : formatCurrencyCLP(0)}
                  </strong>{' '}
                  descontándolos del saldo prepago del cliente. Si ya consumió ese saldo, la
                  anulación no se puede completar.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className='flex justify-center gap-3 pt-2'>
            <Button
              variant='outline'
              className='rounded-full px-6'
              onClick={() => setReservaAAnular(null)}
              disabled={isCancelling}
            >
              Cancelar
            </Button>
            <Button
              className='rounded-full bg-red-600 px-6 text-white hover:bg-red-700'
              onClick={confirmarAnulacion}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <span className='flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Anulando...
                </span>
              ) : (
                'Anular y devolver'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
