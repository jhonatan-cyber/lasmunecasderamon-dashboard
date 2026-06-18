import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { appEventBus } from '@/lib/utils/eventBus';
import { useAnfitrionasDisponibles } from '@/hooks/personal';
import { useAvailableRooms } from '@/hooks/habitaciones';
import { useClients } from '@/hooks/clientes/useClients';
import { useRefreshOnFocus } from '@/hooks/shared';
import { formatCurrencyCLP, formatNumberCL } from '@/lib/utils/formatters';
import logger from '@/lib/utils/logger';

import {
  ORDER_FIELD_INPUT_WITH_ICON_CLASS,
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_FIELD_TRIGGER_CLASS
} from '@/components/orders/orderFieldStyles';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { CustomersSelect } from '@/components/shared/selects';
import { HostessSelect } from '@/components/shared/selects';
import { RoomSelect } from '@/components/shared/selects';

interface ServiceOrderFormProps {
  clientes: any[];
  anfitrionas: any[];
  searchCliente: string;
  setSearchCliente: (v: string) => void;
  searchAnfitriona: string;
  setSearchAnfitriona: (v: string) => void;
}

export default function ServiceOrderForm({ clientes }: ServiceOrderFormProps) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { anfitrionas: anfitrionasDisponiblesBase, getAnfitrionasDisponibles } =
    useAnfitrionasDisponibles();
  const { rooms: habitaciones, refetchRooms } = useAvailableRooms();
  const { allClients: clientesDB = [], fetchClients } = useClients();

  // Filtrar solo habitaciones disponibles (estado = 1)
  const habitacionesDisponibles = habitaciones?.filter(h => h.estado === 1 || h.status === 1) || [];

  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchCliente, setSearchCliente] = useState('');
  const [searchAnfitriona, setSearchAnfitriona] = useState('');
  const [anfitrionaDropdownOpen, setAnfitrionaDropdownOpen] = useState(false);
  const [anfitrionasOcupadas, setAnfitrionasOcupadas] = useState<number[]>([]);

  const [tempForm, setTempForm] = useState({
    precio_servicio: 0,
    precio_habitacion: 0,
    comision_anfitriona: 0,
    habitacion_id: undefined as string | undefined,
    anfitrionas_ids: [] as string[],
    clientes_ids: [] as string[], // Array para mÃºltiples clientes
    metodo_pago: 'efectivo',
    tiempo: 0
  });

  const [displayValues, setDisplayValues] = useState({
    precio_servicio: '',
    precio_habitacion: ''
  });

  // Estados para controlar quÃ© campos estÃ¡n habilitados
  const habitacionSeleccionada = Boolean(tempForm.habitacion_id);
  const tieneComision = tempForm.comision_anfitriona > 0;

  // REGLA: Limitar selecciÃ³n de anfitrionas y clientes segÃºn el total de 4 personas
  const maxAnfitrionasPermitidas = 3;
  const maxClientesPermitidos = 3;
  const maxTotalPersonas = 4;

  // Calcular lÃ­mites dinÃ¡micos
  const maxAnfitrionasSegunClientes =
    tempForm.comision_anfitriona > 0
      ? 3 // MÃ¡ximo 3 anfitrionas para habitaciones con comisiÃ³n
      : Math.max(0, maxTotalPersonas - tempForm.clientes_ids.length - 1); // MÃ¡ximo 3 anfitrionas si hay comisiÃ³n

  const maxClientesSegunAnfitrionas =
    tempForm.comision_anfitriona > 0
      ? 1 // MÃ¡ximo 1 cliente para habitaciones con comisiÃ³n
      : Math.max(0, maxTotalPersonas - tempForm.anfitrionas_ids.length);

  // Calcular lÃ­mites especÃ­ficos para combinaciones
  const maxAnfitrionasCon1Cliente =
    tempForm.comision_anfitriona > 0 && tempForm.clientes_ids.length === 1
      ? 3 // MÃ¡ximo 3 anfitrionas con 1 cliente
      : Math.max(0, maxTotalPersonas - 1); // MÃ¡ximo 3 anfitrionas con 1 cliente

  const maxClientesCon2Anfitrionas =
    tempForm.comision_anfitriona > 0 && tempForm.anfitrionas_ids.length === 2
      ? 2 // MÃ¡ximo 2 anfitrionas con 2 clientes
      : Math.max(0, maxTotalPersonas - 2); // MÃ¡ximo 2 anfitrionas con 2 clientes

  // Determinar lÃ­mite final segÃºn la combinaciÃ³n actual
  const maxAnfitrionasFinal =
    tempForm.comision_anfitriona > 0
      ? tempForm.clientes_ids.length === 0
        ? 3 // MÃ¡ximo 3 anfitrionas sin clientes
        : tempForm.clientes_ids.length === 1
          ? maxAnfitrionasCon1Cliente
          : tempForm.clientes_ids.length === 2
            ? maxClientesCon2Anfitrionas
            : maxClientesSegunAnfitrionas
      : maxAnfitrionasSegunClientes;

  const haAlcanzadoMaxAnfitrionas = tempForm.anfitrionas_ids.length >= maxAnfitrionasFinal;
  const haAlcanzadoMaxClientes = tempForm.clientes_ids.length >= maxClientesSegunAnfitrionas;

  const refreshLookupData = useCallback(async () => {
    await Promise.all([fetchClients(), getAnfitrionasDisponibles(), refetchRooms()]);
  }, [fetchClients, getAnfitrionasDisponibles, refetchRooms]);

  // Obtener anfitrionas que estÃ¡n en servicios activos
  useEffect(() => {
    const fetchAnfitrionasOcupadas = async () => {
      try {
        const response = await fetch('/api/servicios?estado=1');
        const data = await response.json();
        if (data.success) {
          const servicios = Array.isArray(data.data)
            ? data.data
            : Array.isArray(data.data?.data)
              ? data.data.data
              : [];
          const ocupadas: number[] = [];
          servicios.forEach((servicio: any) => {
            if (servicio.anfitrionas_ids && Array.isArray(servicio.anfitrionas_ids)) {
              ocupadas.push(...servicio.anfitrionas_ids);
            }
          });
          setAnfitrionasOcupadas([...new Set(ocupadas)]);
        }
      } catch (error) {
        logger.captureException(error, { context: 'ServiceOrderFormNew:submitOrder' });
      }
    };
    fetchAnfitrionasOcupadas();
  }, []);

  useRefreshOnFocus(refreshLookupData);

  // Filtrar anfitrionas disponibles (no ocupadas y no seleccionadas)
  const anfitrionasDisponibles =
    anfitrionasDisponiblesBase?.filter(a => {
      const id = String(a.id_usuario || a.id || '');
      return !anfitrionasOcupadas.includes(Number(id)) && !tempForm.anfitrionas_ids.includes(id);
    }) || [];

  const parseNumberFromDots = (value: string) => {
    if (!value || value.trim() === '') return 0;
    const cleanValue = value.replace(/[^\d]/g, '');
    if (cleanValue === '') return 0;
    const numValue = parseInt(cleanValue, 10);
    return isNaN(numValue) ? 0 : numValue;
  };

  const formatNumberWithDots = (value: number | string) => {
    if (!value || value === 0) return '';
    const numValue = typeof value === 'string' ? parseNumberFromDots(value) : value;
    if (isNaN(numValue) || numValue === 0) return '';
    return formatNumberCL(numValue);
  };

  const calculateIVA = (
    precioServicio: number,
    metodoPago: string,
    numAnfitrionas: number,
    precioHabitacion: number
  ) => {
    if (metodoPago === 'tarjeta') {
      let nuevoSubTotal = precioServicio * numAnfitrionas;
      let precioHabitacionTotal = precioHabitacion * numAnfitrionas;
      let nuevoIVA = Math.floor(nuevoSubTotal * 0.2);
      let nuevoTotal = nuevoSubTotal + precioHabitacionTotal + nuevoIVA;
      const totalRedondeado = Math.ceil(nuevoTotal / 5000) * 5000;
      const excedente = totalRedondeado - nuevoTotal;
      nuevoIVA = nuevoIVA + excedente;
      return nuevoIVA;
    }
    return 0;
  };

  const handleCreateOrder = async () => {
    if (!tempForm.habitacion_id) {
      showErrorToast('Selecciona una habitaciÃ³n');
      return;
    }

    if (tempForm.anfitrionas_ids.length === 0) {
      showErrorToast('Selecciona al menos una anfitriona');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/solicitudes-servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: tempForm.clientes_ids.length > 0 ? tempForm.clientes_ids[0] : null, // Si no hay clientes, manda null (cliente no registrado)
          clientes_ids: tempForm.clientes_ids.length > 0 ? tempForm.clientes_ids : [], // Array de clientes seleccionados
          habitacion_id: tempForm.habitacion_id,
          precio_servicio: tempForm.precio_servicio,
          precio_habitacion: tempForm.precio_habitacion,
          comision_anfitriona: tempForm.comision_anfitriona,
          anfitrionas_ids: tempForm.anfitrionas_ids,
          metodo_pago: tempForm.metodo_pago,
          tiempo: tempForm.tiempo,
          total: totalCalculado,
          iva: ivaCalculado
        })
      });

      const data = await response.json();

      if (data.success) {
        showSuccessToast(
          'Solicitud de servicio enviada exitosamente. Esperando aprobaciÃ³n de cajera.'
        );
        appEventBus.emit('updateServiceRequests');
        appEventBus.emit('refreshNotifications');
        setSelectedClienteId('');
        setTempForm({
          precio_servicio: 0,
          precio_habitacion: 0,
          comision_anfitriona: 0,
          habitacion_id: undefined,
          anfitrionas_ids: [],
          clientes_ids: [],
          metodo_pago: 'efectivo',
          tiempo: 30
        });
        setDisplayValues({ precio_servicio: '', precio_habitacion: '' });
        setTimeout(() => router.push('/orders'), 2000);
      } else {
        showErrorToast(data.message || 'Error al crear solicitud');
      }
    } catch (error) {
      showErrorToast('Error al crear solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular total en tiempo real
  const totalCalculado = useMemo(() => {
    const numAnfitrionas = tempForm.anfitrionas_ids.length;
    const numClientes = tempForm.clientes_ids.length;
    const tieneComision = tempForm.comision_anfitriona > 0;

    // Multiplicador por tiempo: si es 60 minutos, todo se duplica
    const multiplicador = tempForm.tiempo === 60 ? 2 : 1;

    // REGLA: Para habitaciones con comisiÃ³n
    if (tieneComision) {
      // REGLA: Para habitaciones con comisiÃ³n, NO multiplicar por nÃºmero de clientes ni anfitrionas
      // El precio es por habitaciÃ³n, no por persona
      const precioHabitacionTotal = tempForm.precio_habitacion * multiplicador;
      const precioServicioTotal = tempForm.precio_servicio * multiplicador;

      // IVA siempre es 0 para habitaciones con comisiÃ³n (incluso con tarjeta)
      return precioServicioTotal + precioHabitacionTotal;
    }

    // Si no hay anfitrionas, solo mostrar precio de habitaciÃ³n sin multiplicar
    if (numAnfitrionas === 0) {
      return tempForm.precio_habitacion * multiplicador;
    }

    // Precio de habitaciÃ³n se multiplica por nÃºmero de anfitrionas y por multiplicador de tiempo
    const precioHabitacionTotal = tempForm.precio_habitacion * numAnfitrionas * multiplicador;

    // Precio de servicio se multiplica por nÃºmero de anfitrionas y por multiplicador de tiempo
    const precioServicioTotal = tempForm.precio_servicio * numAnfitrionas * multiplicador;

    // IVA se calcula sobre los precios ya multiplicados por tiempo
    const ivaTotal = calculateIVA(
      tempForm.precio_servicio * multiplicador,
      tempForm.metodo_pago,
      numAnfitrionas,
      tempForm.precio_habitacion * multiplicador
    );

    return precioServicioTotal + precioHabitacionTotal + ivaTotal;
  }, [
    tempForm.precio_servicio,
    tempForm.precio_habitacion,
    tempForm.comision_anfitriona,
    tempForm.anfitrionas_ids.length,
    tempForm.clientes_ids.length,
    tempForm.tiempo,
    tempForm.metodo_pago
  ]);

  const ivaCalculado = useMemo(() => {
    const numAnfitrionas = tempForm.anfitrionas_ids.length;
    const multiplicador = tempForm.tiempo === 60 ? 2 : 1;
    const tieneComision = tempForm.comision_anfitriona > 0;

    // Para habitaciones con comisiÃ³n, IVA siempre es 0 (incluso con tarjeta)
    if (tieneComision) {
      return 0;
    }

    return calculateIVA(
      tempForm.precio_servicio * multiplicador,
      tempForm.metodo_pago,
      numAnfitrionas,
      tempForm.precio_habitacion * multiplicador
    );
  }, [
    tempForm.precio_servicio,
    tempForm.precio_habitacion,
    tempForm.comision_anfitriona,
    tempForm.anfitrionas_ids.length,
    tempForm.tiempo,
    tempForm.metodo_pago
  ]);
  return (
    <div className='space-y-6'>
      {/* Formulario compacto */}

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
        {/* HabitaciÃ³n */}
        <div>
          <RoomSelect
            habitaciones={habitacionesDisponibles}
            value={tempForm.habitacion_id ? String(tempForm.habitacion_id) : ''}
            onChange={(value: string) => {
              const habitacion = habitacionesDisponibles.find(
                h => String(h.id_habitacion || h.id || '') === value
              );

              setTempForm({
                ...tempForm,
                habitacion_id: value,
                precio_habitacion: habitacion?.precio || habitacion?.price || 0,
                comision_anfitriona: habitacion?.comision_anfitriona || 0,
                tiempo: habitacion?.tiempo || habitacion?.time || 0
              });
            }}
            label='HabitaciÃ³n'
            placeholder='Seleccione una habitaciÃ³n'
            searchPlaceholder='Buscar habitaciÃ³n...'
            required
            showTime
            showPrice
          />
        </div>

        {/* Anfitrionas */}
        <div>
          <HostessSelect
            anfitrionas={anfitrionasDisponibles}
            value={tempForm.anfitrionas_ids.map(id => id.toString())}
            onChange={(values: string[]) => setTempForm({ ...tempForm, anfitrionas_ids: values })}
            label='Anfitrionas'
            placeholder='Seleccionar anfitrionas'
            maxSelection={maxAnfitrionasSegunClientes}
            disabled={!habitacionSeleccionada}
          />
        </div>

        {/* Clientes */}
        <div>
          <CustomersSelect
            clientes={clientesDB || []}
            value={tempForm.clientes_ids.map(id => id.toString())}
            onChange={(values: string[]) => setTempForm({ ...tempForm, clientes_ids: values })}
            label='Clientes'
            placeholder='Seleccionar clientes'
            maxSelection={maxClientesSegunAnfitrionas}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Segunda fila */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
        {/* Precio de servicio */}
        <div>
          <Label className={ORDER_FIELD_LABEL_CLASS}>Precio de servicio</Label>
          <div className='relative'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400'>
              $
            </span>
            <Input
              type='text'
              value={displayValues.precio_servicio}
              onChange={e => {
                const parsed = parseNumberFromDots(e.target.value);
                setTempForm({ ...tempForm, precio_servicio: parsed });
                setDisplayValues({
                  ...displayValues,
                  precio_servicio: formatNumberWithDots(parsed)
                });
              }}
              className={ORDER_FIELD_INPUT_WITH_ICON_CLASS}
              placeholder='0'
            />
          </div>
        </div>

        {/* MÃ©todo de pago */}
        <div>
          <Label className={ORDER_FIELD_LABEL_CLASS}>MÃ©todo de pago*</Label>
          <Select
            value={tempForm.metodo_pago}
            onValueChange={(value: string) => setTempForm({ ...tempForm, metodo_pago: value })}
          >
            <SelectTrigger className={ORDER_FIELD_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={ORDER_FIELD_POPOVER_CLASS}>
              <SelectItem
                value='efectivo'
                className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              >
                Efectivo
              </SelectItem>
              <SelectItem
                value='tarjeta'
                className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              >
                Tarjeta
              </SelectItem>
              <SelectItem
                value='transferencia'
                className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              >
                Transferencia
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* IVA */}
        <div>
          <Label className={ORDER_FIELD_LABEL_CLASS}>
            Impuesto IVA ({tempForm.metodo_pago === 'tarjeta' ? '20%' : '0%'})
          </Label>
          <div className='relative'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400'>
              $
            </span>
            <Input
              type='text'
              value={formatNumberWithDots(
                calculateIVA(
                  tempForm.precio_servicio * (tempForm.tiempo === 60 ? 2 : 1),
                  tempForm.metodo_pago,
                  tempForm.anfitrionas_ids.length || 1,
                  tempForm.precio_habitacion * (tempForm.tiempo === 60 ? 2 : 1)
                )
              )}
              disabled
              className={`${ORDER_FIELD_INPUT_WITH_ICON_CLASS} opacity-60`}
              placeholder='0'
            />
          </div>
        </div>
      </div>

      {/* Total */}
      <div className='text-center mb-6'>
        <div className='text-gray-600 dark:text-gray-400 text-sm mb-2'>TOTAL</div>
        <div className='text-gray-900 dark:text-white text-5xl font-bold'>
          {formatCurrencyCLP(totalCalculado)}
        </div>
      </div>

      {/* BotÃ³n */}
      <div className='text-center'>
        <Button
          onClick={handleCreateOrder}
          disabled={
            !tempForm.habitacion_id ||
            tempForm.anfitrionas_ids.length === 0 ||
            !tempForm.metodo_pago ||
            isSubmitting
          }
          className='bg-black hover:bg-gray-900 text-white px-8 py-3 rounded-full'
          size='lg'
        >
          {isSubmitting ? 'Solicitando...' : 'Solicitar Servicio'}
        </Button>
      </div>
    </div>
  );
}
