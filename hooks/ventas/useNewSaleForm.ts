import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSales } from '@/hooks/caja/useSales';
import { useTimer } from '@/contexts/TimerContext';
import { VentaCreate } from '@/types/venta';
import logger from '@/lib/utils/logger';

export const useNewSaleForm = () => {
  const router = useRouter();
  const { createVenta } = useSales();
  const { startTimer } = useTimer();

  // persistence states
  const [selectedCliente, setSelectedCliente] = useState('none');
  const [selectedHabitacion, setSelectedHabitacion] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [enableTip, setEnableTip] = useState(false);

  // loading and metadata states
  const [selectedRoomInfo, setSelectedRoomInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchProducto, setSearchProducto] = useState('');
  const [manualTime, setManualTime] = useState<string>('30');
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});
  const [champagneHostessSelections, setChampagneHostessSelections] = useState<{
    [key: string]: string[];
  }>({});
  const [otherProductHostessSelections, setOtherProductHostessSelections] = useState<{
    [key: string]: string[];
  }>({});
  const [hostessSearchValues, setHostessSearchValues] = useState<{ [key: string]: string }>({});

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSelectedCliente(localStorage.getItem('selectedCliente') || 'none');
      setSelectedHabitacion(localStorage.getItem('selectedHabitacion') || '');
      setMetodoPago(localStorage.getItem('metodoPago') || '');
      const savedProds = localStorage.getItem('productos');
      if (savedProds) setProductos(JSON.parse(savedProds));
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCliente', selectedCliente);
      localStorage.setItem('selectedHabitacion', selectedHabitacion);
      localStorage.setItem('metodoPago', metodoPago);
      localStorage.setItem('productos', JSON.stringify(productos));
    }
  }, [selectedCliente, selectedHabitacion, metodoPago, productos]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedCliente');
        localStorage.removeItem('selectedHabitacion');
        localStorage.removeItem('metodoPago');
        localStorage.removeItem('productos');
        localStorage.removeItem('enableTip');
      }
    };
  }, []);

  const isChampagneProduct = (producto: any) => {
    const cat = (producto?.categoria || producto?.category || '').toLowerCase();
    return cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');
  };

  const hasChampagneProducts = useMemo(() => productos.some(isChampagneProduct), [productos]);

  const isHighValueProduct = (producto: any) => {
    const precio = Number(producto.precio ?? producto.price ?? 0);
    return precio >= 30000;
  };

  const hasHighValueProducts = useMemo(() => productos.some(isHighValueProduct), [productos]);
  const requiresRoom = hasChampagneProducts || hasHighValueProducts;

  const handleHabitacionChange = async (habitacionId: string) => {
    if (!habitacionId) {
      setSelectedHabitacion('');
      setSelectedRoomInfo(null);
      return;
    }
    try {
      const res = await fetch(`/api/rooms/${habitacionId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedRoomInfo(data.data);
        setSelectedHabitacion(habitacionId);
      }
    } catch (error) {
      logger.captureException(error, { context: 'useNewSaleForm:fetchRoomInfo' });
    }
  };

  const handleClearSearch = () => {
    setSearchProducto('');
    setSearchResults([]);
  };

  useEffect(() => {
    const term = searchProducto.trim();
    if (!term) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?term=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (data.success) setSearchResults(data.data);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [searchProducto]);

  const handleAddProducto = (producto: any) => {
    const id = producto.id || producto.id_producto;
    const cantidad = cantidades[id] || 1;
    const precio = producto.precio ?? producto.price ?? 0;

    const productoNormalizado = {
      ...producto,
      id,
      nombre: producto.nombre || producto.name || 'Sin nombre',
      precio,
      categoria:
        producto.categoria?.nombre ||
        producto.categoria ||
        producto.category?.nombre ||
        producto.category ||
        '',
      comision: producto.comision ?? producto.commission ?? 0,
      cantidad,
      subtotal: precio * cantidad,
      selectedHostesses: producto.selectedHostesses || [],
      isChampagne: producto.isChampagne || isChampagneProduct(producto)
    };

    const isMatch = (p: any) =>
      p.id === productoNormalizado.id &&
      JSON.stringify([...(p.selectedHostesses || [])].sort()) ===
        JSON.stringify([...(productoNormalizado.selectedHostesses || [])].sort());

    setProductos(prev => {
      const existing = prev.find(isMatch);
      if (existing) {
        return prev.map(p =>
          isMatch(p)
            ? { ...p, cantidad: p.cantidad + cantidad, subtotal: precio * (p.cantidad + cantidad) }
            : p
        );
      }
      return [...prev, productoNormalizado];
    });

    setCantidades(prev => ({ ...prev, [id]: 1 }));
    handleClearSearch();
  };

  const handleRemoveProducto = (index: number) => {
    setProductos(prev => prev.filter((_, i) => i !== index));
  };

  const handleCantidadChangeTable = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      handleRemoveProducto(index);
      return;
    }
    setProductos(prev =>
      prev.map((p, i) =>
        i === index
          ? { ...p, cantidad: nuevaCantidad, subtotal: (p.precio || 0) * nuevaCantidad }
          : p
      )
    );
  };

  const totals = useMemo(() => {
    const subtotal = productos.reduce((acc, p) => acc + (p?.subtotal || 0), 0);
    const propina = enableTip ? Math.round(subtotal * 0.1) : 0;
    return { subtotal, propina, total: subtotal + propina };
  }, [productos, enableTip]);

  const commissionTotal = useMemo(() => {
    return productos.reduce(
      (acc, p) => acc + Number(p?.comision || 0) * Number(p?.cantidad || 0),
      0
    );
  }, [productos]);

  const handleSubmit = async (clientes: any[], anfitrionas: any[]) => {
    if (!metodoPago || productos.length === 0) {
      toast.info('Completa todos los campos requeridos');
      return;
    }
    if (metodoPago === 'prepago') {
      const cliente = clientes.find(c => String(c.id || c.id_cliente) === String(selectedCliente));
      if (!cliente || (cliente.saldo || 0) < totals.total) {
        toast.error('Saldo insuficiente o cliente no seleccionado');
        return;
      }
    }
    for (const p of productos) {
      if ((p.comision || 0) > 0 && (!p.selectedHostesses || p.selectedHostesses.length === 0)) {
        toast.error(`Producto ${p.nombre} requiere asignar anfitriona`);
        return;
      }
    }

    setLoading(true);
    try {
      const todasAnf = Array.from(new Set(productos.flatMap(p => p.selectedHostesses || [])));
      const ventaData: VentaCreate = {
        cliente_id: selectedCliente !== 'none' ? selectedCliente : null,
        metodo_pago: metodoPago as 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago',
        propina: totals.propina,
        sub_total: totals.subtotal,
        total: totals.total,
        detalles: productos.map(p => {
          const selectedHostesses = Array.isArray(p.selectedHostesses) ? p.selectedHostesses : [];
          const normalizedDetail = {
            producto_id: p.id,
            precio: p.precio,
            comision: (p.comision || 0) * p.cantidad,
            cantidad: p.cantidad,
            sub_total: p.subtotal,
            isChampagne: Boolean(p.isChampagne)
          };

          if (selectedHostesses.length === 0) {
            return normalizedDetail;
          }

          if (p.isChampagne) {
            return {
              ...normalizedDetail,
              hostesses: selectedHostesses
            };
          }

          if (selectedHostesses.length === 1) {
            return {
              ...normalizedDetail,
              hostess_id: selectedHostesses[0]
            };
          }

          return {
            ...normalizedDetail,
            hostesses: selectedHostesses
          };
        }),
        usuarios: todasAnf,
        ...(selectedHabitacion && { habitacion_id: selectedHabitacion }),
        ...(selectedHabitacion && {
          tiempo: requiresRoom ? parseInt(manualTime) : selectedRoomInfo?.time || 60
        })
      };

      const res = await createVenta(ventaData);
      if (res && (res.success || res.data)) {
        const data = res.data || res;
        if (selectedHabitacion) {
          const duration = requiresRoom ? parseInt(manualTime) : selectedRoomInfo?.time || 60;

          // Validar solo datos de la habitación seleccionada
          const roomPrice = selectedRoomInfo?.precio ?? selectedRoomInfo?.price ?? 0;
          const roomTime = selectedRoomInfo?.tiempo ?? selectedRoomInfo?.time ?? 0;
          const roomCommission = selectedRoomInfo?.comision_anfitriona ?? 0;

          // Solo ocupar la habitación si NO es libre ingreso (precio > 0, tiempo > 0 y comisión > 0)
          const shouldOccupyRoom = roomPrice > 0 && roomTime > 0 && roomCommission > 0;

          // Iniciar timer si hay tiempo válido (independientemente de si se ocupa la habitación)
          if (duration > 0) {
            const anfNombres = todasAnf
              .map(
                id =>
                  anfitrionas.find(a => String(a.id || a.id_usuario) === id)?.nick || 'Anfitriona'
              )
              .join(', ');
            const cNombre =
              clientes.find(c => String(c.id || c.id_cliente) === String(selectedCliente))
                ?.nombre || 'General';
            startTimer(
              data.id || data.id_venta,
              selectedHabitacion as any,
              selectedRoomInfo?.name || 'Habitación',
              duration,
              data.codigo || 'V-' + Date.now(),
              cNombre,
              anfNombres,
              'venta'
            );
          }

          // Ocupar la habitación solo si la habitación tiene sus propios datos válidos
          if (shouldOccupyRoom) {
            await fetch(`/api/rooms/${selectedHabitacion}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'occupy' })
            });
          }
        }
        window.dispatchEvent(new CustomEvent('ventaRegistrada'));
        toast.success('Venta generada exitosamente');
        router.push('/sales');
      }
    } catch (error) {
      logger.captureException(error, { context: 'useNewSaleForm:createSale' });
      toast.error('Error al generar la venta');
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedCliente,
    setSelectedCliente,
    selectedHabitacion,
    setSelectedHabitacion,
    metodoPago,
    setMetodoPago,
    productos,
    setProductos,
    enableTip,
    setEnableTip,
    selectedRoomInfo,
    loading,
    searchProducto,
    setSearchProducto,
    manualTime,
    setManualTime,
    cantidades,
    setCantidades,
    champagneHostessSelections,
    setChampagneHostessSelections,
    otherProductHostessSelections,
    setOtherProductHostessSelections,
    hostessSearchValues,
    setHostessSearchValues,
    searchResults,
    searchLoading,
    handleHabitacionChange,
    handleClearSearch,
    handleAddProducto,
    handleRemoveProducto,
    handleCantidadChangeTable,
    totals,
    handleSubmit,
    requiresRoom,
    isChampagneProduct,
    commissionTotal
  };
};
