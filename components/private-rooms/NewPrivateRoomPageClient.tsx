'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ArrowLeft, DollarSign, Coins, ShoppingCart, Split } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatCurrencyCLP, parseNumberInput } from '@/lib/utils/formatters';
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

export default function NuevoServicioPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { allClients: clientes = [], fetchClients } = useClients();
  const { anfitrionas, refetch: refetchAnfitrionas } = useAnfitrionasDisponibles();
  const { habitaciones, getHabitaciones } = useHabitaciones();
  const { startTimer } = useTimer();

  // Form data
  const [formData, setFormData] = useState({
    clientes: [] as string[], // UUID/text ID support
    usuarios: [] as string[], // UUID/text ID support
    habitacion_id: '' as string,
    precio_habitacion: 0,
    tiempo_habitacion: 0,
    precio_servicio: 0,
    metodo_pago: '',
    iva: 0,
    tiempo: 0
  });

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [servicioDataToSubmit, setServicioDataToSubmit] = useState<any>(null);

  // Calculated values
  const [precioHabitacion, setPrecioHabitacion] = useState(0);
  const [tiempoHabitacion, setTiempoHabitacion] = useState(0);
  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [pagosMixtos, setPagosMixtos] = useState<any[]>([]);

  const calcularMontoPagoMixto = (metodo: string, montoBase: number) => {
    if (metodo === 'tarjeta') {
      return Math.floor(montoBase * 1.2);
    }

    return montoBase;
  };

  const crearPagoMixto = (metodo: string, montoBase: number) => ({
    metodo,
    baseMonto: montoBase,
    monto: calcularMontoPagoMixto(metodo, montoBase),
    display: montoBase > 0 ? formatNumberWithSeparators(montoBase) : ''
  });

  // Dynamic limits calculation
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

  // Format number with thousand separators
  const formatNumberWithSeparators = (value: number): string => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const refreshLookupData = useCallback(async () => {
    await Promise.all([fetchClients(), refetchAnfitrionas(), getHabitaciones()]);
  }, [fetchClients, refetchAnfitrionas, getHabitaciones]);

  // Generate random code function
  const generateCode = generateRandomCode;

  useRefreshOnFocus(refreshLookupData);

  // Calculate totals when form data changes
  useEffect(() => {
    // LÃ³gica: Si el nÃºmero de clientes es mayor al de anfitrionas y la habitaciÃ³n NO tiene comisiÃ³n,
    // el precio de la habitaciÃ³n y el servicio se multiplican por el nÃºmero de clientes seleccionados.
    // En otros casos, se multiplica por el nÃºmero de anfitrionas.
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

    // Si la habitaciÃ³n tiene comisiÃ³n mayor a cero, NO multiplicar el precio de la habitaciÃ³n
    if (selectedRoom && (selectedRoom.comision_anfitriona ?? 0) > 0) {
      multiplicadorHabitacion = 1;
    }

    const nuevoSubTotal = formData.precio_servicio * multiplicadorServicio;
    const precioHabitacionTotal = precioHabitacion * multiplicadorHabitacion;

    // Calcular IVA sobre el precio de servicio ya multiplicado
    let nuevoIVA = 0;
    if (formData.metodo_pago === 'tarjeta') {
      nuevoIVA = Math.floor(nuevoSubTotal * 0.2);
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
    selectedRoom
  ]);

  // Update habitacion data when selected
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
      toast.error('Selecciona una habitaciÃ³n');
      return;
    }
    if (formData.precio_servicio < 0) {
      toast.error('El precio de servicio no puede ser negativo');
      return;
    }
    if (!formData.metodo_pago) {
      toast.error('Selecciona un mÃ©todo de pago');
      return;
    }

    // Preparar datos del servicio
    const normalizeId = (id: string) => {
      const num = Number(id);
      return Number.isNaN(num) ? id : num;
    };

    const servicioData = {
      codigo: generateCode(),
      cliente_id: formData.clientes.length > 0 ? normalizeId(formData.clientes[0]) : null, // Enviamos el primero como principal
      clientes: formData.clientes.map(normalizeId), // Enviamos todos los clientes
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
    boletaWindow.document.write(`
      <html>
        <head>
          <title>Boleta Habitacion</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; background: #f8fafc; }
            .card { max-width: 420px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 24px; padding: 28px; background: #ffffff; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08); }
            .header { text-align: center; padding-bottom: 18px; border-bottom: 1px solid #e5e7eb; }
            .logo { width: 88px; height: auto; margin: 0 auto 12px; display: block; }
            .brand { font-size: 22px; font-weight: 800; margin: 0; }
            .subtitle { margin: 6px 0 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.18em; }
            .section { margin-top: 20px; }
            .section-title { font-size: 11px; font-weight: 800; color: #9a3412; text-transform: uppercase; letter-spacing: 0.16em; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin: 10px 0; }
            .label { color: #6b7280; font-size: 13px; }
            .value { font-weight: 700; text-align: right; }
            .service-box { margin-top: 18px; border: 1px solid #fed7aa; background: linear-gradient(135deg, #fff7ed, #ffffff); border-radius: 18px; padding: 16px; }
            .total { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #fdba74; margin-top: 14px; padding-top: 14px; font-size: 21px; font-weight: 800; color: #c2410c; }
            .footer { margin-top: 22px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <img src="${logoUrl}" alt="Las MuÃ±ecas de RamÃ³n" class="logo" />
              <p class="brand">Las MuÃ±ecas de RamÃ³n</p>
              <p class="subtitle">Boleta habitaciÃ³n</p>
            </div>

            <div class="section">
              <div class="section-title">Detalle de atenciÃ³n</div>
              <div class="row"><span class="label">Cliente</span><span class="value">${clienteNombre}</span></div>
              <div class="row"><span class="label">HabitaciÃ³n</span><span class="value">${habitacionNombre}</span></div>
              <div class="row"><span class="label">MÃ©todo de pago</span><span class="value">${formData.metodo_pago}</span></div>
              <div class="row"><span class="label">Fecha</span><span class="value">${fecha}</span></div>
              <div class="row"><span class="label">Atendido por</span><span class="value">${anfitrionasAtendiendo || 'Sin anfitriona asignada'}</span></div>
            </div>

            <div class="service-box">
              <div class="section-title">Concepto</div>
              <div class="row"><span class="label">Servicio</span><span class="value">Uso de habitaciÃ³n privada</span></div>
              <div class="total"><span>Total habitaciÃ³n</span><span>${formatCurrencyCLP(monto)}</span></div>
            </div>

            <div class="footer">
              Gracias por su visita.<br />
              Documento generado desde el mÃ³dulo de servicios privados.
            </div>
          </div>
        </body>
      </html>
    `);
    boletaWindow.document.close();
    boletaWindow.focus();
    boletaWindow.print();
  };

  // FunciÃ³n para enviar el servicio despuÃ©s de confirmar
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
          // Obtener nombres de anfitrionas seleccionadas
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
            anfitrionasSeleccionadas // Pasar las anfitrionas
          );
        }

        // Invalidar cache de React Query para servicios
        queryClient.invalidateQueries({ queryKey: ['/api/servicios'] });

        // Refrescar maestros para que el siguiente alta use datos actualizados
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
          <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>
            Datos Servicio
          </h2>
          <div className='uppercase text-xs tracking-widest text-gray-400 font-semibold mb-1'>
            Las muÃ±ecas de RamÃ³n
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
          AtrÃ¡s
        </Button>
      </div>

      <div className='p-4 sm:p-6 lg:p-8 bg-white mx-4 sm:mx-6 lg:mx-8 space-y-4 sm:space-y-6 shadow-md rounded-xl'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
          {/* HabitaciÃ³n */}
          <RoomSelect
            habitaciones={habitaciones}
            value={formData.habitacion_id ? formData.habitacion_id.toString() : ''}
            onChange={value => {
              setFormData(prev => ({
                ...prev,
                habitacion_id: value
              }));
            }}
            label='HABITACIÃ“N'
            placeholder='Seleccionar habitaciÃ³n'
            required={true}
            showPrice={true}
            showTime={true}
            filterByStatus={1} // Solo habitaciones disponibles
            requireCompleteConfig={true}
            className='w-full'
          />
          {/* Anfitrionas */}
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
          {/* Cliente */}
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

        {false && (
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
            <div className='rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-slate-900/50'>
              <p className='text-[10px] font-black uppercase tracking-[0.24em] text-gray-400'>
                HabitaciÃ³n seleccionada
              </p>
              <p className='mt-1 text-sm font-bold text-gray-900 dark:text-white'>
                {selectedRoom.nombre || selectedRoom.name || selectedRoom.numero || 'HabitaciÃ³n'}
              </p>
            </div>

            <div className='rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-slate-900/50'>
              <p className='text-[10px] font-black uppercase tracking-[0.24em] text-gray-400'>
                Tiempo de la habitaciÃ³n
              </p>
              <p className='mt-1 text-sm font-bold text-gray-900 dark:text-white'>
                {tiempoHabitacion > 0 ? `${tiempoHabitacion} minutos` : 'Sin tiempo asignado'}
              </p>
            </div>

            <div className='rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-slate-900/50'>
              <p className='text-[10px] font-black uppercase tracking-[0.24em] text-gray-400'>
                Precio de la habitaciÃ³n
              </p>
              <p className='mt-1 text-sm font-bold text-gray-900 dark:text-white'>
                {formatCurrencyCLP(precioHabitacion)}
              </p>
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
          {/* Precio de servicio */}
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
                className='w-full bg-gray-100 dark:bg-slate-900/50 py-1 pl-9 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-full h-[40px] focus:outline-none focus:border-black'
                placeholder='0'
                disabled={isServicePriceLocked}
                readOnly={isServicePriceLocked}
              />
            </div>
          </div>

          {/* MÃ©todo de pago */}
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
              label='MÃ‰TODO DE PAGO'
              placeholder='Seleccionar mÃ©todo de pago'
              required={true}
              className='w-full'
              showPrepago={!!selectedClientData}
              showMixto={true}
              disabledMethods={[...disabledPaymentMethods]}
              clientes={clientes}
              selectedClienteId={formData.clientes[0] || ''}
            />
          </div>

          {/* IVA */}
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
                className='w-full bg-gray-100 dark:bg-slate-900/50 py-1 pl-9 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-full h-[40px] focus:outline-none focus:border-black'
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
          <div className='rounded-2xl border border-dotted border-slate-300 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 transition-all duration-300'>
            <div className='mb-3 flex items-center gap-2'>
              <Split className='h-4 w-4 text-slate-700 dark:text-slate-200' />
              <p className='text-xs font-bold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200'>
                DistribuciÃ³n de pagos
              </p>
            </div>

            <div className='space-y-3'>
              {pagosMixtos.map((pago, index) => (
                <div key={`${pago.metodo}-${index}`} className='flex items-center gap-2'>
                  <div className='w-28 text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300'>
                    {pago.metodo}
                  </div>
                  <div className='relative flex-1'>
                    <span className='absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500'>
                      <DollarSign className='h-4 w-4' />
                    </span>
                    <input
                      type='text'
                      value={pago.display}
                      placeholder='0'
                      onChange={e => {
                        const montoBase = parseNumberInput(e.target.value);
                        setPagosMixtos(prev =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                ...item,
                                baseMonto: montoBase,
                                monto: calcularMontoPagoMixto(item.metodo, montoBase),
                                display:
                                  montoBase > 0 ? formatNumberWithSeparators(montoBase) : ''
                              }
                              : item
                          )
                        );
                      }}
                      className='w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-black focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400'
                    />
                  </div>
                  {pago.metodo === 'tarjeta' && Number(pago.baseMonto || 0) > 0 && (
                    <p className='text-[10px] font-bold text-purple-600'>
                      Cargo tarjeta: {formatCurrencyCLP(pago.monto)} = base{' '}
                      {formatCurrencyCLP(pago.baseMonto)} + IVA{' '}
                      {formatCurrencyCLP(Math.max(0, pago.monto - pago.baseMonto))}
                    </p>
                  )}
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      setPagosMixtos(prev => prev.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className='rounded-full px-3 h-10 border-red-200 text-red-500 hover:bg-red-500 hover:text-white transition-colors'
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>

            <div className='mt-4 flex flex-wrap gap-2'>
              {(['efectivo', 'tarjeta', 'transferencia', 'prepago'] as const).map(metodo => {
                if (pagosMixtos.some(pago => pago.metodo === metodo)) return null;

                const sinSaldo =
                  metodo === 'prepago' && Number(selectedClientData?.saldo || 0) <= 0;

                return (
                  <Button
                    key={metodo}
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={sinSaldo}
                    onClick={() => setPagosMixtos(prev => [...prev, crearPagoMixto(metodo, 0)])}
                    className='rounded-full uppercase text-[10px] font-black h-8 px-4 border-slate-300 shadow-sm'
                  >
                    + {metodo}
                  </Button>
                );
              })}
            </div>

            <div className='mt-4 border-t border-slate-200 border-dashed pt-3 text-sm dark:border-slate-800'>
              <div className='flex items-center justify-between text-slate-600 dark:text-slate-300'>
                <span className='font-bold uppercase text-[10px]'>Suma actual</span>
                <span
                  className={
                    pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0) === total
                      ? 'font-black text-emerald-600'
                      : 'font-black text-red-500'
                  }
                >
                  {formatCurrencyCLP(pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0))}
                </span>
              </div>
              {pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0) !== total && (
                <p className='mt-1 text-[10px] font-bold text-red-500 uppercase text-right'>
                  Falta{' '}
                  {formatCurrencyCLP(
                    total - pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0)
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        {false && precioHabitacionBoleta > 0 && null}
        {/* Total y botÃ³n centrados */}
        <div className='flex flex-col items-center justify-center mt-6 sm:mt-8 mb-4'>
          <span className='uppercase text-xs sm:text-sm text-gray-400 tracking-widest font-semibold mb-1'>
            TOTAL
          </span>
          <span className='text-lg sm:text-xl lg:text-2xl font-extrabold text-gray-900 mb-4'>
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

      {/* Modal de confirmaciÃ³n */}
      {showConfirmModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200'>
            <h3 className='text-lg sm:text-xl font-black text-gray-900 mb-2 uppercase tracking-tight'>
              Confirmar creaciÃ³n de servicio
            </h3>
            <p className='text-sm sm:text-base text-gray-500 mb-6 font-medium'>
              Â¿Deseas crear el servicio y comenzar el tiempo?
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




