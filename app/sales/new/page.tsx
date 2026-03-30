/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search, Coins, ShoppingCart, Trash, Plus, Minus, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import HostessMultiSelect from '@/components/orders/HostessMultiSelect';
import IndividualHostessSelect from '@/components/shared/selects/IndividualHostessSelect';

import { useSales } from '@/hooks/caja/useSales';
import { toast } from 'sonner';
import { formatCurrencyCLP, formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import SaleProductModal from '@/components/sales/SaleProductModal';
import { useRef } from 'react';
import CustomerSelect from '@/components/shared/selects/CustomerSelect';
import CategoryCardList from '@/components/shared/CategoryCardList';
import RoomSelect from '@/components/shared/selects/RoomSelect';
import PaymentMethodSelect from '@/components/shared/selects/PaymentMethodSelect';
import { CajaStatusCheck } from '@/components/sales/CajaStatusCheck';
import { Checkbox } from '@/components/ui/checkbox';
import { useTimer } from '@/contexts/TimerContext';

export default function NewSale() {
  const router = useRouter();
  const { createVenta } = useSales();
  const { startTimer, getTimerByRoomId } = useTimer();

  // Estados del formulario
  const [selectedCliente, setSelectedCliente] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedCliente') || 'none';
    }
    return 'none';
  });
  const [selectedHabitacion, setSelectedHabitacion] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedHabitacion') || '';
    }
    return '';
  });
  const [metodoPago, setMetodoPago] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('metodoPago') || '';
    }
    return '';
  });
  const [enableTip, setEnableTip] = useState(false);

  // Log para depurar
  console.log('🔍 Estado enableTip:', enableTip);

  const [productos, setProductos] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('productos');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Limpiar enableTip del localStorage al montar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('enableTip');
    }
  }, []);

  // Estado para almacenar información de la habitación seleccionada
  const [selectedRoomInfo, setSelectedRoomInfo] = useState<any>(null);

  // Efecto para persistir cambios en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCliente', selectedCliente);
      localStorage.setItem('selectedHabitacion', selectedHabitacion);
      localStorage.setItem('metodoPago', metodoPago);
      localStorage.setItem('productos', JSON.stringify(productos));
    }
  }, [selectedCliente, selectedHabitacion, metodoPago, productos]);

  // Efecto para limpiar localStorage al montar el componente
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedCliente');
        localStorage.removeItem('selectedHabitacion');
        localStorage.removeItem('metodoPago');
        localStorage.removeItem('enableTip');
        localStorage.removeItem('productos');
      }
    };
  }, []);

  // Función para manejar el cambio de habitación
  const handleHabitacionChange = async (habitacionId: string) => {
    if (!habitacionId) {
      setSelectedHabitacion('');
      setSelectedRoomInfo(null);
      return;
    }

    try {
      // Obtener información de la habitación
      const res = await fetch(`/api/rooms/${habitacionId}`);
      const data = await res.json();

      if (data.success) {
        const roomInfo = data.data;
        setSelectedRoomInfo(roomInfo);
        setSelectedHabitacion(habitacionId);
        toast.success(`Habitación ${roomInfo.name} seleccionada`);
      } else {
        toast.error('Error al obtener información de la habitación');
      }
    } catch (error) {
      console.error('Error al manejar cambio de habitación:', error);
      toast.error('Error al procesar la selección de habitación');
    }
  };

  // Estados de búsqueda
  const [searchProducto, setSearchProducto] = useState('');

  // Estados de datos
  const [clientes, setClientes] = useState<any[]>([]);
  const [anfitrionas, setAnfitrionas] = useState<any[]>([]);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriasConProductos, setCategoriasConProductos] = useState<any[]>([]);
  const [productosDisponibles, setProductosDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasOpenCaja, setHasOpenCaja] = useState<boolean | null>(null);

  // Estados del modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<any>(null);
  const [productosCategoria, setProductosCategoria] = useState<any[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});

  // Estados para selección de anfitrionas por producto (NUEVO)
  const [champagneHostessSelections, setChampagneHostessSelections] = useState<{
    [key: string]: string[];
  }>({});
  const [otherProductHostessSelections, setOtherProductHostessSelections] = useState<{
    [key: string]: string[];
  }>({});
  const [hostessSearchValues, setHostessSearchValues] = useState<{ [key: string]: string }>({});

  // Estados de búsqueda en tiempo real
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Función para verificar si un producto es de champaña
  const isChampagneProduct = (producto: any) => {
    const categoria = (producto?.categoria || producto?.category || '').toLowerCase();
    return (
      categoria.includes('champaña') ||
      categoria.includes('shampaña') ||
      categoria.includes('champagne')
    );
  };

  // Buscar si hay algún producto de champaña (sin importar el precio)
  const hasChampagneProducts = Array.isArray(productos)
    ? productos.some(isChampagneProduct)
    : false;

  // Obtener el precio más alto de productos de champaña
  const maxChampagnePrice = Array.isArray(productos)
    ? Math.max(...productos.filter(isChampagneProduct).map(p => Number(p.precio ?? p.price ?? 0)))
    : 0;

  // Función para verificar si un producto es "Tragos arriba" con precio >= 30000
  const isTragosArribaProduct = (producto: any) => {
    const categoria = (producto?.categoria || producto?.category || '').toLowerCase();
    const precio = Number(producto.precio ?? producto.price ?? 0);
    // El usuario dijo "tagos arriba" (Tragos arriba) y precio >= 30000
    return categoria.includes('trago') && precio >= 30000;
  };

  // Buscar si hay algún producto de "Tragos arriba" >= 30000
  const hasTragosArriba = Array.isArray(productos) ? productos.some(isTragosArribaProduct) : false;

  // Determinar si se requiere o permite selección de habitación
  const requiresRoom = hasChampagneProducts || hasTragosArriba;

  // Estado para tiempo manual
  const [manualTime, setManualTime] = useState<string>('30');

  // Función para limpiar el filtro de búsqueda
  const handleClearSearch = () => {
    setSearchProducto('');
    setSearchResults([]);
    setSearchLoading(false);
  };

  // Función para cargar categorías con conteo de productos
  const loadCategoriasConProductos = async (categoriasData: any[]) => {
    const categoriasConConteo = categoriasData.map(cat => {
      // Usar total_products del endpoint o 0 si no existe
      const productCount = cat.total_products || 0;
      return {
        ...cat,
        productCount,
        // Asegurar que tenga los campos esperados por el componente
        id_categoria: cat.id,
        nombre: cat.name || cat.nombre,
        estado: cat.status
      };
    });
    setCategoriasConProductos(categoriasConConteo);
  };

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar clientes
        const resClientes = await fetch('/api/clients');
        const dataClientes = await resClientes.json();
        setClientes(dataClientes.data || []);

        // Cargar anfitrionas
        const resAnfitrionas = await fetch('/api/users?anfitrionas=1');
        const dataAnfitrionas = await resAnfitrionas.json();
        if (dataAnfitrionas.success) {
          setAnfitrionas(dataAnfitrionas.data);
        }

        // Cargar habitaciones
        const resHabitaciones = await fetch('/api/rooms');
        const dataHabitaciones = await resHabitaciones.json();
        if (dataHabitaciones.success) {
          setHabitaciones(dataHabitaciones.data);
        }

        // Cargar categorías
        const resCategorias = await fetch('/api/categories');
        const dataCategorias = await resCategorias.json();
        if (dataCategorias.success) {
          setCategorias(dataCategorias.data);
          // Cargar categorías con conteo de productos
          await loadCategoriasConProductos(dataCategorias.data);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
        toast.error('Error al cargar los datos iniciales');
      }
    };

    fetchData();
  }, []);

  // Búsqueda en tiempo real de productos
  useEffect(() => {
    if (!searchProducto) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?term=${encodeURIComponent(searchProducto)}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (data.success) setSearchResults(data.data);
        else setSearchResults([]);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [searchProducto]);

  // Filtrar datos
  const categoriasFiltradas = Array.isArray(categoriasConProductos)
    ? categoriasConProductos.filter(cat => cat?.estado === 1 && cat?.productCount > 1)
    : [];

  // Funciones para manejar productos
  const handleOpenCategoria = async (cat: any) => {
    setModalCategoria(cat);
    setModalOpen(true);
    setLoadingProductos(true);
    try {
      const res = await fetch(`/api/products?category_id=${cat.id_categoria || cat.id}`);
      const data = await res.json();
      if (data.success) setProductosCategoria(data.data);
      else setProductosCategoria([]);
    } catch {
      setProductosCategoria([]);
    } finally {
      setLoadingProductos(false);
    }
  };

  const handleCantidadChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    setCantidades(prev => ({ ...prev, [id]: isNaN(num) ? 1 : num }));
  };

  // Funciones para manejar selecciones de anfitrionas (NUEVO)
  const handleChampagneHostessChange = (productId: string, hostessIds: string[]) => {
    setChampagneHostessSelections(prev => ({
      ...prev,
      [productId]: hostessIds
    }));
  };

  const handleOtherProductHostessChange = (productId: string, hostessIds: string[]) => {
    setOtherProductHostessSelections(prev => ({
      ...prev,
      [productId]: hostessIds
    }));
  };

  const handleAddProducto = (producto: any) => {
    const cantidad = cantidades[producto?.id || producto?.id_producto] || 1;
    const nombre = producto.nombre || producto.name || 'Sin nombre';
    const precio = producto.precio ?? producto.price ?? 0;
    // Normaliza la categoría para todos los casos posibles
    const categoria =
      producto.categoria && typeof producto.categoria === 'string'
        ? producto.categoria
        : producto.categoria && producto.categoria.nombre
          ? producto.categoria.nombre
          : producto.category && typeof producto.category === 'string'
            ? producto.category
            : producto.category && producto.category.nombre
              ? producto.category.nombre
              : '';
    const subtotal = precio * cantidad;

    const productoNormalizado = {
      ...producto,
      id: producto.id || producto.id_producto, // Asegura que siempre haya 'id'
      nombre,
      precio,
      categoria,
      comision: producto.comision ?? producto.commission ?? 0, // Normaliza la comisión
      cantidad,
      subtotal,
      selectedHostesses: producto.selectedHostesses || [], // NUEVO: Anfitrionas seleccionadas
      isChampagne: producto.isChampagne || false // NUEVO: Si es champaña
    };

    // Función para comparar arrays de anfitrionas
    const areHostessesSame = (h1: string[], h2: string[]) => {
      if (h1.length !== h2.length) return false;
      const sorted1 = [...h1].sort();
      const sorted2 = [...h2].sort();
      return sorted1.every((val, index) => val === sorted2[index]);
    };

    const productoExistente = Array.isArray(productos)
      ? productos.find(
        p =>
          p?.id === productoNormalizado.id &&
          areHostessesSame(p?.selectedHostesses || [], productoNormalizado.selectedHostesses)
      )
      : null;

    if (productoExistente) {
      setProductos(prev =>
        Array.isArray(prev)
          ? prev.map(p =>
            p?.id === productoNormalizado.id &&
              areHostessesSame(p?.selectedHostesses || [], productoNormalizado.selectedHostesses)
              ? {
                ...p,
                cantidad: (p?.cantidad || 0) + cantidad,
                subtotal: precio * ((p?.cantidad || 0) + cantidad)
              }
              : p
          )
          : []
      );
    } else {
      setProductos(prev =>
        Array.isArray(prev) ? [...prev, productoNormalizado] : [productoNormalizado]
      );
    }
    setCantidades(prev => ({
      ...prev,
      [productoNormalizado.id]: 1
    }));

    // Limpiar selecciones del modal después de agregar (NUEVO)
    const productId = String(producto.id_producto || producto.id);
    setChampagneHostessSelections(prev => {
      const newState = { ...prev };
      delete newState[productId];
      return newState;
    });
    setOtherProductHostessSelections(prev => {
      const newState = { ...prev };
      delete newState[productId];
      return newState;
    });
  };

  const handleRemoveProducto = (index: number) => {
    setProductos(prev => {
      const newProductos = Array.isArray(prev) ? prev.filter((_, i) => i !== index) : [];

      // Si no quedan productos, limpiar selectores
      if (newProductos.length === 0) {
        setSelectedCliente('none');
        setMetodoPago('');
        setEnableTip(false);
      }

      return newProductos;
    });
  };

  const handleCantidadChangeTable = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      handleRemoveProducto(index);
      return;
    }

    setProductos(prev => {
      const newProductos = Array.isArray(prev)
        ? prev.map((p, i) =>
          i === index
            ? {
              ...p,
              cantidad: nuevaCantidad,
              subtotal: (p?.precio || p?.price || 0) * nuevaCantidad
            }
            : p
        )
        : [];

      // Si no quedan productos, limpiar selectores
      if (newProductos.length === 0) {
        setSelectedCliente('none');
        setMetodoPago('');
        setEnableTip(false);
      }

      return newProductos;
    });
  };

  // Calcular totales
  const subtotal = Array.isArray(productos)
    ? productos.reduce((acc, p) => acc + (p?.subtotal || 0), 0)
    : 0;

  // Calcular propina (10% del subtotal si está habilitada)
  const propina = enableTip ? Math.round(subtotal * 0.1) : 0;

  const total = subtotal + propina;

  // Generar venta
  const handleSubmit = async () => {
    if (!metodoPago || productos.length === 0) {
      toast.info('Completa todos los campos requeridos');
      return;
    }

    // Validar prepago
    if (metodoPago === 'prepago') {
      if (!selectedCliente || selectedCliente === 'none') {
        toast.error('Debes seleccionar un cliente para usar pago con Prepago');
        return;
      }

      const cliente = clientes.find(c => String(c.id || c.id_cliente) === String(selectedCliente));
      if (!cliente) {
        toast.error('Cliente no encontrado');
        return;
      }

      if ((cliente.saldo || 0) < total) {
        toast.error(
          `Saldo insuficiente. Saldo actual: $${(cliente.saldo || 0).toLocaleString('es-CL')}`
        );
        return;
      }
    }

    // Verificar que todas las bebidas con comisión tengan anfitrionas asignadas
    const bebidasConComision = productos.filter(p => (p.comision || p.commission || 0) > 0);

    for (const bebida of bebidasConComision) {
      if (!bebida.selectedHostesses || bebida.selectedHostesses.length === 0) {
        toast.error(
          `La bebida "${bebida.nombre || bebida.name}" debe tener al menos una anfitriona asignada`
        );
        return;
      }
    }

    setLoading(true);
    try {
      // Obtener todas las anfitrionas únicas de todos los productos
      const todasLasAnfitrionas = productos.flatMap(p => p.selectedHostesses || []);
      const anfitrionasUnicas = Array.from(new Set(todasLasAnfitrionas));

      // Calcular el total de comisiones
      const total_comision = Array.isArray(productos)
        ? productos.reduce((acc, p) => acc + (p?.comision || 0) * (p?.cantidad || 1), 0)
        : 0;

      const ventaData = {
        cliente_id: selectedCliente && selectedCliente !== 'none' ? selectedCliente : null,
        ...(selectedHabitacion && {
          habitacion_id: selectedHabitacion
        }),
        metodo_pago: metodoPago as 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago',
        propina: propina,
        sub_total: subtotal,
        total: total,
        total_comision: total_comision,
        detalles: Array.isArray(productos)
          ? productos.map(p => ({
            producto_id: p?.id,
            precio: p?.precio || 0,
            comision: (p?.comision || 0) * (p?.cantidad || 1),
            cantidad: p?.cantidad || 0,
            sub_total: p?.subtotal || 0,
            hostesses: p?.selectedHostesses || [],
            hostess_id:
              p?.selectedHostesses && p.selectedHostesses.length > 0
                ? p.selectedHostesses[0]
                : null
          }))
          : [],
        usuarios: anfitrionasUnicas,
        tiempo:
          selectedHabitacion && selectedRoomInfo
            ? requiresRoom
              ? parseInt(manualTime)
              : selectedRoomInfo.time || 60
            : 0
      };

      const resultado = await createVenta(ventaData);

      if (resultado && resultado.data) {
        // Registrar propina si hay un monto
        if (propina > 0) {
          if (!resultado.data.id_venta) {
            toast.error('Error: No se pudo obtener el ID de la venta para registrar la propina');
            return;
          }

          try {
            const resPropina = await fetch('/api/tips', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                venta_id: resultado.data.id_venta,
                monto: propina
              })
            });

            const dataPropina = await resPropina.json();

            if (dataPropina.success) {
              toast.success(
                `Propina de ${formatCurrencyCLP(propina)} registrada y distribuida entre ${dataPropina.data.usuarios_distribucion
                } usuarios`
              );
            } else {
              toast.error('Error al registrar la propina');
            }
          } catch (error) {
            console.error('Error al registrar propina:', error);
            toast.error('Error al registrar la propina.');
          }
        }

        if (selectedHabitacion && selectedRoomInfo) {
          try {
            const updateRes = await fetch(`/api/rooms/${selectedHabitacion}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ action: 'occupy' })
            });

            if (!updateRes.ok) {
              console.error('Error al actualizar estado de la habitación');
            }
          } catch (error) {
            console.error('Error al actualizar estado de la habitación:', error);
          }
        }

        // Iniciar temporizador si hay una habitación seleccionada
        if (selectedHabitacion && selectedRoomInfo) {
          // Usar tiempo manual si está definido para ventas especiales, sino el de la habitación
          const duration = requiresRoom ? parseInt(manualTime) : selectedRoomInfo.time || 60;

          // Obtener nombres de anfitrionas para el temporizador
          const nombresAnfitrionas = productos
            .flatMap(p => p.selectedHostesses || [])
            .map(hostessId => {
              const h = anfitrionas.find(a => String(a.id || a.id_usuario) === String(hostessId));
              return h?.nick || h?.nombre || h?.name || 'Anfitriona';
            })
            .filter((v, i, a) => a.indexOf(v) === i) // Únicas
            .join(', ');

          // Obtener nombre del cliente
          const clienteObj = clientes.find(
            c => String(c.id || c.id_cliente) === String(selectedCliente)
          );
          const clienteNombre = clienteObj
            ? clienteObj.nombre || clienteObj.name
            : 'cliente sin registrar';

          // Iniciar temporizador con la duración seleccionada
          startTimer(
            resultado.data?.id_venta || 0, // id_venta
            selectedHabitacion as any, // roomId (cast a any para evitar conflicto de tipos si es UUID)
            selectedRoomInfo.name, // roomName
            duration, // duration
            resultado.data?.codigo || `VENTA_${resultado.data?.id_venta || Date.now()}`, // servicioCode
            clienteNombre,
            nombresAnfitrionas,
            'venta' // tipoTransaccion
          );
          toast.success(
            `Temporizador iniciado para ${selectedRoomInfo.name} por ${duration} minutos`
          );
        }

        toast.success('Venta generada exitosamente');
        router.push('/sales');
      }
    } catch (error) {
      console.error('Error al crear venta:', error);
      toast.error('Error al generar la venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div>
          <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>
            Datos Ticket Venta
          </h2>
          <div className='uppercase text-xs tracking-widest text-gray-400 font-semibold mb-1'>
            Las muñecas de Ramón
          </div>
        </div>

        <Button
          variant='outline'
          className='rounded-full px-4 sm:px-6 bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
          onClick={() => router.back()}
        >
          <ArrowLeft className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
          Atrás
        </Button>
      </div>

      <div className='p-4 sm:p-6 lg:p-8 bg-white mx-4 sm:mx-6 lg:mx-8 space-y-4 sm:space-y-6 shadow-md rounded-xl'>
        {/* Verificación de estado de caja */}
        <CajaStatusCheck onStatusChange={setHasOpenCaja} />

        {/* Búsqueda de productos */}
        <div className='flex flex-col sm:flex-row items-center justify-center gap-2 mb-4'>
          <div className='relative w-full max-w-xs'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4' />
            <Input
              placeholder='Buscar Producto'
              value={searchProducto}
              onChange={e => setSearchProducto(e.target.value)}
              className='pl-10 pr-20 py-2 text-sm sm:text-base rounded-full'
              style={{ minWidth: 0 }}
            />
            <Button
              variant='outline'
              className='absolute bg-black text-white right-0 top-1/2 -translate-y-1/2 text-xs sm:text-sm rounded-full'
              style={{ zIndex: 2 }}
            >
              Buscar
            </Button>
          </div>
          {searchProducto && (
            <Button
              variant='outline'
              size='sm'
              className='rounded-full px-4 bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base'
              onClick={handleClearSearch}
            >
              <X className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
              Limpiar
            </Button>
          )}
        </div>

        {/* Tabla de resultados de búsqueda en tiempo real */}
        {searchProducto && (
          <div className='mb-4 sm:mb-6'>
            <div className='overflow-x-auto'>
              <table className='w-full border rounded-lg overflow-hidden text-xs sm:text-sm'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-2 sm:px-4 py-2 text-left'>PRODUCTO</th>
                    <th className='px-2 sm:px-4 py-2 text-left'>PRECIO</th>
                    <th className='px-2 sm:px-4 py-2 text-left'>COMISIÓN</th>
                    <th className='px-2 sm:px-4 py-2 text-left'>CATEGORÍA</th>
                    <th className='px-2 sm:px-4 py-2 text-center'>ANFITRIONA</th>
                    <th className='px-2 sm:px-4 py-2 text-center'>AGREGAR</th>
                  </tr>
                </thead>
                <tbody>
                  {searchLoading ? (
                    <tr>
                      <td colSpan={6} className='text-center py-4'>
                        Buscando...
                      </td>
                    </tr>
                  ) : searchResults.length === 0 ? (
                    <tr>
                      <td colSpan={6} className='text-center py-4 text-gray-400'>
                        No hay resultados
                      </td>
                    </tr>
                  ) : (
                    searchResults.map((producto, idx) => {
                      const id = String(producto.id_producto || producto.id);
                      const isChampagne = isChampagneProduct(producto);
                      const hasComm = (producto.comision || producto.commission || 0) > 0;

                      return (
                        <tr
                          key={producto.id_producto || `search-prod-${idx}`}
                          className='border-t hover:bg-gray-50'
                        >
                          <td className='px-4 py-2'>{producto.nombre}</td>
                          <td className='px-4 py-2'>{formatCurrencyNoDecimals(producto.precio)}</td>
                          <td className='px-4 py-2'>
                            {formatCurrencyNoDecimals(producto.comision || 0)}
                          </td>
                          <td className='px-4 py-2'>{producto.categoria}</td>
                          <td className='px-4 py-2 text-center'>
                            {hasComm ? (
                              isChampagne ? (
                                // Para champañas: usar HostessMultiSelect de shadcn/ui
                                <div className='space-y-1'>
                                  <div className='w-full'>
                                    <HostessMultiSelect
                                      anfitrionas={anfitrionas.filter(h => {
                                        const hostessId = String(h.id || h.id_usuario);
                                        const estado = h.estado || h.status;
                                        if (estado !== 1 && estado !== 2) return false;

                                        const currentSelection =
                                          champagneHostessSelections[id] || [];

                                        // Incluir si está en la selección actual
                                        if (currentSelection.includes(hostessId)) {
                                          return true;
                                        }

                                        // Excluir si está asignada a cualquier otro producto en el buscador
                                        const allSearchAssigned = [
                                          ...Object.values(champagneHostessSelections).flat(),
                                          ...Object.values(otherProductHostessSelections).flat()
                                        ];

                                        // Excluir si está asignada a productos ya en el carrito
                                        const cartAssigned = productos.flatMap(
                                          p => p.selectedHostesses || []
                                        );

                                        return (
                                          !allSearchAssigned.includes(hostessId) &&
                                          !cartAssigned.includes(hostessId)
                                        );
                                      })}
                                      value={champagneHostessSelections[id] || []}
                                      onChange={selectedIds => {
                                        // El componente ya maneja el límite internamente
                                        handleChampagneHostessChange(id, selectedIds);
                                      }}
                                      searchValue={hostessSearchValues[id] || ''}
                                      onSearchChange={searchValue => {
                                        setHostessSearchValues(prev => ({
                                          ...prev,
                                          [id]: searchValue
                                        }));
                                      }}
                                      maxSelection={(() => {
                                        const precio = Number(
                                          producto.precio || producto.price || 0
                                        );
                                        if (precio >= 240000) return 5;
                                        else if (precio >= 200000) return 4;
                                        else if (precio >= 140000) return 3;
                                        else if (precio >= 120000) return 2;
                                        return 1;
                                      })()}
                                    />
                                  </div>
                                </div>
                              ) : (
                                // Para otras bebidas con comisión: usar IndividualHostessSelect
                                <div className='space-y-1'>
                                  <IndividualHostessSelect
                                    anfitrionas={anfitrionas.filter(h => {
                                      const hostessId = String(h.id || h.id_usuario);
                                      const estado = h.estado || h.status;
                                      if (estado !== 1 && estado !== 2) return false;

                                      const currentSelection =
                                        otherProductHostessSelections[id] || [];

                                      // Incluir si está en la selección actual
                                      if (currentSelection.includes(hostessId)) {
                                        return true;
                                      }

                                      // Excluir si está asignada a cualquier otro producto en el buscador
                                      const allSearchAssigned = [
                                        ...Object.values(champagneHostessSelections).flat(),
                                        ...Object.values(otherProductHostessSelections).flat()
                                      ];

                                      // Excluir si está asignada a productos ya en el carrito
                                      const cartAssigned = productos.flatMap(
                                        p => p.selectedHostesses || []
                                      );

                                      return (
                                        !allSearchAssigned.includes(hostessId) &&
                                        !cartAssigned.includes(hostessId)
                                      );
                                    })}
                                    value={otherProductHostessSelections[id]?.[0] || ''}
                                    onChange={selectedValue => {
                                      handleOtherProductHostessChange(
                                        id,
                                        selectedValue ? [selectedValue] : []
                                      );
                                    }}
                                    placeholder={
                                      anfitrionas.length === 0
                                        ? 'No hay anfitrionas disponibles'
                                        : 'Seleccionar'
                                    }
                                    className='w-full'
                                  />
                                </div>
                              )
                            ) : (
                              <div className='text-xs text-gray-400'>Sin comisión</div>
                            )}
                          </td>
                          <td className='px-4 py-2 text-center'>
                            <Button
                              size='icon'
                              variant='ghost'
                              className='bg-black text-white dark:bg-white dark:text-black rounded-full hover:!bg-white hover:!text-black dark:hover:!bg-black dark:hover:!text-white hover:scale-105 transition-all duration-200'
                              onClick={() => {
                                // Agregar información de anfitriona seleccionada al producto
                                const productWithHostess = {
                                  ...producto,
                                  selectedHostesses: isChampagne
                                    ? champagneHostessSelections[id] || []
                                    : otherProductHostessSelections[id] || [],
                                  isChampagne: isChampagne
                                };
                                handleAddProducto(productWithHostess);
                              }}
                              disabled={
                                hasComm &&
                                ((isChampagne &&
                                  (!champagneHostessSelections[id] ||
                                    champagneHostessSelections[id].length === 0)) ||
                                  (!isChampagne &&
                                    (!otherProductHostessSelections[id] ||
                                      otherProductHostessSelections[id].length === 0)))
                              }
                            >
                              <Plus />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Categorías de productos */}
        <CategoryCardList
          categorias={categoriasConProductos}
          onSelect={handleOpenCategoria}
          center={true}
          filter={cat => cat?.estado === 1 && (cat?.productCount ?? 0) > 0}
        />

        {/* Formulario de datos */}
        <div className='grid grid-cols-4 gap-6'>
          {/* Cliente */}
          <CustomerSelect
            clientes={clientes}
            value={selectedCliente}
            onChange={setSelectedCliente}
            required={false}
            disabled={!Array.isArray(productos) || productos.length === 0}
          />

          {/* Mostrar selector de habitaciones solo si hay champaña o tragos arriba >= 30k */}
          {requiresRoom && (
            <>
              <RoomSelect
                habitaciones={habitaciones}
                value={selectedHabitacion}
                onChange={handleHabitacionChange}
                disabled={loading}
                placeholder='Seleccione una habitación'
                label='Habitación'
                showPrice={false}
                showTime={true}
              />

              {/* Selector de tiempo manual */}
              <div>
                <Label className='block text-xs font-medium text-gray-500 mb-1'>Tiempo (min)</Label>
                <Select
                  value={manualTime}
                  onValueChange={setManualTime}
                  disabled={loading || !selectedHabitacion}
                >
                  <SelectTrigger className='w-full rounded-full h-10'>
                    <SelectValue placeholder='Tiempo' />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, i) => 10 + i * 5).map(t => (
                      <SelectItem key={t} value={t.toString()}>
                        {t} minutos
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Método de pago */}
          <PaymentMethodSelect
            value={metodoPago}
            onChange={setMetodoPago}
            label='Método de pago'
            placeholder='Seleccione un método de pago'
            disabled={!Array.isArray(productos) || productos.length === 0}
            className='w-full'
          />

          {/* Propina */}
          <div>
            <Label className='block text-xs font-medium text-gray-500 mb-1'>
              <div className='flex items-center gap-2'>
                <Coins className='w-4 h-4' />
                Propina (10%)
              </div>
            </Label>
            <div className='flex items-center gap-2'>
              <div className='relative flex-1'>
                <Coins className='absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none h-4 w-4 text-gray-400' />
                <Input
                  type='text'
                  value={formatCurrencyNoDecimals(propina)}
                  readOnly
                  disabled
                  className='w-full pl-8 bg-gray-50'
                />
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='enable-tip'
                  checked={enableTip}
                  onCheckedChange={checked => {
                    console.log('✅ Checkbox cambiado a:', checked);
                    setEnableTip(checked === true);
                  }}
                  disabled={!Array.isArray(productos) || productos.length === 0}
                />
                <label
                  htmlFor='enable-tip'
                  className='text-xs text-gray-700 whitespace-nowrap cursor-pointer'
                >
                  Habilitar
                </label>
              </div>
            </div>
          </div>
        </div>

        {false && Array.isArray(productos) && productos.length > 0 && (
          <div className='w-full flex justify-center mt-2 mb-2'>
            <div
              className={`text-xs p-2 rounded-md max-w-xl w-full text-center ${hasChampagneProducts && maxChampagnePrice >= 120000
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : hasChampagneProducts
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                }`}
            >
              {hasChampagneProducts && maxChampagnePrice >= 240000
                ? `Champaña de ${formatCurrencyCLP(maxChampagnePrice)}: Puedes seleccionar hasta 7 anfitrionas. Las primeras 5 incluidas, la 6ta y 7ma suman ${formatCurrencyCLP(40000)} cada una.`
                : hasChampagneProducts && maxChampagnePrice >= 200000
                  ? `Champaña de ${formatCurrencyCLP(maxChampagnePrice)}: Puedes seleccionar hasta 6 anfitrionas. Las primeras 4 incluidas, la 5ta y 6ta suman ${formatCurrencyCLP(40000)} cada una.`
                  : hasChampagneProducts && maxChampagnePrice >= 140000
                    ? `Champaña de ${formatCurrencyCLP(maxChampagnePrice)}: Puedes seleccionar hasta 5 anfitrionas. Las primeras 3 incluidas, la 4ta y 5ta suman ${formatCurrencyCLP(40000)} cada una.`
                    : hasChampagneProducts && maxChampagnePrice >= 120000
                      ? `Champaña de ${formatCurrencyCLP(maxChampagnePrice)}: Puedes seleccionar hasta 4 anfitrionas. Las primeras 2 incluidas, la 3ra y 4ta suman ${formatCurrencyCLP(40000)} cada una.`
                      : hasChampagneProducts
                        ? 'Productos de champaña detectados: Puedes seleccionar hasta 5 anfitrionas'
                        : 'Productos sin champaña: Solo puedes seleccionar 1 anfitriona máximo'}
            </div>
          </div>
        )}

        {/* Total y botón generar */}
        <div className='flex flex-col items-center justify-center'>
          <div className='text-xs text-gray-400 font-semibold mb-1'>TOTAL</div>
          <div className='text-2xl font-bold text-gray-900 mb-2 text-center justify-center items-center'>
            {formatCurrencyNoDecimals(total)}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              !Array.isArray(productos) ||
              productos.length === 0 ||
              !metodoPago ||
              hasOpenCaja === false
            }
            className='rounded-full px-6 bg-black text-white hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <ShoppingCart className='mr-2' />
            {loading ? 'Generando...' : 'Generar Venta'}
          </Button>
        </div>

        {/* Tabla de productos */}
        <div className='mt-8'>
          <div className='text-center text-gray-400 text-sm mb-2'>Detalles Producto</div>
          <div className='border rounded-lg overflow-hidden'>
            <table className='w-full'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-4 py-2 text-center text-sm font-medium text-gray-700'>
                    PRODUCTO
                  </th>
                  <th className='px-4 py-2 text-center text-sm font-medium text-gray-700'>
                    CANTIDAD
                  </th>
                  <th className='px-4 py-2 text-center text-sm font-medium text-gray-700'>
                    PRECIO
                  </th>
                  <th className='px-4 py-2 text-center text-sm font-medium text-gray-700'>
                    COMISIÓN
                  </th>
                  <th className='px-4 py-2 text-center text-sm font-medium text-gray-700'>
                    ANFITRIONAS
                  </th>
                  <th className='px-4 py-2 text-center text-sm font-medium text-gray-700'>
                    SUB TOTAL
                  </th>
                  <th className='px-4 py-2 text-center text-sm font-medium text-gray-700'>
                    ELIMINAR
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(productos) &&
                  productos.map((producto, index) => (
                    <tr key={index} className='border-t'>
                      <td className='px-4 py-2 text-center'>
                        {producto.nombre}{' '}
                        <span className='text-xs text-gray-400 ml-2'>[{producto.categoria}]</span>
                      </td>
                      <td className='px-4 py-2 text-center'>
                        <div className='flex items-center justify-center gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => {
                              if (producto.cantidad > 1) {
                                handleCantidadChangeTable(index, producto.cantidad - 1);
                              }
                            }}
                            className='w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200'
                            disabled={producto.cantidad <= 1}
                          >
                            <Minus />
                          </Button>
                          <span className='w-8 text-center font-medium'>{producto.cantidad}</span>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => {
                              handleCantidadChangeTable(index, producto.cantidad + 1);
                            }}
                            className='w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200'
                          >
                            <Plus />
                          </Button>
                        </div>
                      </td>
                      <td className='px-4 py-2 text-center'>
                        {formatCurrencyNoDecimals(producto.precio)}
                      </td>
                      <td className='px-4 py-2 text-center'>
                        {formatCurrencyNoDecimals(producto.comision || producto.commission || 0)}
                      </td>
                      <td className='px-4 py-2 text-center'>
                        {producto.selectedHostesses && producto.selectedHostesses.length > 0 ? (
                          <div className='flex flex-wrap gap-1 justify-center'>
                            {producto.selectedHostesses.map((hostessId: string, idx: number) => {
                              const hostess = anfitrionas.find(
                                h => String(h.id || h.id_usuario) === hostessId
                              );
                              return (
                                <span
                                  key={idx}
                                  className='bg-pink-100 text-pink-700 rounded px-2 py-0.5 text-xs'
                                >
                                  {hostess?.nick || hostess?.nombre || hostess?.name || hostessId}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className='text-gray-400 text-xs'>Sin anfitrionas</span>
                        )}
                      </td>
                      <td className='px-4 py-2 text-center'>
                        {formatCurrencyNoDecimals(producto.subtotal)}
                      </td>
                      <td className='px-4 py-2 text-center'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleRemoveProducto(index)}
                          className='text-red-500 hover:!bg-red-100 hover:!text-red-600 dark:text-red-400 dark:hover:!bg-red-500/20 dark:hover:!text-red-300 rounded-full transition-all duration-200'
                        >
                          <Trash />
                        </Button>
                      </td>
                    </tr>
                  ))}
                {(!Array.isArray(productos) || productos.length === 0) && (
                  <tr>
                    <td colSpan={7} className='px-4 py-8 text-center text-gray-500'>
                      No hay productos agregados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de productos por categoría */}
      <SaleProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        loading={loadingProductos}
        productos={productosCategoria}
        cantidades={cantidades}
        handleCantidadChange={handleCantidadChange}
        handleAgregarProducto={handleAddProducto}
        categoria={modalCategoria}
        anfitrionas={anfitrionas}
        champagneHostessSelections={champagneHostessSelections}
        onChampagneHostessChange={handleChampagneHostessChange}
        otherProductHostessSelections={otherProductHostessSelections}
        onOtherProductHostessChange={handleOtherProductHostessChange}
        productosEnCarrito={productos}
      />
    </>
  );
}
