'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ArrowLeft, DollarSign, Coins, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { generateRandomCode } from '@/lib/utils/codeUtils';
import { CustomersSelect } from '@/components/shared/selects';
import { HostessSelect } from '@/components/shared/selects';
import { RoomSelect } from '@/components/shared/selects';
import { PaymentMethodSelect } from '@/components/shared/selects';
import { useRefreshOnFocus } from '@/hooks/shared';
import { useClients } from '@/hooks/clientes/useClients';
import { useAnfitrionasDisponibles } from '@/hooks/personal';
import { useHabitaciones } from '@/hooks/habitaciones/useHabitaciones';
import { useTimer } from '@/contexts/TimerContext';
import { useQueryClient } from '@tanstack/react-query';
import logger from '@/lib/utils/logger';
import { usePrivateRoomSummary } from '@/hooks/private-rooms/usePrivateRoomSummary';
import { PrivateRoomSummaryCard } from './PrivateRoomSummaryCard';
import { PagosMixtosSection } from './PagosMixtosSection';
import { generateReceiptHTML } from './utils/PrivateRoomReceipt';
import { useIvaRate } from '@/components/providers/IvaRateProvider';

export default function NuevoServicioPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { allClients: clientes = [], fetchClients } = useClients();
  const { anfitrionas, refetch: refetchAnfitrionas } = useAnfitrionasDisponibles();
  const { habitaciones, getHabitaciones } = useHabitaciones();
  const { startTimer } = useTimer();
  const ivaRate = useIvaRate();

  const [formData, setFormData] = useState({
    clientes: [] as string[],
    usuarios: [] as string[],
    habitacion_id: '' as string,
    precio_habitacion: 0,
    tiempo_habitacion: 0,
    precio_servicio: 0,
    metodo_pago: '',
    iva: 0,
    tiempo: 0
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [servicioDataToSubmit, setServicioDataToSubmit] = useState<any>(null);

  const [precioHabitacion, setPrecioHabitacion] = useState(0);
  const [tiempoHabitacion, setTiempoHabitacion] = useState(0);
  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [pagosMixtos, setPagosMixtos] = useState<any[]>([]);

  const {
    selectedRoom,
    selectedClientData,
    selectedClientName,
    selectedHostessNames,
    hasComision,
    isServicePriceLocked,
    maxHostesses,
    maxClients,
    desgloseTarjeta,
    precioHabitacionBoleta,
    disabledPaymentMethods
  } = usePrivateRoomSummary({
    formData,
    clientes,
    anfitrionas,
    habitaciones,
    precioHabitacion,
    total,
    pagosMixtos
  });

  const formatNumberWithSeparators = (value: number): string => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const refreshLookupData = useCallback(async () => {
    await Promise.all([fetchClients(), refetchAnfitrionas(), getHabitaciones()]);
  }, [fetchClients, refetchAnfitrionas, getHabitaciones]);

  useRefreshOnFocus(refreshLookupData);

  useEffect(() => {
    const cantidadAnfitrionas = formData.usuarios.length || 1;
    const cantidadClientes = formData.clientes.length || 1;
    let multiplicadorServicio = cantidadAnfitrionas;
    let multiplicadorHabitacion = cantidadAnfitrionas;

    if (
      cantidadClientes > cantidadAnfitrionas &&
      selectedRoom &&
      (selectedRoom.comision_anfitriona ?? 0) === 0
    ) {
      multiplicadorServicio = cantidadClientes;
      multiplicadorHabitacion = cantidadClientes;
    }

    if (selectedRoom && (selectedRoom.comision_anfitriona ?? 0) > 0) {
      multiplicadorHabitacion = 1;
    }

    const nuevoSubTotal = formData.precio_servicio * multiplicadorServicio;
    const precioHabitacionTotal = precioHabitacion * multiplicadorHabitacion;

    let nuevoIVA = 0;
    if (formData.metodo_pago === 'tarjeta') {
      nuevoIVA = Math.floor(nuevoSubTotal * ivaRate);
    }

    const totalBase = nuevoSubTotal + precioHabitacionTotal;
    let totalFinal = totalBase;

    if (formData.metodo_pago === 'tarjeta') {
      const nuevoTotal = totalBase + nuevoIVA;
      const totalRedondeado = Math.ceil(nuevoTotal / 5000) * 5000;
      const excedente = totalRedondeado - nuevoTotal;
      totalFinal = totalRedondeado;
      nuevoIVA = nuevoIVA + excedente;
    } else if (formData.metodo_pago === 'mixto') {
      nuevoIVA = pagosMixtos
        .filter(pago => pago.metodo === 'tarjeta')
        .reduce(
          (sum, pago) => sum + Math.max(0, Number(pago.monto || 0) - Number(pago.baseMonto || 0)),
          0
        );
      totalFinal = totalBase + nuevoIVA;
    }

    setSubTotal(nuevoSubTotal);
    setTotal(totalFinal);
    setFormData(prev => ({ ...prev, iva: nuevoIVA }));
  }, [
    formData.precio_servicio,
    precioHabitacion,
    formData.usuarios.length,
    formData.clientes.length,
    formData.metodo_pago,
    pagosMixtos,
    selectedRoom,
    ivaRate
  ]);

  useEffect(() => {
    if (formData.habitacion_id) {
      if (selectedRoom) {
        const precio = selectedRoom.precio || selectedRoom.price || 0;
        const tiempo = selectedRoom.tiempo || selectedRoom.time || 0;
        const roomCommission = Number(selectedRoom.comision_anfitriona ?? 0);
        setPrecioHabitacion(precio);
        setTiempoHabitacion(tiempo);
        setFormData(prev => ({
          ...prev,
          tiempo,
          precio_servicio: roomCommission > 0 ? 0 : prev.precio_servicio
        }));
      }
    } else {
      setPrecioHabitacion(0);
      setTiempoHabitacion(0);
    }
  }, [formData.habitacion_id, selectedRoom]);

  useEffect(() => {
    if (selectedClientData) return;

    if (formData.metodo_pago === 'prepago') {
      setFormData(prev => ({ ...prev, metodo_pago: '' }));
    }

    setPagosMixtos(prev => prev.filter(pago => pago.metodo !== 'prepago'));
  }, [selectedClientData, formData.metodo_pago]);

  useEffect(() => {
    if (!selectedClientData) return;

    const saldo = Number(selectedClientData.saldo || 0);
    if (saldo > 0) {
      if (formData.metodo_pago === 'prepago' || formData.metodo_pago === 'mixto') {
        setFormData(prev => ({ ...prev, metodo_pago: '' }));
      }

      setPagosMixtos([]);
      return;
    }

    if (formData.metodo_pago === 'prepago') {
      setFormData(prev => ({ ...prev, metodo_pago: '' }));
    }

    setPagosMixtos(prev => prev.filter(pago => pago.metodo !== 'prepago'));
  }, [selectedClientData, formData.metodo_pago]);

  const handleSubmit = async () => {
    if (formData.usuarios.length === 0) {
      toast.error('Selecciona al menos una anfitriona');
      return;
    }
    if (!formData.habitacion_id) {
      toast.error('Selecciona una habitación');
      return;
    }
    if (formData.precio_servicio < 0) {
      toast.error('El precio de servicio no puede ser negativo');
      return;
    }
    if (!formData.metodo_pago) {
      toast.error('Selecciona un método de pago');
      return;
    }

    const normalizeId = (id: string) => {
      const num = Number(id);
      return Number.isNaN(num) ? id : num;
    };

    const servicioData = {
      codigo: generateRandomCode(),
      cliente_id: formData.clientes.length > 0 ? normalizeId(formData.clientes[0]) : null,
      clientes: formData.clientes.map(normalizeId),
      habitacion_id: formData.habitacion_id,
      precio_habitacion: precioHabitacion,
      precio_servicio: formData.precio_servicio,
      iva: formData.iva,
      sub_total: subTotal,
      total: total,
      tiempo: formData.tiempo,
      metodo_pago: formData.metodo_pago,
      usuarios: formData.usuarios.map(normalizeId),
      pagos_mixtos: formData.metodo_pago === 'mixto' ? pagosMixtos : null
    };

    setServicioDataToSubmit(servicioData);
    setShowConfirmModal(true);
  };

  const handleGenerarBoletaHabitacion = () => {
    const habitacionNombre = selectedRoom?.nombre || selectedRoom?.name || 'Habitacion';
    const clienteNombre = selectedClientData?.nombre || selectedClientData?.name || 'Particular';
    const monto = precioHabitacionBoleta;
    const anfitrionasAtendiendo = formData.usuarios
      .map(userId => {
        const anfitriona = anfitrionas.find(
          a => String(a.id_usuario ?? a.id ?? '') === String(userId)
        );
        return anfitriona ? anfitriona.nick || anfitriona.nombre : null;
      })
      .filter(Boolean)
      .join(', ');

    if (monto <= 0) {
      toast.error('No hay monto de habitacion para generar la boleta');
      return;
    }

    const boletaWindow = window.open('', '_blank', 'width=420,height=640');
    if (!boletaWindow) {
      toast.error('No se pudo abrir la ventana para la boleta');
      return;
    }

    const fecha = new Date().toLocaleString('es-CL');
    const logoUrl = `${window.location.origin}/img/system/logo2.png`;
    const htmlContent = generateReceiptHTML({
      logoUrl,
      clienteNombre,
      habitacionNombre,
      metodoPago: formData.metodo_pago,
      fecha,
      anfitrionasAtendiendo,
      monto
    });
    boletaWindow.document.write(htmlContent);
    boletaWindow.document.close();
    boletaWindow.focus();
    boletaWindow.print();
  };

  const confirmAndSubmit = async () => {
    if (!servicioDataToSubmit) return;

    setLoading(true);
    setShowConfirmModal(false);
    try {
      const response = await fetch('/api/servicios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(servicioDataToSubmit)
      });

      const data = await response.json();

      if (data.success) {
        if (selectedRoom) {
          const anfitrionasSeleccionadas = servicioDataToSubmit.usuarios
            .map((userId: any) => {
              const anfitriona = anfitrionas.find(
                a => String(a.id_usuario ?? a.id ?? '') === String(userId)
              );
              return anfitriona ? anfitriona.nick || anfitriona.nombre : null;
            })
            .filter(Boolean)
            .join(', ');

          startTimer(
            String(data.id || data.id_servicio),
            String(servicioDataToSubmit.habitacion_id),
            selectedRoom.nombre || selectedRoom.name || selectedRoom.numero || 'N/A',
            servicioDataToSubmit.tiempo,
            servicioDataToSubmit.codigo,
            clientes.find(
              c => String(c.id_cliente ?? c.id ?? '') === String(servicioDataToSubmit.cliente_id)
            )?.nombre || '',
            anfitrionasSeleccionadas
          );
        }

        queryClient.invalidateQueries({ queryKey: ['/api/servicios'] });

        await refreshLookupData();

        toast.success(`Servicio creado exitosamente`);
        router.push('/private-rooms');
      } else {
        toast.error(data.message || 'Error al crear servicio');
      }
    } catch (error) {
      logger.captureException(error, { context: 'NewPrivateRoomPageClient:createRoom' });
      toast.error('Error al crear servicio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 sm:mt-6 lg:mt-10 p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6'>
        <div>
          <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white'>
            Datos Servicio
          </h2>
          <div className='uppercase text-xs tracking-widest text-gray-400 font-semibold mb-1'>
            Las muñecas de Ramón
          </div>
        </div>

        <Button
          variant='outline'
          size='sm'
          className='rounded-full px-4 sm:px-6 bg-black text-white hover:scale-110 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
          onClick={() => router.push('/private-rooms')}
          type='button'
        >
          <ArrowLeft className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
          Atrás
        </Button>
      </div>

      <div className='p-4 sm:p-6 lg:p-8 bg-white mx-4 sm:mx-6 lg:mx-8 space-y-4 sm:space-y-6 shadow-md rounded-xl'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
          {}
          <RoomSelect
            habitaciones={habitaciones}
            value={formData.habitacion_id ? formData.habitacion_id.toString() : ''}
            onChange={value => {
              setFormData(prev => ({
                ...prev,
                habitacion_id: value
              }));
            }}
            label='HABITACIÓN'
            placeholder='Seleccionar habitación'
            required={true}
            showPrice={true}
            showTime={true}
            filterByStatus={1}
            requireCompleteConfig={true}
            className='w-full'
          />
          {}
          <HostessSelect
            anfitrionas={anfitrionas}
            value={formData.usuarios}
            onChange={value => {
              setFormData(prev => ({
                ...prev,
                usuarios: value
              }));
            }}
            label='ANFITRIONAS'
            placeholder='Seleccionar anfitrionas'
            required={true}
            maxSelection={maxHostesses}
            className='w-full'
          />
          {}
          <CustomersSelect
            clientes={clientes}
            value={formData.clientes}
            onChange={value => {
              setFormData(prev => ({
                ...prev,
                clientes: value
              }));
            }}
            label='CLIENTES'
            placeholder='Seleccionar cliente(s)'
            maxSelection={maxClients}
            className='w-full'
          />
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
          {}
          <div>
            <Label className='block text-xs font-medium text-gray-500 mb-1 uppercase'>
              PRECIO DE SERVICIO
            </Label>
            <div className='relative'>
              <span className='absolute inset-y-0 left-3 flex items-center text-gray-400'>
                <DollarSign className='w-4 h-4' />
              </span>
              <input
                type='text'
                value={
                  formData.precio_servicio === 0
                    ? ''
                    : formatNumberWithSeparators(formData.precio_servicio)
                }
                onBlur={e => {
                  if (e.target.value === '') {
                    setFormData({
                      ...formData,
                      precio_servicio: 0
                    });
                  }
                }}
                onChange={e => {
                  const numericValue = e.target.value.replace(/\./g, '');
                  setFormData({
                    ...formData,
                    precio_servicio:
                      numericValue === '' ? 0 : Math.max(0, parseInt(numericValue) || 0)
                  });
                }}
                className='w-full bg-gray-100 dark:bg-slate-900/50 py-1 pl-9 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-full h-[40px] focus:outline-hidden focus:border-black'
                placeholder='0'
                disabled={isServicePriceLocked}
                readOnly={isServicePriceLocked}
              />
            </div>
          </div>

          {}
          <div>
            <PaymentMethodSelect
              value={formData.metodo_pago}
              onChange={value => {
                setFormData(prev => ({
                  ...prev,
                  metodo_pago: value
                }));

                if (value !== 'mixto') {
                  setPagosMixtos([]);
                  return;
                }

                setPagosMixtos([]);
              }}
              label='MÉTODO DE PAGO'
              placeholder='Seleccionar método de pago'
              required={true}
              className='w-full'
              showPrepago={!!selectedClientData}
              showMixto={true}
              disabledMethods={[...disabledPaymentMethods]}
              clientes={clientes}
              selectedClienteId={formData.clientes[0] || ''}
            />
          </div>

          {}
          <div>
            <Label className='block text-xs font-medium text-gray-500 mb-1 uppercase'>
              IMPUESTO IVA (20%)
            </Label>
            <div className='relative'>
              <span className='absolute inset-y-0 left-3 flex items-center text-gray-400'>
                <Coins className='w-4 h-4' />
              </span>
              <input
                type='text'
                value={formData.iva === 0 ? '' : formatNumberWithSeparators(formData.iva)}
                onChange={e => {
                  if (formData.metodo_pago === 'tarjeta') {
                    const numericValue = e.target.value.replace(/\./g, '');
                    setFormData({
                      ...formData,
                      iva: numericValue === '' ? 0 : Math.max(0, parseInt(numericValue) || 0)
                    });
                  }
                }}
                className='w-full bg-gray-100 dark:bg-slate-900/50 py-1 pl-9 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-full h-[40px] focus:outline-hidden focus:border-black'
                placeholder='0'
                disabled={formData.metodo_pago !== 'tarjeta'}
              />
            </div>
          </div>
        </div>

        <PrivateRoomSummaryCard
          room={selectedRoom}
          clientName={selectedClientName}
          hostessNames={selectedHostessNames}
          tiempoHabitacion={tiempoHabitacion}
          precioServicio={formData.precio_servicio}
          metodoPago={formData.metodo_pago}
          iva={formData.iva}
          total={total}
          desgloseTarjeta={desgloseTarjeta}
        />

        {formData.metodo_pago === 'mixto' && (
          <PagosMixtosSection
            pagosMixtos={pagosMixtos}
            onUpdate={setPagosMixtos}
            total={total}
            selectedClientData={selectedClientData}
            ivaRate={ivaRate}
          />
        )}

        {}
        <div className='flex flex-col items-center justify-center mt-6 sm:mt-8 mb-4'>
          <span className='uppercase text-xs sm:text-sm text-gray-400 tracking-widest font-semibold mb-1'>
            TOTAL
          </span>
          <span className='text-lg sm:text-xl lg:text-2xl font-extrabold text-gray-900 dark:text-white mb-4'>
            <span className='ml-1'>{formatCurrencyCLP(total)}</span>
          </span>
          <Button
            type='button'
            size='sm'
            onClick={handleSubmit}
            disabled={loading}
            className='gap-2 rounded-full bg-stone-900 text-white font-bold transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2 w-full sm:w-auto h-[48px] hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20 hover:-translate-y-0.5 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white dark:hover:text-stone-900 dark:hover:shadow-stone-100/20'
          >
            <ShoppingCart className='w-4 h-4' />
            Generar Servicio
          </Button>
        </div>
      </div>

      {}
      {showConfirmModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200'>
            <h3 className='text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight'>
              Confirmar creación de servicio
            </h3>
            <p className='text-sm sm:text-base text-gray-500 mb-6 font-medium'>
              ¿Deseas crear el servicio y comenzar el tiempo?
            </p>
            <div className='flex gap-3 justify-center'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className='px-6 py-2 text-sm font-bold rounded-full border-gray-200 h-11'
              >
                Cancelar
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={confirmAndSubmit}
                disabled={loading}
                className='gap-2 bg-black text-white hover:bg-gray-800 px-8 py-2 text-sm font-black rounded-full h-11'
              >
                <ShoppingCart className='w-4 h-4' />
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
