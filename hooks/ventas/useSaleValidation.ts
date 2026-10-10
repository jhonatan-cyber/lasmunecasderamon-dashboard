'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSales } from '@/hooks/caja/useSales';
import { useTimer } from '@/contexts/TimerContext';
import { VentaCreate } from '@/types/venta';
import logger from '@/lib/utils/logger';
import {
  getExplicitMaxAnfitrionas,
  getHostessLimit,
  isChampagneProduct,
  isExpensiveDrink
} from '@/components/orders/productModalRules';
import { setServiceLevels, roomRequiredForPrice } from '@/components/orders/productModalRules';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { calcularPropina, calcularTotalVenta } from '@/lib/business/saleTotals';
import { useSaleProductSearch } from './useSaleProductSearch';
import { resolverVentaProducto, type SaleChoice } from '@/lib/sales/saleChoice';
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
  const submitting = useRef(false);
  const roomRequest = useRef<AbortController | null>(null);
  const [searchProducto, setSearchProducto] = useState('');
  const [manualTime, setManualTime] = useState<string>('30');
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});
  const { results: searchResults, loading: searchLoading } = useSaleProductSearch(searchProducto);

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
  useEffect(() => () => roomRequest.current?.abort(), []);

  const handleHabitacionChange = async (habitacionId: string) => {
    roomRequest.current?.abort();
    if (!habitacionId) {
      setSelectedHabitacion('');
      setSelectedRoomInfo(null);
      return;
    }
    const controller = new AbortController();
    roomRequest.current = controller;
    try {
      const res = await fetch(`/api/rooms/${habitacionId}`, { signal: controller.signal });
      const data = await res.json();
      if (!controller.signal.aborted && res.ok && data.success) {
        setSelectedRoomInfo(data.data);
        setSelectedHabitacion(habitacionId);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        logger.captureException(error, { context: 'useSaleValidation:fetchRoomInfo' });
      }
    }
  };

  // ── Product search (solo bar: presentaciones con stock) ────────────────
  const handleClearSearch = () => {
    setSearchProducto('');
    onClearSearch();
  };

  // ── Champagne tiers (precio según Nº anfitrionas) ──────────────────────
  const champagneTiersCache = useRef<Record<string, ChampagneTier[]>>({});

  const fetchChampagneTiers = async (
    productoId: string,
    champagne = true
  ): Promise<ChampagneTier[]> => {
    const pid = String(productoId);
    if (champagneTiersCache.current[pid]) return champagneTiersCache.current[pid];
    try {
      const res = await fetch(`/api/products/${pid}/tiers?configurados=1`);
      const data = await res.json().catch(() => ({}));
      const tiers =
        data.success && Array.isArray(data.data) && data.data.length > 0
          ? data.data
          : champagne
            ? CHAMPAGNE_DEFAULT_TIERS
            : [];
      champagneTiersCache.current[pid] = tiers;
      return tiers;
    } catch {
      return champagne ? CHAMPAGNE_DEFAULT_TIERS : [];
    }
  };

  const getChampagneMax = async (producto: any): Promise<number> => {
    const pid = String(producto.producto_id || producto.id_producto || producto.id);
    const tiers = await fetchChampagneTiers(pid);
    return Math.max(...tiers.map(t => t.anfitrionas), 1);
  };

  // ── Anfitrionas: opcionales, pero nunca por encima del máximo ────────
  // Misma cascada que la UI: champaña (máximo del producto y de sus tramos),
  // bebida cara (una por unidad, con su máximo explícito) y el resto, una sola.
  // La regla por precio es de la botella: el shot no la hereda.
  const eleccionDe = (p: any): SaleChoice =>
    p?.tipo_venta === 'shot' ? (p?.shot_anfitriona ? 'shot_anfitriona' : 'shot') : 'botella';

  const esBebidaCara = (p: any) =>
    isExpensiveDrink({ precio: resolverVentaProducto(p, eleccionDe(p)).precioBotella });

  const limiteAnfitrionasDe = async (p: any): Promise<number> => {
    const maxExplicito = getExplicitMaxAnfitrionas(p);
    if (isChampagneProduct(p)) return Math.min(getHostessLimit(p), await getChampagneMax(p));
    if (esBebidaCara(p)) {
      const cantidad = Math.max(1, Number(p.cantidad) || 1);
      return maxExplicito ? Math.min(cantidad, maxExplicito) : cantidad;
    }
    return maxExplicito ?? 1;
  };

  // Bajar la cantidad en el carro recorta las anfitrionas de una bebida cara para
  // no quedar con más elegidas de las que permite la nueva cantidad.
  const recortePorCantidad = (p: any, cantidad: number) => {
    const actuales: any[] = Array.isArray(p.selectedHostesses) ? p.selectedHostesses : [];
    if (!actuales.length || isChampagneProduct(p) || !esBebidaCara(p)) return actuales;
    const maxExplicito = getExplicitMaxAnfitrionas(p);
    const limite = maxExplicito ? Math.min(cantidad, maxExplicito) : cantidad;
    if (actuales.length <= limite) return actuales;
    toast.info(`Máximo ${limite} anfitrionas para ${p.nombre}`);
    return actuales.slice(0, limite);
  };

  // ── Product cart handlers ───────────────────────────────────────────
  const handleAddProducto = async (producto: any) => {
    const id = producto.id || producto.id_producto;
    // Un shot no gasta una botella: se sirve de la botella abierta (ml), así que el
    // tope de unidades en bar solo aplica a la venta de botella completa.
    const tipoVenta = producto.tipo_venta === 'shot' ? 'shot' : 'botella';
    // Un shot cobrado a precio de anfitriona es un shot más: cambia el precio, no el
    // descuento de ml. Se marca para que reportes y caja lo separen.
    const shotAnfitriona = tipoVenta === 'shot' && Boolean(producto.shot_anfitriona);
    let cantidad = Number(producto.cantidad ?? cantidades[id] ?? 1);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 2147483647) {
      toast.warning('La cantidad debe ser un número entero positivo');
      return;
    }
    if (tipoVenta !== 'shot' && producto.stock_bar != null && Number(producto.stock_bar) < 1) {
      toast.warning('Producto sin stock disponible en bar');
      return;
    }
    if (
      tipoVenta !== 'shot' &&
      producto.stock_bar !== undefined &&
      producto.stock_bar !== null &&
      cantidad > producto.stock_bar
    ) {
      toast.warning(`Stock máximo en bar: ${producto.stock_bar}`);
      cantidad = Math.max(1, producto.stock_bar);
    }

    // Elegir anfitriona es opcional; si se eligieron más de las que permite el
    // producto, la línea entra al carro recortada al máximo.
    const tieneComisionParaAnfitriona = Number(producto.comision ?? producto.commission ?? 0) > 0;
    const elegidas = (tieneComisionParaAnfitriona ? producto.selectedHostesses || [] : [])
      .filter((h: unknown) => h !== null && h !== undefined)
      .map((h: string | number) => String(h));
    const limite = elegidas.length ? await limiteAnfitrionasDe({ ...producto, cantidad }) : 0;
    const hostessIds = elegidas.slice(0, limite);
    if (hostessIds.length < elegidas.length) {
      toast.info(
        `Máximo ${limite} anfitrionas para ${producto.nombre || producto.name || 'este producto'}`
      );
    }

    let precio = producto.precio ?? producto.price ?? 0;
    let comision = producto.comision ?? producto.commission ?? 0;
    if (
      producto.tipo_venta !== 'shot' &&
      (isChampagneProduct(producto) || Number(producto.max_anfitrionas) >= 2) &&
      hostessIds.length > 0
    ) {
      const pid = String(producto.producto_id || producto.id_producto || producto.id);
      const tiers = await fetchChampagneTiers(pid, isChampagneProduct(producto));
      const tier =
        tiers.find(t => Number(t.anfitrionas) === hostessIds.length) ??
        (isChampagneProduct(producto) && tiers.length
          ? champagneTierFor(hostessIds.length, tiers)
          : undefined);
      if (tier) {
        precio = tier.precio;
        comision = tier.comision;
      }
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
      shot_anfitriona: shotAnfitriona,
      selectedHostesses: hostessIds,
      isChampagne: producto.isChampagne || isChampagneProduct(producto)
    };

    const isMatch = (p: any) =>
      p.id === productoNormalizado.id &&
      (p.tipo_venta === 'shot' ? 'shot' : 'botella') === tipoVenta &&
      // Shot de cliente y shot de anfitriona son líneas distintas: no se suman.
      Boolean(p.shot_anfitriona) === shotAnfitriona &&
      Number(p.precio) === Number(precio) &&
      Number(p.comision ?? 0) === Number(comision) &&
      (p.presentacion_id || null) === (productoNormalizado.presentacion_id || null) &&
      JSON.stringify([...(p.selectedHostesses || [])].sort()) ===
        JSON.stringify([...(productoNormalizado.selectedHostesses || [])].sort());

    setProductos(prev => {
      const existing = prev.find(isMatch);
      let agregar = cantidad;
      if (tipoVenta === 'shot') {
        agregar = Math.min(agregar, Math.max(0, 99 - Number(existing?.cantidad ?? 0)));
      } else if (producto.stock_bar != null) {
        // Distintas anfitrionas o precios siguen consumiendo la misma presentación.
        const reservadas = prev.reduce((total, p) => {
          const mismaPresentacion =
            (p.presentacion_id || p.id) === (productoNormalizado.presentacion_id || id);
          return mismaPresentacion && p.tipo_venta !== 'shot' ? total + Number(p.cantidad) : total;
        }, 0);
        agregar = Math.min(agregar, Math.max(0, Number(producto.stock_bar) - reservadas));
      }
      if (agregar < cantidad) toast.warning('La cantidad solicitada supera el disponible');
      if (agregar <= 0) return prev;
      if (existing) {
        return prev.map(p =>
          isMatch(p)
            ? {
                ...p,
                cantidad: Number(p.cantidad) + agregar,
                subtotal: p.precio * (Number(p.cantidad) + agregar)
              }
            : p
        );
      }
      return [...prev, { ...productoNormalizado, cantidad: agregar, subtotal: precio * agregar }];
    });

    setCantidades(prev => ({ ...prev, [id]: 1 }));
  };

  const handleRemoveProducto = (index: number) => {
    setProductos(prev => prev.filter((_, i) => i !== index));
  };

  const handleCantidadChangeTable = (index: number, nuevaCantidad: number) => {
    if (!Number.isInteger(nuevaCantidad) || nuevaCantidad > 2147483647) {
      toast.warning('La cantidad debe ser un número entero');
      return;
    }
    if (nuevaCantidad <= 0) {
      handleRemoveProducto(index);
      return;
    }
    setProductos(prev => {
      const actual = prev[index];
      if (!actual) return prev;
      const reservadas = prev.reduce(
        (total, p, i) =>
          i !== index &&
          p.tipo_venta !== 'shot' &&
          (p.presentacion_id || p.id) === (actual.presentacion_id || actual.id)
            ? total + Number(p.cantidad)
            : total,
        0
      );
      const tope =
        actual.tipo_venta === 'shot'
          ? 99
          : actual.stock_bar == null
            ? undefined
            : Math.max(0, Number(actual.stock_bar) - reservadas);
      let final = nuevaCantidad;
      if (tope !== undefined && tope !== null && nuevaCantidad > tope) {
        toast.warning(`Stock máximo en bar: ${tope}`);
        final = tope;
      }
      if (final <= 0) return prev.filter((_, i) => i !== index);
      return prev.map((p, i) =>
        i === index
          ? {
              ...p,
              cantidad: final,
              subtotal: (p.precio || 0) * final,
              selectedHostesses: recortePorCantidad(p, final)
            }
          : p
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
      (acc, p) =>
        acc +
        (p.selectedHostesses?.length && Number(p?.comision ?? p?.commission ?? 0) > 0
          ? Number(p?.comision ?? p?.commission ?? 0) * Number(p?.cantidad || 0)
          : 0),
      0
    );
  }, [productos]);

  // ── Submit handler ──────────────────────────────────────────────────
  const handleSubmit = async (clientes: any[], anfitrionas: any[]) => {
    if (submitting.current) return;
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

    submitting.current = true;
    setLoading(true);
    try {
      for (const p of productos) {
        if (!p.selectedHostesses?.length || Number(p.comision ?? p.commission ?? 0) <= 0) continue;
        const max = await limiteAnfitrionasDe(p);
        if (p.selectedHostesses.length > max) {
          toast.error(`Producto ${p.nombre} permite máximo ${max} anfitrionas`);
          return;
        }
      }
      const todasAnf = Array.from(
        new Set(
          productos.flatMap(p =>
            Number(p.comision ?? p.commission ?? 0) > 0 ? p.selectedHostesses || [] : []
          )
        )
      );
      const ventaData: VentaCreate = {
        cliente_id: selectedCliente !== 'none' ? selectedCliente : null,
        metodo_pago: metodoPago as 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago',
        propina: totals.propina,
        sub_total: totals.subtotal,
        total: totals.total,
        detalles: productos.map(p => {
          const selectedHostesses =
            Number(p.comision ?? p.commission ?? 0) > 0 && Array.isArray(p.selectedHostesses)
              ? p.selectedHostesses
                  .filter((h: unknown) => h !== null && h !== undefined)
                  .map((h: string | number) => String(h))
              : [];
          const normalizedDetail = {
            producto_id: p.producto_id || p.id,
            presentacion_id: p.presentacion_id || null,
            ...(p.tipo_venta === 'shot'
              ? { tipo_venta: 'shot' as const, shot_anfitriona: Boolean(p.shot_anfitriona) }
              : {}),
            precio: p.precio,
            comision: selectedHostesses.length > 0 ? (p.comision || 0) * p.cantidad : 0,
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
      submitting.current = false;
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
