'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSales } from '@/hooks/caja/useSales';
import { useTimer } from '@/contexts/TimerContext';
import { VentaCreate } from '@/types/venta';
import logger from '@/lib/utils/logger';
import { isChampagneProduct } from '@/components/orders/productModalRules';
import { setServiceLevels, roomRequiredForPrice } from '@/components/orders/productModalRules';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { calcularPropina, calcularTotalVenta } from '@/lib/business/saleTotals';
import { mapForSaleToCartItem } from '@/lib/sales/forSaleMapper';
import {
  CHAMPAGNE_DEFAULT_TIERS,
  champagneTierFor,
  type ChampagneTier
} from '@/lib/business/champagne';

export interface SaleFormState {
  selectedCliente: string;
  setSelectedCliente: (v: string) => void;
  selectedHabitacion: string;
  setSelectedHabitacion: (v: string) => void;
  metodoPago: string;
  setMetodoPago: (v: string) => void;
  productos: any[];
  setProductos: React.Dispatch<React.SetStateAction<any[]>>;
  enableTip: boolean;
  setEnableTip: (v: boolean) => void;
  selectedRoomInfo: any;
  loading: boolean;
  searchProducto: string;
  setSearchProducto: (v: string) => void;
  manualTime: string;
  setManualTime: (v: string) => void;
  cantidades: { [key: string]: number };
  setCantidades: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
  searchResults: any[];
  searchLoading: boolean;
  totals: { subtotal: number; propina: number; total: number };
  commissionTotal: number;
  requiresRoom: boolean;
  isChampagne: (producto: any) => boolean;
}

interface UseSaleValidationParams {
  onClearSearch: () => void;
}

interface UseSaleValidationReturn {
  formState: SaleFormState;
  handleHabitacionChange: (habitacionId: string) => Promise<void>;
  handleClearSearch: () => void;
  handleAddProducto: (producto: any) => void;
  handleRemoveProducto: (index: number) => void;
  handleCantidadChangeTable: (index: number, nuevaCantidad: number) => void;
  handleSubmit: (clientes: any[], anfitrionas: any[]) => Promise<void>;
  getChampagneMax: (producto: any) => Promise<number>;
}

export function useSaleValidation({
  onClearSearch
}: UseSaleValidationParams): UseSaleValidationReturn {
  const router = useRouter();
  const { createVenta } = useSales();
  const { startTimer } = useTimer();

  // ── Form state ──────────────────────────────────────────────────────
  const [selectedCliente, setSelectedCliente] = useState('none');
  const [selectedHabitacion, setSelectedHabitacion] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [enableTip, setEnableTip] = useState(false);
  const [selectedRoomInfo, setSelectedRoomInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchProducto, setSearchProducto] = useState('');
  const [manualTime, setManualTime] = useState<string>('30');
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // ── Derived product rules ───────────────────────────────────────────
  const configSimpleHasta = useConfigValue('comisiones', 'umbral_simple_hasta', 10000);
  const configHostessDesde = useConfigValue('comisiones', 'umbral_anfitriona_desde', 20000);
  const configHabitacionDesde = useConfigValue('comisiones', 'umbral_habitacion_desde', 30000);

  useEffect(() => {
    setServiceLevels({
      simpleHasta: Number(configSimpleHasta),
      hostessDesde: Number(configHostessDesde),
      habitacionDesde: Number(configHabitacionDesde)
    });
  }, [configSimpleHasta, configHostessDesde, configHabitacionDesde]);

  const hasChampagneProducts = useMemo(() => productos.some(isChampagneProduct), [productos]);
  const requiresRoom =
    hasChampagneProducts || productos.some(p => roomRequiredForPrice(p.precio ?? p.price));

  // ── localStorage persistence ────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSelectedCliente(localStorage.getItem('selectedCliente') || 'none');
      setSelectedHabitacion(localStorage.getItem('selectedHabitacion') || '');
      setMetodoPago(localStorage.getItem('metodoPago') || '');
      const savedProds = localStorage.getItem('productos');
      if (savedProds) setProductos(JSON.parse(savedProds));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCliente', selectedCliente);
      localStorage.setItem('selectedHabitacion', selectedHabitacion);
      localStorage.setItem('metodoPago', metodoPago);
      localStorage.setItem('productos', JSON.stringify(productos));
    }
  }, [selectedCliente, selectedHabitacion, metodoPago, productos]);

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

  // ── Room info fetch ─────────────────────────────────────────────────
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
      logger.captureException(error, { context: 'useSaleValidation:fetchRoomInfo' });
    }
  };

  // ── Product search (solo bar: presentaciones con stock) ────────────────
  const handleClearSearch = () => {
    setSearchProducto('');
    setSearchResults([]);
    onClearSearch();
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
        const res = await fetch(`/api/products?for_sale=1&term=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setSearchResults(data.data.map(mapForSaleToCartItem));
        }
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [searchProducto]);

  // ── Champagne tiers (precio según Nº anfitrionas) ──────────────────────
  const champagneTiersCache = useRef<Record<string, ChampagneTier[]>>({});

  const fetchChampagneTiers = async (productoId: string): Promise<ChampagneTier[]> => {
    const pid = String(productoId);
    if (champagneTiersCache.current[pid]) return champagneTiersCache.current[pid];
    try {
      const res = await fetch(`/api/products/${pid}/tiers`);
      const data = await res.json().catch(() => ({}));
      const tiers =
        data.success && Array.isArray(data.data) && data.data.length > 0
          ? data.data
          : CHAMPAGNE_DEFAULT_TIERS;
      champagneTiersCache.current[pid] = tiers;
      return tiers;
    } catch {
      return CHAMPAGNE_DEFAULT_TIERS;
    }
  };

  const getChampagneMax = async (producto: any): Promise<number> => {
    const pid = String(producto.producto_id || producto.id_producto || producto.id);
    const tiers = await fetchChampagneTiers(pid);
    return Math.max(...tiers.map(t => t.anfitrionas), 1);
  };

  // ── Product cart handlers ───────────────────────────────────────────
  const handleAddProducto = async (producto: any) => {
    const id = producto.id || producto.id_producto;
    const hostessIds = (producto.selectedHostesses || []).map((h: number) => Number(h));
    let precio = producto.precio ?? producto.price ?? 0;
    let comision = producto.comision ?? producto.commission ?? 0;
    if (isChampagneProduct(producto) && hostessIds.length > 0) {
      const pid = String(producto.producto_id || producto.id_producto || producto.id);
      const tiers = await fetchChampagneTiers(pid);
      const tier = champagneTierFor(hostessIds.length, tiers);
      precio = tier.precio;
      comision = tier.comision;
    }
    // Un shot no gasta una botella: se sirve de la botella abierta (ml), así que el
    // tope de unidades en bar solo aplica a la venta de botella completa.
    const tipoVenta = producto.tipo_venta === 'shot' ? 'shot' : 'botella';
    let cantidad = cantidades[id] || 1;
    if (
      tipoVenta !== 'shot' &&
      producto.stock_bar !== undefined &&
      producto.stock_bar !== null &&
      cantidad > producto.stock_bar
    ) {
      toast.warning(`Stock máximo en bar: ${producto.stock_bar}`);
      cantidad = Math.max(1, producto.stock_bar);
    }

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
      comision,
      cantidad,
      subtotal: precio * cantidad,
      tipo_venta: tipoVenta,
      selectedHostesses: hostessIds,
      isChampagne: producto.isChampagne || isChampagneProduct(producto)
    };

    const isMatch = (p: any) =>
      p.id === productoNormalizado.id &&
      (p.tipo_venta === 'shot' ? 'shot' : 'botella') === tipoVenta &&
      (p.presentacion_id || null) === (productoNormalizado.presentacion_id || null) &&
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
    setProductos(prev => {
      const actual = prev[index];
      const tope = actual?.tipo_venta === 'shot' ? 99 : actual?.stock_bar;
      let final = nuevaCantidad;
      if (tope !== undefined && tope !== null && nuevaCantidad > tope) {
        toast.warning(`Stock máximo en bar: ${tope}`);
        final = tope;
      }
      return prev.map((p, i) =>
        i === index ? { ...p, cantidad: final, subtotal: (p.precio || 0) * final } : p
      );
    });
  };

  // ── Derived values ──────────────────────────────────────────────────
  const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));
  const totals = useMemo(() => {
    const subtotal = productos.reduce((acc, p) => acc + (p?.subtotal || 0), 0);
    const propina = calcularPropina(subtotal, propinaPct, enableTip);
    const total = calcularTotalVenta({ subtotal, propina });
    return { subtotal, propina, total };
  }, [productos, enableTip, propinaPct]);

  const commissionTotal = useMemo(() => {
    return productos.reduce(
      (acc, p) => acc + Number(p?.comision || 0) * Number(p?.cantidad || 0),
      0
    );
  }, [productos]);

  // ── Submit handler ──────────────────────────────────────────────────
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
          const selectedHostesses = Array.isArray(p.selectedHostesses)
            ? p.selectedHostesses.map((h: number) => Number(h))
            : [];
          const normalizedDetail = {
            producto_id: p.producto_id || p.id,
            presentacion_id: p.presentacion_id || null,
            ...(p.tipo_venta === 'shot' ? { tipo_venta: 'shot' as const } : {}),
            precio: p.precio,
            comision: (p.comision || 0) * p.cantidad,
            cantidad: p.cantidad,
            sub_total: p.subtotal,
            isChampagne: Boolean(p.isChampagne)
          };

          if (selectedHostesses.length === 0) return normalizedDetail;
          if (p.isChampagne) return { ...normalizedDetail, hostesses: selectedHostesses };
          if (selectedHostesses.length === 1)
            return { ...normalizedDetail, hostess_id: selectedHostesses[0] };
          return { ...normalizedDetail, hostesses: selectedHostesses };
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
          const roomPrice = selectedRoomInfo?.precio ?? selectedRoomInfo?.price ?? 0;
          const roomTime = selectedRoomInfo?.tiempo ?? selectedRoomInfo?.time ?? 0;
          const roomCommission = selectedRoomInfo?.comision_anfitriona ?? 0;
          const shouldOccupyRoom = roomPrice > 0 && roomTime > 0 && roomCommission > 0;

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
      logger.captureException(error, { context: 'useSaleValidation:createSale' });
      toast.error('Error al generar la venta');
    } finally {
      setLoading(false);
    }
  };

  return {
    formState: {
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
      searchResults,
      searchLoading,
      totals,
      commissionTotal,
      requiresRoom,
      isChampagne: isChampagneProduct
    },
    handleHabitacionChange,
    handleClearSearch,
    handleAddProducto,
    handleRemoveProducto,
    handleCantidadChangeTable,
    handleSubmit,
    getChampagneMax
  };
}
