'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { CajaWithUser, CajaCierre } from '@/types/caja';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { useUsers } from '@/hooks/personal';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import type { CierreCajaResultado } from '@/hooks/caja/useCashRegister';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { ClientesSaldoList } from '@/components/caja/ClientesSaldoList';
import { calcularDevolucionSaldoClientes, montoCierreCaja } from '@/lib/business/cajaEfectivo';
import { Loader2, Users, Clock } from 'lucide-react';

const getDiaSemana = (fecha: string): string => {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const fechaObj = new Date(fecha);
  return dias[fechaObj.getDay()];
};

interface CerrarCajaDialogProps {
  caja: CajaWithUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * El cajero no cierra la caja: pide el cierre. El endpoint decide si se cierra
   * en el acto (administrador) o si queda pendiente de autorización por WhatsApp.
   */
  onCerrarCaja: (data: CajaCierre) => Promise<CierreCajaResultado | null>;
  loading?: boolean;
}

export const CerrarCajaDialog = ({
  caja,
  open,
  onOpenChange,
  onCerrarCaja,
  loading = false
}: CerrarCajaDialogProps) => {
  const [formData, setFormData] = useState<CajaCierre>({
    id_caja: 0,
    usuario_id_cierre: 0,
    fecha_cierre: getNowInBusinessTimezone(),
    monto_cierre: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientesSaldo, setClientesSaldo] = useState<any[]>([]);
  const [loadingClientesSaldo, setLoadingClientesSaldo] = useState(false);
  const [pendiente, setPendiente] = useState<CierreCajaResultado | null>(null);

  const { users, isLoading: usersLoading } = useUsers();
  const { user: currentUser, loading: currentUserLoading } = useCurrentUser();

  useEffect(() => {
    if (caja && currentUser) {
      setFormData({
        id_caja: caja.id_caja,
        usuario_id_cierre: currentUser.id,
        fecha_cierre: getNowInBusinessTimezone(),
        monto_cierre: 0
      });
    }
  }, [caja, currentUser]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchClientesSaldo = async () => {
      setLoadingClientesSaldo(true);
      try {
        const resp = await fetch('/api/clients?con_saldo=1&limit=200');
        const data = await resp.json();
        if (!cancelled && data.success) setClientesSaldo(data.data || []);
      } catch (error) {
        if (!cancelled) {
          logger.captureException(error, { context: 'CerrarCajaDialog:fetchClientesSaldo' });
        }
      } finally {
        if (!cancelled) setLoadingClientesSaldo(false);
      }
    };
    fetchClientesSaldo();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) setPendiente(null);
  }, [open]);

  /** El administrador cierra en el acto; el resto pide autorización por WhatsApp. */
  const esAdmin = (currentUser?.role || '').toLowerCase() === 'administrador';

  const validateForm = (): boolean => {
    return true;
  };

  /**
   * Saldos prepago que los clientes todavía tienen cargados. No están en el cajón
   * (se cobraron en un turno anterior), así que el cierre los descuenta del
   * efectivo: sin restarlos, el arqueo da faltante por plata que nunca estuvo ahí.
   */
  const saldoClientesPendiente = (clientesSaldo || []).reduce(
    (sum, cliente) => sum + Number(cliente?.saldo || 0),
    0
  );

  // Misma resta que tarjeta, detalle y monto de cierre del repositorio: la fórmula
  // vive en `lib/business/cajaEfectivo`, acá solo se aportan los saldos leídos de clientes.
  const montoCierrePrevisto = montoCierreCaja(caja, saldoClientesPendiente);
  const devolucionClientesPrevista = calcularDevolucionSaldoClientes(caja, saldoClientesPendiente);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!caja) {
      toast.error('No hay caja seleccionada');
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        monto_cierre: Number(montoCierrePrevisto) || 0,
        fecha_cierre: getNowInBusinessTimezone()
      } as CajaCierre & { monto_cierre: number };

      const resultado = await onCerrarCaja(dataToSend);

      // Sin autorización la caja sigue abierta: el modal no se cierra en silencio,
      // muestra que quedó esperando al administrador.
      if (resultado?.estado === 'pendiente') {
        setPendiente(resultado);
        return;
      }

      if (resultado?.estado === 'cerrada') {
        handleClose();
      }
    } catch (error) {
      logger.captureException(error, { context: 'CerrarCajaDialog:cerrarCaja' });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setPendiente(null);
    setFormData({
      id_caja: 0,
      usuario_id_cierre: 0,
      fecha_cierre: getNowInBusinessTimezone(),
      monto_cierre: 0
    });
    setErrors({});
  };

  if (!caja) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg max-h-[90vh] flex flex-col p-0 border-none bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl overflow-hidden'>
        <DialogHeader className='shrink-0 px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-800'>
          <DialogTitle className='text-2xl font-black tracking-tight text-slate-900 dark:text-white'>
            Cerrar Caja {getDiaSemana(caja.fecha_apertura)}
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          {pendiente ? (
            <div className='space-y-4'>
              <div className='bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 space-y-3'>
                <div className='flex items-center gap-2'>
                  <Clock className='w-5 h-5 text-amber-600' />
                  <h4 className='font-bold text-amber-800 dark:text-amber-200'>
                    Cierre pendiente de autorización
                  </h4>
                </div>
                <p className='text-sm text-amber-800/90 dark:text-amber-200/90'>
                  La caja sigue <strong>abierta</strong>. Se envió el pedido por WhatsApp al
                  administrador con el link para autorizar; en cuanto responda, la caja se cierra
                  automáticamente.
                </p>
                <div className='rounded-xl bg-white/70 dark:bg-slate-900/40 p-3 space-y-1 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-slate-500'>Saldos cubiertos con efectivo:</span>
                    <span className='font-bold'>
                      {formatCurrencyCLP(pendiente.saldoClientesDescontado)}
                    </span>
                  </div>
                  {pendiente.saldoClientesPorDevolver > 0 && (
                    <div className='flex justify-between text-amber-700 dark:text-amber-300'>
                      <span>Falta devolver a clientes:</span>
                      <span className='font-bold'>
                        {formatCurrencyCLP(pendiente.saldoClientesPorDevolver)}
                      </span>
                    </div>
                  )}
                  <div className='flex justify-between'>
                    <span className='text-slate-500'>Monto de cierre previsto:</span>
                    <span className='font-bold'>{formatCurrencyCLP(pendiente.montoCierre)}</span>
                  </div>
                </div>
                <p className='text-xs text-amber-700 dark:text-amber-300'>
                  El monto se recalcula al autorizar, con los saldos que los clientes tengan
                  cargados en ese momento.
                </p>
                <p className='text-xs text-amber-700/90 dark:text-amber-300/90'>
                  ¿No responde? Si nadie contesta, el sistema vuelve a avisar solo cada pocos
                  minutos; «Reenviar aviso», en la tarjeta de la caja, lo manda en el momento. Y si
                  sigue sin respuesta, ahí mismo aparece «Pedir cierre de nuevo» para reabrir el
                  pedido desde cero.
                </p>
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              {}
              <div className='bg-gray-50 p-1 px-2  rounded-lg space-y-2'>
                <h4 className='font-medium text-sm'>Resumen de la caja:</h4>
                <div className='grid grid-cols-2 gap-2 text-sm'>
                  <div>
                    <span className='text-gray-500'>Apertura:</span>
                    <span className='ml-2 mr-2 font-medium'>
                      {formatCurrencyCLP(caja.monto_apertura)}
                    </span>
                  </div>
                  <div>
                    <span className='text-gray-500'>Ventas:</span>
                    <span className='ml-2 mr-2 font-medium text-green-600'>
                      {formatCurrencyCLP(caja.ventas)}
                    </span>
                  </div>
                  <div>
                    <span className='text-gray-500'>Efectivo:</span>
                    <span className='ml-2 mr-2 font-medium'>
                      {formatCurrencyCLP(caja.efectivo)}
                    </span>
                  </div>
                  <div>
                    <span className='text-gray-500'>Tarjeta:</span>
                    <span className='ml-2 mr-2 font-medium'>{formatCurrencyCLP(caja.tarjeta)}</span>
                  </div>
                  <div>
                    <span className='text-gray-500'>Transferencia:</span>
                    <span className='ml-2 mr-2 font-medium text-sm'>
                      {formatCurrencyCLP(caja.transferencia)}
                    </span>
                  </div>
                  <div>
                    <span className='text-gray-500'>Servicios:</span>
                    <span className='ml-2 mr-2 font-medium'>
                      {formatCurrencyCLP(caja.servicios)}
                    </span>
                  </div>
                  {caja.devoluciones > 0 && (
                    <div>
                      <span className='text-gray-500'>Devoluciones:</span>
                      <span className='ml-2 mr-2 font-medium text-red-600'>
                        -{formatCurrencyCLP(caja.devoluciones)}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className='text-gray-500'>Saldos cubiertos con efectivo:</span>
                    <span className='ml-2 mr-2 font-medium text-red-600'>
                      -{formatCurrencyCLP(devolucionClientesPrevista.descontado)}
                    </span>
                  </div>
                  {devolucionClientesPrevista.pendiente > 0 && (
                    <div className='flex justify-between col-span-2'>
                      <span className='text-amber-700'>Falta devolver a clientes:</span>
                      <span className='ml-2 mr-2 font-bold text-amber-700'>
                        {formatCurrencyCLP(devolucionClientesPrevista.pendiente)}
                      </span>
                    </div>
                  )}
                  <div className='col-span-2 border-t pt-2 mt-1'>
                    <span className='text-gray-900 font-bold uppercase text-[10px] tracking-wider'>
                      Total a Cerrar:
                    </span>
                    <span className='ml-2 font-black text-lg text-red-600'>
                      {formatCurrencyCLP(montoCierrePrevisto)}
                    </span>
                  </div>
                </div>
              </div>

              {}
              <div className='bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2'>
                <div className='flex items-center gap-2'>
                  <Users className='w-4 h-4 text-amber-600' />
                  <h4 className='font-medium text-sm text-amber-800 dark:text-amber-200'>
                    Clientes con saldo prepago pendiente
                  </h4>
                </div>
                <ClientesSaldoList clientes={clientesSaldo} loading={loadingClientesSaldo} />
              </div>
            </div>
          )}
        </div>

        <div className='shrink-0 border-t px-6 py-4'>
          <form onSubmit={handleSubmit}>
            <div className='flex justify-center gap-2 text-center'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
                onClick={handleClose}
                disabled={loading}
              >
                {pendiente ? 'Entendido' : 'Cancelar'}
              </Button>
              <Button
                type='submit'
                disabled={loading || usersLoading || !!pendiente}
                size='sm'
                variant='default'
                className={`rounded-full px-8 bg-red-600 text-white hover:bg-red-700 transition-all hover:scale-105 ${
                  pendiente ? 'hidden' : ''
                }`}
              >
                {loading && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                {esAdmin ? 'Cerrar Caja' : 'Pedir Cierre'}
              </Button>
            </div>
            {!esAdmin && !pendiente && (
              <p className='text-[11px] text-center text-slate-500 dark:text-slate-400 mt-3'>
                Se enviará el pedido por WhatsApp al administrador. La caja sigue abierta hasta que
                autorice.
              </p>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
