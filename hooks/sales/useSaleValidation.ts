'use client';
import { permiteAnfitrionaConComision } from '@/lib/sales/hostessShortPrices';
import { requiresShortMixer, bottleMixerUnits } from '@/lib/sales/productConfiguration';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSales } from '@/hooks/cash-register/useSales';
import { useTimer } from '@/contexts/TimerContext';
import logger from '@/lib/utils/logger';
import {
  isChampagneProduct,
  roomRequiredForPrice,
  setServiceLevels
} from '@/components/orders/productModalRules';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { useSaleProductSearch } from './useSaleProductSearch';
import { createChampagneTierLookup } from './champagneTiers';
import { createHostessLimiter } from './saleHostessLimits';
import { prepareCartLine } from './saleAddToCart';
import {
  agregarLineaAlCarro,
  calcularComisionTotal,
  calcularTotales,
  cambiarCantidadEnCarro
} from './saleCart';
import { buildVentaPayload } from './salePayload';
import {
  clearSaleDraft,
  persistSaleDraft,
  readServicioIdFromUrl,
  restoreSaleDraft
} from './saleDraftStorage';

export interface SaleFormState {
  servicioId: string | null;
  servicioNombre: string;
  servicioAnfitrionas: string[];
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
  handleServiceHostessChange: (previous: string[], next: string[]) => void;
  handleCartHostessesChange: (index: number, ids: string[]) => void;
}

export function useSaleValidation({
  onClearSearch
}: UseSaleValidationParams): UseSaleValidationReturn {
  const router = useRouter();
  const { createVenta } = useSales();
  const { startTimer } = useTimer();

  // ── Form state ──────────────────────────────────────────────────────
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [servicioNombre, setServicioNombre] = useState('');
  const [servicioAnfitrionas, setServicioAnfitrionas] = useState<string[]>([]);
  const servicioAnfitrionasIniciales = useRef<string[]>([]);
  const [servicioListo, setServicioListo] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState('none');
  const [selectedHabitacion, setSelectedHabitacion] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [draftReady, setDraftReady] = useState(false);
  const [enableTip, setEnableTip] = useState(false);
  const [selectedRoomInfo, setSelectedRoomInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const roomRequest = useRef<AbortController | null>(null);
  const [searchProducto, setSearchProducto] = useState('');
  const [manualTime, setManualTime] = useState<string>('30');
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});
  const { results: searchResults, loading: searchLoading } = useSaleProductSearch(searchProducto);

  // Una instancia de caché por formulario abierto: cerrar la pantalla revalida.
  const [champagne] = useState(createChampagneTierLookup);
  const hostessLimits = useMemo(() => createHostessLimiter(champagne.getMax), [champagne]);

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
    !servicioId &&
    (hasChampagneProducts || productos.some(p => roomRequiredForPrice(p.precio ?? p.price)));

  // ── Borrador persistido ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const servicioEnUrl = readServicioIdFromUrl();
    if (servicioEnUrl) {
      setServicioId(servicioEnUrl);
      fetch(`/api/services/${encodeURIComponent(servicioEnUrl)}`)
        .then(r => r.json())
        .then(res => {
          if (!res.success || ![2, 3].includes(Number(res.data?.estado)))
            throw new Error('El servicio ya no está activo');
          setSelectedCliente(res.data.cliente_id || 'none');
          setSelectedHabitacion(res.data.habitacion_id);
          setServicioNombre(
            res.data.habitacion_nombre || res.data.habitacion_numero || 'Habitación'
          );
          const ids: string[] = [
            ...new Set<string>(
              String(res.data.anfitrionas_ids || '')
                .split(',')
                .map(id => id.trim())
                .filter(Boolean)
            )
          ];
          servicioAnfitrionasIniciales.current = ids;
          setServicioAnfitrionas(ids);
          setServicioListo(true);
        })
        .catch(err => toast.error(err.message));
      return;
    }

    restoreSaleDraft({
      cliente: setSelectedCliente,
      habitacion: setSelectedHabitacion,
      metodoPago: setMetodoPago,
      productos: setProductos,
      enableTip: setEnableTip
    });
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !draftReady || servicioId) return;
    persistSaleDraft({
      enableTip,
      selectedCliente,
      selectedHabitacion,
      metodoPago,
      productos
    });
  }, [
    draftReady,
    servicioId,
    enableTip,
    selectedCliente,
    selectedHabitacion,
    metodoPago,
    productos
  ]);

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

  const handleClearSearch = () => {
    setSearchProducto('');
    onClearSearch();
  };

  // ── Product cart handlers ───────────────────────────────────────────
  const handleAddProducto = async (producto: any) => {
    const prepared = await prepareCartLine({
      producto,
      cantidades,
      limiteAnfitrionasDe: hostessLimits.limiteAnfitrionasDe,
      fetchTiers: champagne.fetchTiers
    });

    if (prepared.kind === 'blocked') {
      toast[prepared.level](prepared.message);
      return;
    }

    prepared.notes.forEach(note => toast[note.level](note.message));
    setProductos(prev => agregarLineaAlCarro(prev, prepared.line));
    setCantidades(prev => ({ ...prev, [prepared.line.id]: 1 }));
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
    setProductos(prev =>
      cambiarCantidadEnCarro(prev, index, nuevaCantidad, hostessLimits.recortePorCantidad)
    );
  };

  // ── Derived values ──────────────────────────────────────────────────
  const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));
  const totals = useMemo(
    () => calcularTotales(productos, propinaPct, enableTip),
    [productos, enableTip, propinaPct]
  );

  const commissionTotal = useMemo(() => calcularComisionTotal(productos), [productos]);

  // ── Submit handler ──────────────────────────────────────────────────
  const handleServiceHostessChange = (previous: string[], next: string[]) => {
    if (!servicioId) return;
    setServicioAnfitrionas(current => [
      ...new Set([...current.filter(id => !previous.includes(id) || next.includes(id)), ...next])
    ]);
  };

  const handleCartHostessesChange = (index: number, ids: string[]) => {
    const product = productos[index];
    if (!product || product.tipo_venta !== 'shot' || !product.shot_anfitriona) return;
    const selected = permiteAnfitrionaConComision(
      product.tipo_venta,
      product.comision ?? product.commission,
      Boolean(product.shot_anfitriona)
    )
      ? [...new Set(ids)].slice(0, Number(product.cantidad))
      : [];
    handleServiceHostessChange(product.selectedHostesses || [], selected);
    setProductos(current =>
      current.map((p, i) => (i === index ? { ...p, selectedHostesses: selected } : p))
    );
  };

  const handleSubmit = async (clientes: any[], anfitrionas: any[]) => {
    if (
      requiresRoom &&
      (!selectedHabitacion || selectedHabitacion === 'none' || !selectedRoomInfo)
    ) {
      toast.error('Selecciona una habitación disponible');
      return;
    }
    if (requiresRoom && (!Number.isInteger(Number(manualTime)) || Number(manualTime) <= 0)) {
      toast.error('Selecciona un tiempo válido para la habitación');
      return;
    }
    if (servicioId && !servicioListo) {
      toast.error('Espera a que se cargue el servicio activo');
      return;
    }
    if (
      productos.some(
        p =>
          requiresShortMixer(p) &&
          (!p.acompanamiento_corto?.presentacion_id ||
            !Number.isInteger(p.acompanamiento_corto.unidades ?? 1) ||
            (p.acompanamiento_corto.unidades ?? 1) < 1)
      )
    ) {
      toast.warning('Selecciona la soda o gaseosa para entregar completo para cada producto');
      return;
    }
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
        if (
          !permiteAnfitrionaConComision(
            p.tipo_venta === 'shot' ? 'shot' : 'botella',
            p.comision ?? p.commission,
            Boolean(p.shot_anfitriona)
          ) ||
          !p.selectedHostesses?.length
        )
          continue;
        const max = await hostessLimits.limiteAnfitrionasDe(p);
        if (p.selectedHostesses.length > max) {
          toast.error(`Producto ${p.nombre} permite máximo ${max} anfitrionas`);
          return;
        }
      }
      const todasAnf = Array.from(
        new Set(
          productos.flatMap(p =>
            permiteAnfitrionaConComision(
              p.tipo_venta === 'shot' ? 'shot' : 'botella',
              p.comision ?? p.commission,
              Boolean(p.shot_anfitriona)
            )
              ? p.selectedHostesses || []
              : []
          )
        )
      );
      if (
        productos.some(
          p =>
            p.tipo_venta !== 'shot' &&
            bottleMixerUnits(p) > 0 &&
            !p.acompanamiento_botella?.presentacion_id
        )
      ) {
        toast.warning('Selecciona la bebida para cada botella');
        return;
      }

      const ventaData = buildVentaPayload({
        selectedCliente,
        metodoPago,
        totals,
        productos,
        todasAnf,
        servicioId,
        servicioAnfitrionas,
        servicioAnfitrionasIniciales: servicioAnfitrionasIniciales.current,
        requiresRoom,
        selectedHabitacion,
        manualTime,
        selectedRoomInfo
      });

      const res = await createVenta(ventaData);
      if (res && (res.success || res.data)) {
        const data = res.data || res;
        if (requiresRoom && selectedHabitacion && !servicioId && Number(data.estado) === 2) {
          const duration = requiresRoom ? parseInt(manualTime) : selectedRoomInfo?.time || 60;

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
        }
        window.dispatchEvent(new CustomEvent('ventaRegistrada'));
        if (!servicioId) {
          clearSaleDraft();
          setDraftReady(false);
        }
        toast.success('Venta generada exitosamente');
        router.push(servicioId ? '/private-rooms' : '/sales');
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
      servicioId,
      servicioNombre,
      servicioAnfitrionas,
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
    getChampagneMax: champagne.getMax,
    handleServiceHostessChange,
    handleCartHostessesChange
  };
}
