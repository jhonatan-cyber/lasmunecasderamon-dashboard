/* eslint-disable no-console */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { ArrowLeft, DollarSign, Coins, ShoppingCart, Wallet, Split } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { generateRandomCode } from '@/lib/utils/codeUtils';
import CustomersSelect from '@/components/shared/selects/CustomersSelect';
import HostessSelect from '@/components/shared/selects/HostessSelect';
import RoomSelect from '@/components/shared/selects/RoomSelect';
import PaymentMethodSelect, {
  type PaymentMethod
} from '@/components/shared/selects/PaymentMethodSelect';
import { useClients } from '@/hooks/clientes/useClients';
import { useAnfitrionasDisponibles } from '@/hooks/personal/useAnfitrionasDisponibles';
import { useHabitaciones } from '@/hooks/habitaciones/useHabitaciones';
import { useTimer } from '@/contexts/TimerContext';

export default function NuevoServicioPage() {
  type MixedPayment = {
    metodo: Exclude<PaymentMethod, 'mixto'>;
    monto: number;
    display: string;
  };

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { allClients: clientes = [], isLoading: loadingClientes } = useClients();
  const {
    anfitrionas,
    loading: loadingAnfitrionas,
    refetch: refetchAnfitrionas
  } = useAnfitrionasDisponibles();
  const { habitaciones, loading: loadingHabitaciones } = useHabitaciones();

  // Log temporal para debug
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Habitaciones cargadas:', habitaciones);
      console.log('Clientes cargados:', clientes?.length, 'Loading:', loadingClientes);
    }
  }, [habitaciones, clientes, loadingClientes]);
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
  const [pagosMixtos, setPagosMixtos] = useState<MixedPayment[]>([]);

  // Calculated values
  const [precioHabitacion, setPrecioHabitacion] = useState(0);
  const [tiempoHabitacion, setTiempoHabitacion] = useState(0);
  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);

  // Dynamic limits calculation
  const selectedRoom = useMemo(() => {
    return habitaciones.find(
      (h) =>
        String(h.id_habitacion || h.id) === String(formData.habitacion_id)
    );
  }, [formData.habitacion_id, habitaciones]);

  const selectedClientData = useMemo(() => {
    if (formData.clientes.length === 0) return null;
    return clientes.find(
      c => String(c.id_cliente ?? c.id ?? '') === String(formData.clientes[0])
    );
  }, [clientes, formData.clientes]);

  const hasComision = useMemo(() => {
    return selectedRoom && (selectedRoom.comision_anfitriona ?? 0) > 0;
  }, [selectedRoom]);

  const maxHostesses = useMemo(() => {
    if (!hasComision) return 10; // Default limit if no special room
    // Rule: Max 3 girls AND (Girls + Clients) <= 4
    return Math.min(3, 4 - formData.clientes.length);
  }, [hasComision, formData.clientes.length]);

  const maxClients = useMemo(() => {
    if (!hasComision) return 4;
    // Rule: (Girls + Clients) <= 4
    return 4 - formData.usuarios.length;
  }, [hasComision, formData.usuarios.length]);

  // Format number with thousand separators
  const formatNumberWithSeparators = (value: number): string => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseFormattedNumber = (value: string) => {
    const numericValue = value.replace(/\./g, '').replace(/\D/g, '');
    return numericValue === '' ? 0 : Math.max(0, parseInt(numericValue, 10) || 0);
  };

  // Generate random code function
  const generateCode = generateRandomCode;

  // Calculate totals when form data changes
  useEffect(() => {
    // Logica: si el numero de clientes es mayor al de anfitrionas y la habitacion NO tiene comision,
    // el precio de la habitacion y el servicio se multiplican por el numero de clientes seleccionados.
    // En otros casos, se multiplica por el numero de anfitrionas.
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

    // Si la habitacion tiene comision mayor a cero, NO multiplicar el precio de la habitacion
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

    const nuevoTotal = nuevoSubTotal + precioHabitacionTotal + nuevoIVA;
    let totalFinal = nuevoTotal;

    if (formData.metodo_pago === 'tarjeta') {
      const totalRedondeado = Math.ceil(nuevoTotal / 5000) * 5000;
      const excedente = totalRedondeado - nuevoTotal;
      totalFinal = totalRedondeado;
      nuevoIVA = nuevoIVA + excedente;
    }

    setSubTotal(nuevoSubTotal);
    setTotal(totalFinal);
    setFormData(prev => ({ ...prev, iva: nuevoIVA }));
  }, [
    formData.precio_servicio,
    precioHabitacion,
    formData.iva,
    formData.usuarios.length,
    formData.clientes.length,
    formData.metodo_pago,
    selectedRoom
  ]);

  // Update habitacion data when selected
  useEffect(() => {
    if (formData.habitacion_id) {
      if (selectedRoom) {
        const precio = selectedRoom.precio || selectedRoom.price || 0;
        const tiempo = selectedRoom.tiempo || selectedRoom.time || 0;
        setPrecioHabitacion(precio);
        setTiempoHabitacion(tiempo);
        setFormData(prev => ({ ...prev, tiempo: tiempo }));
      }
    } else {
      setPrecioHabitacion(0);
      setTiempoHabitacion(0);
    }
  }, [formData.habitacion_id, selectedRoom]);

  // Calculate IVA (20%) when payment method is "tarjeta"
  useEffect(() => {
    if (formData.metodo_pago === 'tarjeta') {
      const ivaCalculado = Math.floor(formData.precio_servicio * 0.2);
      setFormData(prev => ({ ...prev, iva: ivaCalculado }));
    } else {
      setFormData(prev => ({ ...prev, iva: 0 }));
    }
  }, [formData.metodo_pago, formData.precio_servicio]);

  useEffect(() => {
    if (!selectedClientData || total <= 0) return;

    const saldo = Number(selectedClientData.saldo || 0);

    if (saldo >= total) {
      setFormData(prev => ({
        ...prev,
        metodo_pago: 'prepago'
      }));
      setPagosMixtos([]);
      return;
    }

    if (saldo > 0 && saldo < total && formData.metodo_pago !== 'mixto') {
      setFormData(prev => ({ ...prev, metodo_pago: 'mixto' }));
      setPagosMixtos([
        {
          metodo: 'prepago',
          monto: saldo,
          display: saldo.toLocaleString('es-CL')
        }
      ]);
    }
  }, [selectedClientData, total, formData.metodo_pago]);

  useEffect(() => {
    if (selectedClientData) return;

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
      toast.error('Selecciona una habitacion');
      return;
    }
    if (formData.precio_servicio < 0) {
      toast.error('El precio de servicio no puede ser negativo');
      return;
    }
    if (!formData.metodo_pago) {
      toast.error('Selecciona un metodo de pago');
      return;
    }

    if (formData.metodo_pago === 'prepago') {
      if (!selectedClientData) {
        toast.error('Selecciona un cliente para usar prepago');
        return;
      }

      if (Number(selectedClientData.saldo || 0) < total) {
        toast.error('El saldo prepago no cubre el total del servicio');
        return;
      }
    }

    if (formData.metodo_pago === 'mixto') {
      const sumaPagos = pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0);

      if (pagosMixtos.length < 2) {
        toast.error('Agrega al menos 2 metodos para el pago mixto');
        return;
      }

      if (Math.abs(sumaPagos - total) > 1) {
        toast.error('La suma de los pagos mixtos debe ser igual al total');
        return;
      }

      const prepagoMixto = pagosMixtos.find(pago => pago.metodo === 'prepago')?.monto || 0;
      if (prepagoMixto > 0) {
        if (!selectedClientData) {
          toast.error('Selecciona un cliente para usar prepago en pago mixto');
          return;
        }

        if (prepagoMixto > Number(selectedClientData.saldo || 0)) {
          toast.error('El monto de prepago excede el saldo del cliente');
          return;
        }
      }
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
      pagos_mixtos:
        formData.metodo_pago === 'mixto'
          ? pagosMixtos.map(pago => ({
              metodo: pago.metodo,
              monto: pago.monto
            }))
          : undefined,
      usuarios: formData.usuarios.map(normalizeId)
    };

    setServicioDataToSubmit(servicioData);
    setShowConfirmModal(true);
  };

  // Funcion para enviar el servicio despues de confirmar
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
        const createdServiceId = data.id ?? data.data?.id_servicio ?? data.data?.id;

        if (selectedRoom && createdServiceId) {
          // Obtener nombres de anfitrionas seleccionadas
          const anfitrionasSeleccionadas = servicioDataToSubmit.usuarios
            .map((userId: number) => {
              const anfitriona = anfitrionas.find(
                a => String(a.id_usuario ?? a.id ?? '') === String(userId)
              );
              return anfitriona ? anfitriona.nick || anfitriona.nombre : null;
            })
            .filter(Boolean)
            .join(', ');

          startTimer(
            String(createdServiceId),
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

        // Refrescar lista de anfitrionas disponibles
        refetchAnfitrionas();

        toast.success(`Servicio creado exitosamente`);
        router.push('/private-rooms');
      } else {
        toast.error(data.message || 'Error al crear servicio');
      }
    } catch (error) {
      console.error('Error al crear servicio:', error);
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
            Las munecas de Ramon
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
          Atras
        </Button>
      </div>

      <div className='p-4 sm:p-6 lg:p-8 bg-white mx-4 sm:mx-6 lg:mx-8 space-y-4 sm:space-y-6 shadow-md rounded-xl'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
          {/* Habitacion - AHORA PRIMERO */}
          <RoomSelect
            habitaciones={habitaciones}
            value={formData.habitacion_id ? formData.habitacion_id.toString() : ''}
            onChange={value => {
              console.log('[new/page] habitacion onChange', value);
              setFormData(prev => ({
                ...prev,
                habitacion_id: value
              }));
            }}
            label='HABITACION'
            placeholder='Seleccionar habitacion'
            required={true}
            showPrice={true}
            showTime={true}
            filterByStatus={1} // Solo habitaciones disponibles
            className='w-full'
          />
          {/* Anfitrionas */}
          <HostessSelect
            anfitrionas={anfitrionas}
            value={formData.usuarios}
            onChange={value => {
              console.log('[new/page] anfitrionas onChange', value);
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
          {/* Cliente - AHORA OPCIONAL Y MULTIPLE */}
          <CustomersSelect
            clientes={clientes}
            value={formData.clientes}
            onChange={value => {
              console.log('[new/page] clientes onChange', value);
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

        {selectedClientData && (
          <div className='rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/40'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300'>
                  Saldo Prepago
                </p>
                <p className='mt-1 text-xl font-extrabold text-emerald-950 dark:text-emerald-100'>
                  {formatCurrencyCLP(Number(selectedClientData.saldo || 0))}
                </p>
              </div>
              <div className='rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/60'>
                <Wallet className='h-5 w-5 text-emerald-700 dark:text-emerald-300' />
              </div>
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
              />
            </div>
          </div>

          {/* Metodo de pago */}
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

                const saldo = Number(selectedClientData?.saldo || 0);
                setPagosMixtos(
                  saldo > 0
                    ? [
                        {
                          metodo: 'prepago',
                          monto: saldo,
                          display: saldo.toLocaleString('es-CL')
                        }
                      ]
                    : []
                );
              }}
              label='METODO DE PAGO'
              placeholder='Seleccionar metodo de pago'
              required={true}
              className='w-full'
              showPrepago={!!selectedClientData}
              showMixto={true}
              disabledMethods={
                Number(selectedClientData?.saldo || 0) <= 0 ? ['prepago'] : []
              }
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

        {formData.metodo_pago === 'mixto' && (
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60'>
            <div className='mb-3 flex items-center gap-2'>
              <Split className='h-4 w-4 text-slate-700 dark:text-slate-200' />
              <p className='text-xs font-bold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200'>
                Distribucion de pagos
              </p>
            </div>

            <div className='space-y-3'>
              {pagosMixtos.map((pago, index) => (
                <div key={`${pago.metodo}-${index}`} className='flex items-center gap-2'>
                  <div className='w-28 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300'>
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
                        const monto = parseFormattedNumber(e.target.value);
                        setPagosMixtos(prev =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  monto,
                                  display: e.target.value.replace(/\D/g, '')
                                }
                              : item
                          )
                        );
                      }}
                      onBlur={() => {
                        setPagosMixtos(prev =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  display:
                                    item.monto > 0
                                      ? item.monto.toLocaleString('es-CL')
                                      : ''
                                }
                              : item
                          )
                        );
                      }}
                      className='w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-black focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400'
                    />
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      setPagosMixtos(prev => prev.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className='rounded-full px-3 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>

            <div className='mt-4 flex flex-wrap gap-2'>
              {(['efectivo', 'tarjeta', 'transferencia', 'prepago'] as const).map(metodo => {
                if (pagosMixtos.some(pago => pago.metodo === metodo)) return null;

                const sinSaldo = metodo === 'prepago' && Number(selectedClientData?.saldo || 0) <= 0;

                return (
                  <Button
                    key={metodo}
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={sinSaldo}
                    onClick={() =>
                      setPagosMixtos(prev => [
                        ...prev,
                        { metodo, monto: 0, display: '' }
                      ])
                    }
                    className='rounded-full uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                  >
                    {metodo}
                  </Button>
                );
              })}
            </div>

            <div className='mt-4 border-t border-slate-200 pt-3 text-sm dark:border-slate-800'>
              <div className='flex items-center justify-between text-slate-600 dark:text-slate-300'>
                <span>Suma actual</span>
                <span
                  className={
                    pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0) === total
                      ? 'font-bold text-emerald-600'
                      : 'font-bold text-red-500'
                  }
                >
                  {formatCurrencyCLP(pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0))}
                </span>
              </div>
              {pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0) !== total && (
                <p className='mt-1 text-xs text-red-500'>
                  Falta {formatCurrencyCLP(total - pagosMixtos.reduce((sum, pago) => sum + pago.monto, 0))}
                </p>
              )}
            </div>
          </div>
        )}


        {/* Total y boton centrados */}
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
            className='gap-2 rounded-full bg-black text-white font-bold hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2 w-full sm:w-auto'
          >
            <ShoppingCart className='w-3 h-3 sm:w-4 sm:h-4' />
            Generar Servicio
          </Button>
        </div>
      </div>

      {/* Modal de confirmacion */}
      {showConfirmModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 sm:p-8 shadow-lg max-w-md mx-4'>
            <h3 className='text-lg sm:text-xl font-bold text-gray-900 mb-2'>
              Confirmar creacion de servicio
            </h3>
            <p className='text-sm sm:text-base text-gray-600 mb-6'>
              Deseas crear el servicio y comenzar el tiempo?
            </p>
            <div className='flex gap-3 justify-center'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className='px-4 sm:px-6 py-2 text-sm sm:text-base rounded-full'
              >
                Cancelar
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={confirmAndSubmit}
                disabled={loading}
                className='gap-2 bg-black text-white hover:bg-gray-800 px-4 sm:px-6 py-2 text-sm sm:text-base rounded-full'
              >
                <ShoppingCart className='w-3 h-3 sm:w-4 sm:h-4' />
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
