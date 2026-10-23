'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Flame, Loader2, UserPlus, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CustomerSelect, PaymentMethodSelect } from '@/components/shared/selects';
import { calcularTotalReserva, MAX_TOTAL_RESERVA } from '@/lib/business/quinchos';
import { esFechaISO, hoyDelNegocio } from '@/lib/business/vencimiento';
import { formatCurrencyCLP, formatNumberInput, parseNumberInput } from '@/lib/utils/formatters';
import type { Client } from '@/types/client';
import type { MetodoPagoReservaQuincho, ReservaQuinchoDraft } from '@/types/quincho';

interface ReservaQuinchoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientes: Client[];
  cajaCerrada: boolean;
  isSaving: boolean;
  onSubmit: (draft: ReservaQuinchoDraft) => Promise<boolean>;
}

type ModoCliente = 'existente' | 'nuevo';

export function ReservaQuinchoModal({
  open,
  onOpenChange,
  clientes,
  cajaCerrada,
  isSaving,
  onSubmit
}: ReservaQuinchoModalProps) {
  const [modoCliente, setModoCliente] = useState<ModoCliente>('existente');
  const [clienteId, setClienteId] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [run, setRun] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaReserva, setFechaReserva] = useState(hoyDelNegocio());
  const [personas, setPersonas] = useState('');
  const [montoPorPersona, setMontoPorPersona] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoReservaQuincho>('efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setModoCliente('existente');
    setClienteId('');
    setNombre('');
    setApellido('');
    setRun('');
    setTelefono('');
    setFechaReserva(hoyDelNegocio());
    setPersonas('');
    setMontoPorPersona('');
    setMetodoPago('efectivo');
    setObservaciones('');
    setError('');
  }, [open]);

  const clienteSeleccionado = useMemo(
    () => clientes.find(cliente => String(cliente.id) === clienteId) ?? null,
    [clientes, clienteId]
  );

  const total = useMemo(
    () => calcularTotalReserva(personas, parseNumberInput(montoPorPersona)),
    [personas, montoPorPersona]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (cajaCerrada) {
      setError('Abre la caja para cobrar la reserva');
      return;
    }
    if (modoCliente === 'existente' && !clienteId) {
      setError('Selecciona un cliente o crea uno nuevo');
      return;
    }
    if (modoCliente === 'nuevo' && (!nombre.trim() || !apellido.trim())) {
      setError('Nombre y apellido del cliente son obligatorios');
      return;
    }
    if (!esFechaISO(fechaReserva)) {
      setError('Selecciona la fecha de la reserva');
      return;
    }

    const cantidadPersonas = Number(personas);
    const montoPersona = parseNumberInput(montoPorPersona);
    if (!Number.isInteger(cantidadPersonas) || cantidadPersonas < 1) {
      setError('La cantidad de personas debe ser al menos 1');
      return;
    }
    if (!Number.isInteger(montoPersona) || montoPersona < 1) {
      setError('El monto por persona debe ser mayor a 0');
      return;
    }
    if (total <= 0 || total > MAX_TOTAL_RESERVA) {
      setError('El total de la reserva no es válido');
      return;
    }

    const guardada = await onSubmit({
      cliente_id: modoCliente === 'existente' ? clienteId : null,
      cliente_nuevo:
        modoCliente === 'nuevo'
          ? { name: nombre.trim(), lastName: apellido.trim(), run, phone: telefono }
          : null,
      fecha_reserva: fechaReserva,
      cantidad_personas: cantidadPersonas,
      monto_por_persona: montoPersona,
      metodo_pago: metodoPago,
      observaciones
    });

    if (guardada) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='p-6 pb-3 border-b dark:border-slate-800'>
          <DialogTitle className='flex items-center gap-2 text-xl font-bold'>
            <Flame className='h-5 w-5 text-orange-500' />
            Nueva reserva de quincho
          </DialogTitle>
          <DialogDescription>
            El total se acredita al saldo prepago del cliente con el método de pago elegido.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto p-6'>
          {cajaCerrada && (
            <div className='mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'>
              La caja está cerrada. Ábrela para cobrar la reserva y acreditar el saldo prepago.
            </div>
          )}

          <form id='reserva-quincho-form' onSubmit={handleSubmit} className='space-y-5'>
            <section className='space-y-3'>
              <div className='flex items-center justify-between gap-3'>
                <Label className='text-sm font-semibold'>Cliente</Label>
                <div className='flex rounded-full border border-gray-200 p-1 dark:border-slate-700'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className={`rounded-full px-3 text-xs ${modoCliente === 'existente' ? 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black' : ''}`}
                    onClick={() => setModoCliente('existente')}
                    disabled={isSaving}
                  >
                    <Users className='mr-1 h-3.5 w-3.5' />
                    Existente
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className={`rounded-full px-3 text-xs ${modoCliente === 'nuevo' ? 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black' : ''}`}
                    onClick={() => setModoCliente('nuevo')}
                    disabled={isSaving}
                  >
                    <UserPlus className='mr-1 h-3.5 w-3.5' />
                    Nuevo
                  </Button>
                </div>
              </div>

              {modoCliente === 'existente' ? (
                <>
                  <CustomerSelect
                    clientes={clientes}
                    value={clienteId}
                    onChange={setClienteId}
                    label='Cliente'
                    placeholder='Seleccione un cliente'
                    required
                    disabled={isSaving}
                  />
                  <div className='flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-300'>
                    <Wallet className='h-4 w-4 shrink-0' />
                    <span>
                      Saldo prepago actual:{' '}
                      <strong>{formatCurrencyCLP(clienteSeleccionado?.saldo ?? 0)}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='reserva-cliente-nombre'>Nombre</Label>
                    <Input
                      id='reserva-cliente-nombre'
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      disabled={isSaving}
                      placeholder='Ej: Ana'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='reserva-cliente-apellido'>Apellido</Label>
                    <Input
                      id='reserva-cliente-apellido'
                      value={apellido}
                      onChange={e => setApellido(e.target.value)}
                      disabled={isSaving}
                      placeholder='Ej: Pérez'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='reserva-cliente-run'>RUN (opcional)</Label>
                    <Input
                      id='reserva-cliente-run'
                      value={run}
                      onChange={e => setRun(e.target.value)}
                      disabled={isSaving}
                      placeholder='12.345.678-9'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='reserva-cliente-telefono'>Teléfono (opcional)</Label>
                    <Input
                      id='reserva-cliente-telefono'
                      value={telefono}
                      onChange={e => setTelefono(e.target.value)}
                      disabled={isSaving}
                      placeholder='+56 9 1234 5678'
                    />
                  </div>
                </div>
              )}
            </section>

            <section className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='reserva-fecha'>Fecha de reserva</Label>
                <Input
                  id='reserva-fecha'
                  type='date'
                  value={fechaReserva}
                  onChange={e => setFechaReserva(e.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='reserva-personas'>Cantidad de personas</Label>
                <Input
                  id='reserva-personas'
                  inputMode='numeric'
                  value={personas}
                  onChange={e => setPersonas(e.target.value.replace(/\D/g, ''))}
                  disabled={isSaving}
                  placeholder='Ej: 10'
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='reserva-monto'>Monto por persona</Label>
                <Input
                  id='reserva-monto'
                  inputMode='numeric'
                  value={montoPorPersona}
                  onChange={e => {
                    const monto = parseNumberInput(e.target.value);
                    setMontoPorPersona(monto > 0 ? formatNumberInput(monto) : '');
                  }}
                  disabled={isSaving}
                  placeholder='Ej: 5.000'
                  required
                />
              </div>
            </section>

            <div className='flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/40 dark:bg-orange-950/30'>
              <div className='flex items-center gap-2 text-sm font-medium text-orange-800 dark:text-orange-200'>
                <CalendarDays className='h-4 w-4' />
                Total de la reserva
              </div>
              <p className='text-xl font-bold text-orange-900 dark:text-orange-100'>
                {formatCurrencyCLP(total)}
              </p>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <PaymentMethodSelect
                value={metodoPago}
                onChange={value => setMetodoPago(value as MetodoPagoReservaQuincho)}
                label='Método de pago'
                placeholder='Seleccionar método de pago'
                disabled={isSaving}
                showPrepago={false}
                showMixto={false}
              />
              <div className='space-y-1.5'>
                <Label htmlFor='reserva-observaciones'>Observaciones (opcional)</Label>
                <Textarea
                  id='reserva-observaciones'
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  disabled={isSaving}
                  rows={3}
                  maxLength={500}
                  placeholder='Ej: cumpleaños, requiere mesas extra'
                />
              </div>
            </div>

            {error && (
              <p role='alert' className='text-sm font-medium text-red-600'>
                {error}
              </p>
            )}
          </form>
        </div>

        <div className='flex justify-center gap-3 border-t bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/50'>
          <Button
            type='button'
            variant='outline'
            className='rounded-full px-6'
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            form='reserva-quincho-form'
            className='rounded-full bg-black px-8 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200'
            disabled={isSaving || cajaCerrada || total <= 0}
          >
            {isSaving ? (
              <span className='flex items-center gap-2'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Guardando...
              </span>
            ) : (
              'Registrar reserva'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
