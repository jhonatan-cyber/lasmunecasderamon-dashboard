import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAnfitrionas } from '@/hooks/useAnfitrionas';
import { useHabitaciones } from '@/hooks/useHabitaciones';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';

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
  const { anfitrionas } = useAnfitrionas();
  const { habitaciones } = useHabitaciones();

  // Filtrar solo habitaciones disponibles (estado = 1)
  const habitacionesDisponibles = habitaciones?.filter(h => h.estado === 1 || h.status === 1) || [];

  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchHabitacion, setSearchHabitacion] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [searchAnfitriona, setSearchAnfitriona] = useState('');
  const [anfitrionaDropdownOpen, setAnfitrionaDropdownOpen] = useState(false);
  const [anfitrionasOcupadas, setAnfitrionasOcupadas] = useState<number[]>([]);

  const [tempForm, setTempForm] = useState({
    precio_servicio: 0,
    precio_habitacion: 0,
    habitacion_id: undefined as number | undefined,
    anfitrionas_ids: [] as number[],
    metodo_pago: 'efectivo',
    tiempo: 0
  });

  const [displayValues, setDisplayValues] = useState({
    precio_servicio: '',
    precio_habitacion: ''
  });

  // Obtener anfitrionas que están en servicios activos
  useState(() => {
    const fetchAnfitrionasOcupadas = async () => {
      try {
        const response = await fetch('/api/servicios?estado=1');
        const data = await response.json();
        if (data.success) {
          const ocupadas: number[] = [];
          data.data.forEach((servicio: any) => {
            if (servicio.anfitrionas_ids && Array.isArray(servicio.anfitrionas_ids)) {
              ocupadas.push(...servicio.anfitrionas_ids);
            }
          });
          setAnfitrionasOcupadas([...new Set(ocupadas)]);
        }
      } catch (error) {
        console.error('Error al obtener anfitrionas ocupadas:', error);
      }
    };
    fetchAnfitrionasOcupadas();
  });

  // Filtrar anfitrionas disponibles (no ocupadas y no seleccionadas)
  const anfitrionasDisponibles =
    anfitrionas?.filter(a => {
      const id = a.id_usuario || a.id;
      return (
        !anfitrionasOcupadas.includes(id as number) &&
        !tempForm.anfitrionas_ids.includes(id as number)
      );
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
    return numValue.toLocaleString('es-CL');
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
    if (tempForm.precio_servicio <= 0) {
      showErrorToast('El precio del servicio debe ser mayor a 0');
      return;
    }

    if (!tempForm.habitacion_id || tempForm.habitacion_id === 0) {
      showErrorToast('Selecciona una habitación');
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
          cliente_id: selectedClienteId || null,
          habitacion_id: tempForm.habitacion_id,
          precio_servicio: tempForm.precio_servicio,
          precio_habitacion: tempForm.precio_habitacion,
          anfitrionas_ids: tempForm.anfitrionas_ids,
          metodo_pago: tempForm.metodo_pago,
          tiempo: tempForm.tiempo,
          total: totalCalculado,
          iva: ivaCalculado
        })
      });

      const data = await response.json();

      if (data.success) {
        showSuccessToast('Solicitud de servicio enviada exitosamente. Esperando aprobación de cajera.');
        window.dispatchEvent(new CustomEvent('updateServiceRequests'));
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
        setSelectedClienteId('');
        setTempForm({
          precio_servicio: 0,
          precio_habitacion: 0,
          habitacion_id: 0,
          anfitrionas_ids: [],
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
    
    // Multiplicador por tiempo: si es 60 minutos, todo se duplica
    const multiplicador = tempForm.tiempo === 60 ? 2 : 1;
    
    // Si no hay anfitrionas, solo mostrar precio de habitación sin multiplicar
    if (numAnfitrionas === 0) {
      return tempForm.precio_habitacion * multiplicador;
    }
    
    // Precio de habitación se multiplica por número de anfitrionas y por multiplicador de tiempo
    const precioHabitacionTotal = tempForm.precio_habitacion * numAnfitrionas * multiplicador;
    
    // Precio de servicio se multiplica por número de anfitrionas y por multiplicador de tiempo
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
    tempForm.anfitrionas_ids.length,
    tempForm.tiempo,
    tempForm.metodo_pago
  ]);

  const ivaCalculado = useMemo(() => {
    const numAnfitrionas = tempForm.anfitrionas_ids.length;
    const multiplicador = tempForm.tiempo === 60 ? 2 : 1;
    return calculateIVA(
      tempForm.precio_servicio * multiplicador,
      tempForm.metodo_pago,
      numAnfitrionas,
      tempForm.precio_habitacion * multiplicador
    );
  }, [
    tempForm.precio_servicio,
    tempForm.precio_habitacion,
    tempForm.anfitrionas_ids.length,
    tempForm.tiempo,
    tempForm.metodo_pago
  ]);
  return (
    <div className='space-y-6'>
      {/* Formulario compacto */}

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
        {/* Habitación */}
        <div>
          <Label className='text-gray-600 dark:text-gray-400 text-sm mb-2 block'>Habitación*</Label>
          <Select
            value={tempForm.habitacion_id ? String(tempForm.habitacion_id) : ''}
            onValueChange={value => {
              const habitacionId = parseInt(value, 10);
              const habitacion = habitacionesDisponibles.find(
                h => (h.id_habitacion || h.id) === habitacionId
              );
              setTempForm({
                ...tempForm,
                habitacion_id: habitacionId,
                precio_habitacion: habitacion?.precio || habitacion?.price || 0,
                tiempo: habitacion?.tiempo || habitacion?.time || 0
              });
            }}
          >
            <SelectTrigger className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full'>
              <SelectValue placeholder='Seleccione una habitación' />
            </SelectTrigger>
            <SelectContent className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700'>
              <div className='p-2'>
                <Input
                  placeholder='Buscar habitación...'
                  value={searchHabitacion}
                  onChange={e => setSearchHabitacion(e.target.value)}
                  className='bg-gray-100 dark:bg-[#1a1a1a] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white mb-2'
                  onClick={e => e.stopPropagation()}
                />
              </div>
              {habitacionesDisponibles && habitacionesDisponibles.length > 0 ? (
                habitacionesDisponibles
                  .filter(h => {
                    const nombre = (h.nombre || h.name || '').toLowerCase();
                    return nombre.includes(searchHabitacion.toLowerCase());
                  })
                  .map(h => (
                    <SelectItem
                      key={h.id_habitacion || h.id}
                      value={String(h.id_habitacion || h.id)}
                      className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    >
                      <div className='flex flex-col'>
                        <span className='font-semibold'>{h.nombre || h.name}</span>
                        <span className='text-xs text-gray-500 dark:text-gray-400'>
                          Precio: ${(h.precio || h.price || 0).toLocaleString('es-CL')} | Tiempo:{' '}
                          {h.tiempo || h.time || 0} min
                        </span>
                      </div>
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value='0' disabled className='text-gray-500'>
                  No hay habitaciones disponibles
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Anfitrionas */}
        <div>
          <Label className='text-gray-600 dark:text-gray-400 text-sm mb-2 block'>
            Anfitrionas*
          </Label>
          <Popover open={anfitrionaDropdownOpen} onOpenChange={setAnfitrionaDropdownOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                role='combobox'
                aria-expanded={anfitrionaDropdownOpen}
                className='w-full bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#3a3a3a] hover:text-gray-900 dark:hover:text-white rounded-full justify-between'
              >
                Seleccionar anfitrionas
                <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className='w-full bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700 p-0'
              align='start'
            >
              <div className='p-2 border-b border-gray-200 dark:border-gray-700'>
                <Input
                  placeholder='Buscar anfitriona...'
                  value={searchAnfitriona}
                  onChange={e => setSearchAnfitriona(e.target.value)}
                  className='bg-gray-100 dark:bg-[#1a1a1a] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                />
              </div>
              <div className='max-h-60 overflow-y-auto p-2'>
                {anfitrionasDisponibles && anfitrionasDisponibles.length > 0 ? (
                  anfitrionasDisponibles
                    .filter(a => {
                      const nick = (a.nick || '').toLowerCase();
                      const nombre = (a.nombre || a.name || '').toLowerCase();
                      const searchLower = searchAnfitriona.toLowerCase();
                      return nick.includes(searchLower) || nombre.includes(searchLower);
                    })
                    .map(a => {
                      const id = (a.id_usuario || a.id) as number;
                      const isSelected = tempForm.anfitrionas_ids.includes(id);
                      return (
                        <div
                          key={id}
                          className='flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer'
                          onClick={() => {
                            if (!isSelected) {
                              setTempForm(prev => ({
                                ...prev,
                                anfitrionas_ids: [...prev.anfitrionas_ids, id]
                              }));
                            }
                          }}
                        >
                          <Checkbox
                            id={`anf-${id}`}
                            checked={isSelected}
                            className='border-gray-500'
                          />
                          <label
                            htmlFor={`anf-${id}`}
                            className='text-gray-900 dark:text-white text-sm cursor-pointer flex-1'
                          >
                            {a.nick || a.nombre || a.name}
                          </label>
                        </div>
                      );
                    })
                ) : (
                  <div className='text-gray-500 text-sm p-2'>No hay anfitrionas disponibles</div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {tempForm.anfitrionas_ids.length > 0 && (
            <div className='mt-2 flex flex-wrap gap-2'>
              {tempForm.anfitrionas_ids.map(id => {
                const anf = anfitrionas.find(a => (a.id_usuario || a.id) === id);
                return (
                  <span
                    key={id}
                    className='bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1'
                  >
                    {anf?.nick || anf?.nombre || anf?.name}
                    <button
                      onClick={() =>
                        setTempForm(prev => ({
                          ...prev,
                          anfitrionas_ids: prev.anfitrionas_ids.filter(aid => aid !== id)
                        }))
                      }
                      className='hover:text-red-300'
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Clientes */}
        <div>
          <Label className='text-gray-600 dark:text-gray-400 text-sm mb-2 block'>
            Clientes (Opcional)
          </Label>
          <Select value={selectedClienteId} onValueChange={setSelectedClienteId}>
            <SelectTrigger className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full'>
              <SelectValue placeholder='Seleccionar cliente(s)' />
            </SelectTrigger>
            <SelectContent className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700'>
              <div className='p-2'>
                <Input
                  placeholder='Buscar cliente...'
                  value={searchCliente}
                  onChange={e => setSearchCliente(e.target.value)}
                  className='bg-gray-100 dark:bg-[#1a1a1a] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white mb-2'
                  onClick={e => e.stopPropagation()}
                />
              </div>
              {clientes && clientes.length > 0 ? (
                clientes
                  .filter(cliente => {
                    const nombre = (cliente.nombre || cliente.name || '').toLowerCase();
                    const apellido = (cliente.apellido || cliente.lastName || '').toLowerCase();
                    const run = (cliente.run || '').toLowerCase();
                    const searchLower = searchCliente.toLowerCase();
                    return (
                      nombre.includes(searchLower) ||
                      apellido.includes(searchLower) ||
                      run.includes(searchLower)
                    );
                  })
                  .map(cliente => (
                    <SelectItem
                      key={cliente.id_cliente || cliente.id}
                      value={String(cliente.id_cliente || cliente.id)}
                      className='text-white hover:bg-gray-700'
                    >
                      <div className='flex flex-col'>
                        <span className='font-semibold'>
                          {`${cliente.nombre || cliente.name || ''} ${cliente.apellido || cliente.lastName || ''}`.trim()}
                        </span>
                        {cliente.run && (
                          <span className='text-xs text-gray-400'>RUN: {cliente.run}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value='0' disabled className='text-gray-500'>
                  No hay clientes
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Segunda fila */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
        {/* Precio de servicio */}
        <div>
          <Label className='text-gray-600 dark:text-gray-400 text-sm mb-2 block'>
            Precio de servicio
          </Label>
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
              className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white pl-8 rounded-full'
              placeholder='0'
            />
          </div>
        </div>

        {/* Método de pago */}
        <div>
          <Label className='text-gray-600 dark:text-gray-400 text-sm mb-2 block'>
            Método de pago*
          </Label>
          <Select
            value={tempForm.metodo_pago}
            onValueChange={value => setTempForm({ ...tempForm, metodo_pago: value })}
          >
            <SelectTrigger className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700'>
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
          <Label className='text-gray-600 dark:text-gray-400 text-sm mb-2 block'>
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
              className='bg-gray-100 dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white pl-8 opacity-60 rounded-full'
              placeholder='0'
            />
          </div>
        </div>
      </div>

      {/* Total */}
      <div className='text-center mb-6'>
        <div className='text-gray-600 dark:text-gray-400 text-sm mb-2'>TOTAL</div>
        <div className='text-gray-900 dark:text-white text-5xl font-bold'>
          ${formatNumberWithDots(totalCalculado) || '0'}
        </div>
      </div>

      {/* Botón */}
      <div className='text-center'>
        <Button
          onClick={handleCreateOrder}
          disabled={
            tempForm.precio_servicio <= 0 ||
            !tempForm.habitacion_id ||
            tempForm.habitacion_id === 0 ||
            tempForm.anfitrionas_ids.length === 0 ||
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
