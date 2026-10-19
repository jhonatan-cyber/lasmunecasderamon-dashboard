'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { FormattedNumberInput } from '@/components/shared/FormattedNumberInput';
import { toast } from 'sonner';
import {
  DollarSign,
  ChevronLeft,
  ChevronDown,
  Eye,
  GlassWater,
  Minus,
  Plus,
  Ticket,
  UserRoundPlus
} from 'lucide-react';
import { CajaStatusBanner } from '@/components/sales/CajaStatusBanner';
import { MetricCard } from '@/components/shared/MetricCard';
import { SalesDetailModal } from '@/components/sales';
import { anfitrionaColors, metodoPagoLabels } from '@/lib/business/salesUtils';
import type { VentaWithDetails } from '@/types/venta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/bar/ColacionesTab';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useConfigValue } from '@/hooks/shared/useConfigValue';

type Entrada = {
  id: string;
  grupo_registro_id: string | null;
  cantidad_productos_cortesia: number;
  cliente_nombre: string | null;
  monto_entrada: number;
  monto_bebida_adicional: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  venta_id: string | null;
  bebida_cortesia_presentacion_id: string | null;
  bebida_cortesia: string | null;
  productos_cortesia?: string | null;
  acompanamiento_bebida: string | null;
  fecha: string;
  hora: string;
  registrado_por_nombre: string;
};

type ProductoCortesia = {
  presentacion_id: string;
  producto_id: string;
  producto_nombre: string;
  presentacion_nombre: string;
  precio_venta: number;
  stock_bar: number;
  categoria_nombre: string | null;
  foto: string | null;
  opciones_venta?: { tipo: string; acompanamiento?: { unidades: number } }[];
};

type BebidaAcompanamiento = {
  id: string;
  producto_nombre: string;
  nombre: string;
  stock_bar: number;
};

type SeleccionProducto = { presentacionId: string; cantidad: number; acompanamientoId: string };

const unidadesAcompanamiento = (producto?: ProductoCortesia) =>
  Number(
    producto?.opciones_venta?.find(opcion => opcion.tipo === 'botella')?.acompanamiento?.unidades ??
      0
  );

const fechaLocal = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (key: string) => parts.find(part => part.type === key)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const horaLocal = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());

const fechaHoraLocal = () => {
  const ahora = new Date();
  return { fecha: fechaLocal(ahora), hora: horaLocal() };
};

const formatoFechaHora = ({ fecha, hora }: { fecha: string; hora: string }) => {
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year} · ${hora}`;
};

const imageUrl = (foto?: string | null): string => {
  if (!foto || foto === 'default.png' || foto === '') return '/api/images/products/default.png';
  if (foto.startsWith('http')) return foto;
  return `/api/images/products/${foto}`;
};

export default function EntradasPage() {
  const [fechaFiltro, setFechaFiltro] = useState(fechaLocal);
  const [fechaHoraEntrada, setFechaHoraEntrada] = useState(fechaHoraLocal);
  const [cantidadEntradas, setCantidadEntradas] = useState(1);
  const [montoBebida, setMontoBebida] = useState('0');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>(
    'efectivo'
  );
  const [bebidaCortesiaId, setBebidaCortesiaId] = useState('');
  const [productosSeleccionados, setProductosSeleccionados] = useState<SeleccionProducto[]>([]);
  const [seleccionCover, setSeleccionCover] = useState<Record<string, number>>({});
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [bebidaAcompanamientoId, setBebidaAcompanamientoId] = useState('');
  const [productosBar, setProductosBar] = useState<ProductoCortesia[]>([]);
  const [bebidasAcompanamiento, setBebidasAcompanamiento] = useState<BebidaAcompanamiento[]>([]);
  const [productosLoading, setProductosLoading] = useState(true);
  const [productosError, setProductosError] = useState('');
  const [acompanamientosLoading, setAcompanamientosLoading] = useState(false);
  const [acompanamientosError, setAcompanamientosError] = useState('');
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [grupoDetalleId, setGrupoDetalleId] = useState<string | null>(null);
  const [detalleVenta, setDetalleVenta] = useState<VentaWithDetails | null>(null);
  const [detalleVentaCargando, setDetalleVentaCargando] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const operacionEntrada = useRef<{ signature: string; key: string } | null>(null);
  const { hasOpenCaja } = useCashRegisterStatus();
  const { hasPermission } = useUserPermissions();
  const canCreate = hasPermission('products', 'create');
  const costoEntradaPredeterminado = Number(useConfigValue('comisiones', 'costo_entrada', 10000));
  const montoBaseTragoCortesia = Number(
    useConfigValue('comisiones', 'monto_base_trago_cortesia_cliente', 10000)
  );
  const adicionalNumero = Number(montoBebida || 0);
  const montoTotalProductosPermitido =
    costoEntradaPredeterminado * cantidadEntradas + adicionalNumero;
  const topeCortesia =
    adicionalNumero > 0
      ? costoEntradaPredeterminado * cantidadEntradas + adicionalNumero
      : montoBaseTragoCortesia;
  const totalCoversSeleccionados = useMemo(
    () => Object.values(seleccionCover).reduce((sum, n) => sum + n, 0),
    [seleccionCover]
  );
  const productosCortesia = useMemo(
    () => productosBar.filter(producto => producto.precio_venta <= topeCortesia),
    [productosBar, topeCortesia]
  );
  const totalProductosSeleccionados = productosSeleccionados.reduce(
    (sum, item) => sum + item.cantidad,
    0
  );
  const valorProductosSeleccionados = productosSeleccionados.reduce((sum, item) => {
    const producto = productosBar.find(
      producto => producto.presentacion_id === item.presentacionId
    );
    return sum + (producto?.precio_venta ?? 0) * item.cantidad;
  }, 0);
  const maxProductosSeleccionables =
    adicionalNumero === 0 ? cantidadEntradas : Number.POSITIVE_INFINITY;

  // Agrupa los productos de cortesía por categoría
  const categoriasCortesia = useMemo(() => {
    const mapa = new Map<string, ProductoCortesia[]>();
    for (const producto of productosCortesia) {
      const cat = producto.categoria_nombre ?? 'Sin categoría';
      if (!mapa.has(cat)) mapa.set(cat, []);
      mapa.get(cat)!.push(producto);
    }
    return Array.from(mapa.entries()).map(([nombre, productos]) => ({ nombre, productos }));
  }, [productosCortesia]);

  useEffect(() => {
    const controller = new AbortController();
    setProductosLoading(true);
    setProductosError('');
    fetch('/api/products/for-sale', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.data))
          throw new Error(result.message || 'No se pudieron cargar los productos del bar');
        if (controller.signal.aborted) return;
        setProductosBar(
          result.data.map((producto: any) => ({
            presentacion_id: String(producto.presentacion_id),
            producto_id: String(producto.producto_id),
            producto_nombre: String(producto.producto_nombre),
            presentacion_nombre: String(producto.presentacion_nombre),
            precio_venta: Number(producto.precio_venta),
            stock_bar: Number(producto.stock_bar),
            categoria_nombre: producto.categoria_nombre ? String(producto.categoria_nombre) : null,
            foto: producto.foto ? String(producto.foto) : null,
            opciones_venta: Array.isArray(producto.opciones_venta) ? producto.opciones_venta : []
          }))
        );
      })
      .catch(error => {
        if (!controller.signal.aborted)
          setProductosError(
            error instanceof Error ? error.message : 'No se pudieron cargar los productos del bar'
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setProductosLoading(false);
      });
    return () => controller.abort();
  }, []);

  const productoSeleccionado = productosBar.find(p => p.presentacion_id === bebidaCortesiaId);
  const unidadesAcompanamientoRequeridas = unidadesAcompanamiento(productoSeleccionado);

  useEffect(() => {
    if (
      !productosSeleccionados.some(item => {
        const producto = productosBar.find(p => p.presentacion_id === item.presentacionId);
        return unidadesAcompanamiento(producto) > 0;
      })
    ) {
      setBebidaAcompanamientoId('');
      setAcompanamientosError('');
      setAcompanamientosLoading(false);
      return;
    }
    const controller = new AbortController();
    setAcompanamientosLoading(true);
    setAcompanamientosError('');
    fetch('/api/bar?acompanamientos=1', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.data))
          throw new Error(result.message || 'No se pudieron cargar los acompañamientos');
        if (controller.signal.aborted) return;
        setBebidasAcompanamiento(
          result.data.map((bebida: any) => ({
            id: String(bebida.id),
            producto_nombre: String(bebida.producto_nombre),
            nombre: String(bebida.nombre),
            stock_bar: Number(bebida.stock_bar)
          }))
        );
      })
      .catch(error => {
        if (!controller.signal.aborted)
          setAcompanamientosError(
            error instanceof Error ? error.message : 'No se pudieron cargar los acompañamientos'
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setAcompanamientosLoading(false);
      });
    return () => controller.abort();
  }, [productosSeleccionados, productosBar]);

  useEffect(() => {
    if (bebidaCortesiaId && !productosCortesia.some(p => p.presentacion_id === bebidaCortesiaId))
      setBebidaCortesiaId('');
  }, [bebidaCortesiaId, productosCortesia]);

  useEffect(() => {
    setProductosSeleccionados(actuales =>
      actuales.filter(item =>
        productosCortesia.some(producto => producto.presentacion_id === item.presentacionId)
      )
    );
  }, [productosCortesia]);

  const agregarProducto = (presentacionId: string) => {
    const producto = productosBar.find(item => item.presentacion_id === presentacionId);
    if (!producto) return;
    setProductosSeleccionados(actuales => {
      const actual = actuales.find(item => item.presentacionId === presentacionId);
      const cantidadActual = actual?.cantidad ?? 0;
      const totalActual = actuales.reduce((sum, item) => sum + item.cantidad, 0);
      if (totalActual >= maxProductosSeleccionables) {
        toast.error(`Selecciona como máximo ${cantidadEntradas} producto(s), uno por entrada`);
        return actuales;
      }
      if (cantidadActual >= producto.stock_bar) {
        toast.error(`Stock disponible: ${producto.stock_bar}`);
        return actuales;
      }
      const valorActual = actuales.reduce((sum, item) => {
        const seleccionado = productosBar.find(
          producto => producto.presentacion_id === item.presentacionId
        );
        return sum + (seleccionado?.precio_venta ?? 0) * item.cantidad;
      }, 0);
      if (
        adicionalNumero > 0 &&
        valorActual + producto.precio_venta > montoTotalProductosPermitido
      ) {
        toast.error(
          `El total de productos no puede superar ${formatCurrencyCLP(montoTotalProductosPermitido)}`
        );
        return actuales;
      }
      return actual
        ? actuales.map(item =>
            item.presentacionId === presentacionId ? { ...item, cantidad: item.cantidad + 1 } : item
          )
        : [...actuales, { presentacionId, cantidad: 1, acompanamientoId: '' }];
    });
  };

  const cambiarCantidadProducto = (presentacionId: string, cantidad: number) => {
    setProductosSeleccionados(actuales => {
      if (cantidad <= 0) return actuales.filter(item => item.presentacionId !== presentacionId);
      const otros = actuales.filter(item => item.presentacionId !== presentacionId);
      const productoActual = productosBar.find(item => item.presentacion_id === presentacionId);
      const topePorCantidad =
        maxProductosSeleccionables - otros.reduce((sum, item) => sum + item.cantidad, 0);
      const valorOtros = otros.reduce((sum, item) => {
        const producto = productosBar.find(p => p.presentacion_id === item.presentacionId);
        return sum + (producto?.precio_venta ?? 0) * item.cantidad;
      }, 0);
      const topePorMonto =
        adicionalNumero > 0 && productoActual
          ? Math.floor((montoTotalProductosPermitido - valorOtros) / productoActual.precio_venta)
          : Number.POSITIVE_INFINITY;
      const maximo = Math.min(productoActual?.stock_bar ?? 0, topePorCantidad, topePorMonto);
      if (cantidad > maximo) {
        toast.error(`Puedes seleccionar hasta ${Math.max(0, maximo)} unidad(es) más`);
        return actuales;
      }
      return actuales.map(item =>
        item.presentacionId === presentacionId ? { ...item, cantidad } : item
      );
    });
  };

  useEffect(() => {
    const actualizarFechaHora = () => setFechaHoraEntrada(fechaHoraLocal());
    const interval = window.setInterval(actualizarFechaHora, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const entriesResponse = await fetch(
        `/api/entradas?fecha=${encodeURIComponent(fechaFiltro)}`,
        {
          cache: 'no-store'
        }
      );
      const entriesJson = await entriesResponse.json();
      if (!entriesResponse.ok || !entriesJson.success)
        throw new Error(entriesJson.message || 'No se pudieron cargar las entradas');
      setEntradas(entriesJson.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar entradas');
    } finally {
      setLoading(false);
    }
  }, [fechaFiltro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const gruposEntradas = useMemo(() => {
    const grupos = new Map<
      string,
      {
        id: string;
        registros: Entrada[];
        monto_entrada: number;
        monto_bebida_adicional: number;
        cantidad_productos_cortesia: number;
        venta_id: string | null;
      }
    >();
    for (const entrada of entradas) {
      const id = entrada.grupo_registro_id || entrada.id;
      let grupo = grupos.get(id);
      if (!grupo) {
        grupo = {
          id,
          registros: [],
          monto_entrada: 0,
          monto_bebida_adicional: 0,
          cantidad_productos_cortesia: 0,
          venta_id: null
        };
        grupos.set(id, grupo);
      }
      grupo.registros.push(entrada);
      grupo.monto_entrada += Number(entrada.monto_entrada);
      grupo.monto_bebida_adicional += Number(entrada.monto_bebida_adicional);
      grupo.cantidad_productos_cortesia += Number(entrada.cantidad_productos_cortesia || 0);
      if (!grupo.venta_id && entrada.venta_id) grupo.venta_id = entrada.venta_id;
    }
    return Array.from(grupos.values());
  }, [entradas]);
  // Un grupo con venta ya se contó como ingreso en ventas: sumar acá el monto
  // base lo duplicaría. El discriminador es la venta, no el adicional.
  const total = useMemo(
    () =>
      gruposEntradas.reduce((sum, grupo) => sum + (grupo.venta_id ? 0 : grupo.monto_entrada), 0),
    [gruposEntradas]
  );
  const grupoDetalle = gruposEntradas.find(grupo => grupo.id === grupoDetalleId) ?? null;
  const abrirDetalle = async (grupo: (typeof gruposEntradas)[number]) => {
    if (grupo.monto_bebida_adicional > 0 && grupo.venta_id) {
      setDetalleVentaCargando(grupo.id);
      try {
        const response = await fetch(`/api/ventas/${grupo.venta_id}`, { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok || !result.success || !result.data)
          throw new Error(result.message || 'No se pudo cargar el detalle de la venta');
        setDetalleVenta(result.data);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Error al cargar el detalle de la venta'
        );
      } finally {
        setDetalleVentaCargando(null);
      }
      return;
    }
    setGrupoDetalleId(grupo.id);
  };
  const productosDetalle = useMemo(() => {
    if (!grupoDetalle) return [];
    const productos = new Map<string, { nombre: string; cantidad: number }>();
    for (const entrada of grupoDetalle.registros) {
      const detalle = entrada.productos_cortesia || entrada.bebida_cortesia;
      if (!detalle) continue;
      for (const producto of detalle
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)) {
        const match = producto.match(/^(.*?)\s×\s(\d+)(.*)$/);
        const nombre = match ? `${match[1]}${match[3]}` : producto;
        const cantidad = match ? Number(match[2]) : 1;
        const actual = productos.get(nombre);
        productos.set(nombre, { nombre, cantidad: cantidad + (actual?.cantidad ?? 0) });
      }
    }
    return Array.from(productos.values());
  }, [grupoDetalle]);
  const registrar = async (event: FormEvent) => {
    event.preventDefault();
    const base = costoEntradaPredeterminado * cantidadEntradas;
    const adicional = Number(montoBebida || 0);
    if (
      !Number.isInteger(base) ||
      base < 0 ||
      !Number.isInteger(adicional) ||
      adicional < 0 ||
      base + adicional <= 0
    ) {
      toast.error('Indica montos enteros válidos y mayores a cero en total');
      return;
    }
    if (adicional > 0 && !bebidaCortesiaId) {
      toast.error('Selecciona la bebida para registrar el adicional como venta');
      return;
    }
    if (adicional === 0 && totalProductosSeleccionados !== cantidadEntradas) {
      toast.error(`Selecciona exactamente ${cantidadEntradas} producto(s), uno por entrada`);
      return;
    }
    if (adicional > 0 && valorProductosSeleccionados !== base + adicional) {
      toast.error(`Los productos deben sumar exactamente ${formatCurrencyCLP(base + adicional)}`);
      return;
    }
    const faltaAcompanamiento = productosSeleccionados.some(
      item =>
        unidadesAcompanamiento(
          productosBar.find(producto => producto.presentacion_id === item.presentacionId)
        ) > 0 && !item.acompanamientoId
    );
    if (faltaAcompanamiento) {
      toast.error('Selecciona el acompañamiento configurado para cada producto');
      return;
    }
    const acompanamientoBebidaAdicional =
      productosSeleccionados.find(item => item.presentacionId === bebidaCortesiaId)
        ?.acompanamientoId || bebidaAcompanamientoId;
    const payload = {
      monto_entrada: base,
      cantidad_entradas: cantidadEntradas,
      monto_bebida_adicional: adicional,
      metodo_pago: metodoPago,
      bebida_cortesia_presentacion_id: adicional > 0 ? bebidaCortesiaId || null : null,
      bebida_acompanamiento_presentacion_id: acompanamientoBebidaAdicional || null,
      productos_cortesia:
        productosSeleccionados.length > 0
          ? productosSeleccionados
          : adicional === 0 && bebidaCortesiaId
            ? [
                {
                  presentacionId: bebidaCortesiaId,
                  cantidad: cantidadEntradas,
                  acompanamientoId: bebidaAcompanamientoId
                }
              ]
            : [],
      partes: Array.from({ length: cantidadEntradas }, (_, index) => ({
        monto_bebida_adicional: index === 0 ? adicional : 0,
        bebida_cortesia_presentacion_id:
          index === 0 && adicional > 0 ? bebidaCortesiaId || null : null,
        bebida_acompanamiento_presentacion_id:
          index === 0 && adicional > 0 ? acompanamientoBebidaAdicional || null : null
      })),
      fecha: fechaHoraEntrada.fecha,
      hora: fechaHoraEntrada.hora
    };
    // La clave se mantiene mientras la intención no cambie: reintentar el mismo
    // envío no duplica la entrada, el movimiento de caja ni el stock.
    const signature = JSON.stringify(payload);
    const anterior = operacionEntrada.current;
    const operacion =
      anterior?.signature === signature
        ? anterior
        : {
            signature,
            key:
              globalThis.crypto?.randomUUID?.() ||
              `entrada-${Date.now()}-${Math.random().toString(36).slice(2)}`
          };
    operacionEntrada.current = operacion;
    setSaving(true);
    try {
      const response = await fetch('/api/entradas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': operacion.key
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo registrar la entrada');
      toast.success(
        cantidadEntradas > 1 ? `${cantidadEntradas} entradas registradas` : 'Entrada registrada'
      );
      setCantidadEntradas(1);
      setMontoBebida('0');
      setBebidaCortesiaId('');
      setProductosSeleccionados([]);
      setCategoriaSeleccionada(null);
      setBebidaAcompanamientoId('');
      setFechaHoraEntrada(fechaHoraLocal());
      operacionEntrada.current = null;
      await cargar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al registrar la entrada');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className='mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8'>
      <CajaStatusBanner entityName='entradas' />
      <header className='flex items-center gap-3'>
        <div className='rounded-xl border bg-card p-3 text-primary shadow-xs'>
          <Ticket className='h-6 w-6' />
        </div>
        <div>
          <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>Entradas</h1>
          <p className='text-sm text-muted-foreground'>Registro de ingresos de clientes.</p>
        </div>
      </header>

      <section aria-label='Resumen de entradas' className='grid gap-3 sm:grid-cols-2'>
        <MetricCard
          icon={<Ticket />}
          badge='Registros'
          label='Entradas del día'
          value={entradas.length}
          tone='blue'
          className='hover:scale-100'
        />
        <MetricCard
          icon={<DollarSign />}
          badge='Solo monto base'
          label='Total de entradas'
          value={formatCurrencyCLP(total)}
          tone='emerald'
          className='hover:scale-100'
        />
      </section>

      {canCreate && (
        <form
          onSubmit={registrar}
          className='space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5'
        >
          <div>
            <h2 className='font-semibold'>Registrar entrada</h2>
          </div>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <div className='space-y-2'>
              <Label htmlFor='entrada-monto'>Monto de entrada</Label>
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  aria-label='Disminuir cantidad de entradas'
                  onClick={() =>
                    setCantidadEntradas(prev => {
                      const siguiente = Math.max(1, prev - 1);
                      if (adicionalNumero === 0 && totalProductosSeleccionados > siguiente) {
                        toast.error(
                          `Quita productos hasta dejar ${siguiente} por entrada antes de reducir la cantidad`
                        );
                        return prev;
                      }
                      return siguiente;
                    })
                  }
                  disabled={cantidadEntradas <= 1}
                  className='rounded-full'
                >
                  <Minus className='h-4 w-4' />
                </Button>
                <Input
                  id='entrada-monto'
                  type='text'
                  value={`${cantidadEntradas} × ${formatCurrencyCLP(costoEntradaPredeterminado)}`}
                  readOnly
                  aria-readonly='true'
                  className='text-center'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  aria-label='Aumentar cantidad de entradas'
                  onClick={() => setCantidadEntradas(prev => prev + 1)}
                  className='rounded-full'
                >
                  <Plus className='h-4 w-4' />
                </Button>
              </div>
              {cantidadEntradas > 1 && (
                <p className='text-xs text-muted-foreground'>
                  Subtotal: {formatCurrencyCLP(costoEntradaPredeterminado * cantidadEntradas)}
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='entrada-adicional'>Adicional por otra bebida</Label>
              <FormattedNumberInput
                id='entrada-adicional'
                min={0}
                value={montoBebida}
                onChange={event => setMontoBebida(event.target.value.replace(/^0+(\d)/, '$1'))}
                onFocus={() => setMontoBebida(prev => (prev === '0' ? '' : prev))}
                onBlur={() => setMontoBebida(prev => (prev === '' ? '0' : prev))}
                placeholder='0'
                currency
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='entrada-metodo-pago'>Método de pago</Label>
              <Select
                value={metodoPago}
                onValueChange={(value: string) => setMetodoPago(value as typeof metodoPago)}
              >
                <SelectTrigger id='entrada-metodo-pago' className='w-full'>
                  <SelectValue placeholder='Selecciona un método de pago' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='efectivo'>Efectivo</SelectItem>
                  <SelectItem value='tarjeta'>Tarjeta</SelectItem>
                  <SelectItem value='transferencia'>Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='entrada-fecha-hora'>Fecha y hora</Label>
              <Input
                id='entrada-fecha-hora'
                type='text'
                value={formatoFechaHora(fechaHoraEntrada)}
                readOnly
                aria-readonly='true'
              />
            </div>
          </div>

          {/* Sección de covers de entradas – ancho completo */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Label>Covers de entradas</Label>
              {categoriaSeleccionada && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setCategoriaSeleccionada(null);
                    setBebidaCortesiaId('');
                  }}
                  className='flex items-center gap-1'
                >
                  <ChevronLeft className='h-4 w-4' />
                  Volver
                </Button>
              )}
            </div>

            {productosLoading ? (
              <p className='text-sm text-muted-foreground'>Cargando productos…</p>
            ) : productosError ? (
              <p className='text-xs text-destructive' role='alert'>
                {productosError}
              </p>
            ) : categoriasCortesia.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                No hay productos disponibles hasta {formatCurrencyCLP(montoBaseTragoCortesia)}.
              </p>
            ) : !categoriaSeleccionada ? (
              /* Vista de categorías */
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
                {/* Cards de categoría */}
                {categoriasCortesia.map(cat => (
                  <Button
                    key={cat.nombre}
                    type='button'
                    variant='unstyled'
                    onClick={() => {
                      setCategoriaSeleccionada(cat.nombre);
                      setBebidaAcompanamientoId('');
                    }}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors hover:bg-muted ${
                      productosSeleccionados.some(item =>
                        categoriasCortesia
                          .find(c => c.nombre === cat.nombre)
                          ?.productos.some(p => p.presentacion_id === item.presentacionId)
                      )
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-foreground'
                    }`}
                  >
                    <GlassWater className='h-8 w-8 opacity-60' />
                    <span className='text-sm font-medium'>{cat.nombre}</span>
                    <span className='text-xs text-muted-foreground'>
                      {cat.productos.length} opción{cat.productos.length !== 1 ? 'es' : ''}
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              /* Vista de productos de la categoría */
              <div className='grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'>
                {(
                  categoriasCortesia.find(c => c.nombre === categoriaSeleccionada)?.productos ?? []
                ).map(producto => (
                  <Button
                    key={producto.presentacion_id}
                    type='button'
                    variant='unstyled'
                    disabled={producto.stock_bar <= 0}
                    onClick={() => {
                      setBebidaCortesiaId(producto.presentacion_id);
                      agregarProducto(producto.presentacion_id);
                    }}
                    className={`flex flex-col overflow-hidden rounded-xl border-2 border-dashed transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                      productosSeleccionados.some(
                        item => item.presentacionId === producto.presentacion_id
                      )
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    {/* Foto – mismo estilo que inventario */}
                    <div
                      data-photo-surface
                      className='relative h-20 w-full overflow-hidden bg-white dark:bg-white/[0.04]'
                    >
                      <ProductPhoto
                        src={imageUrl(producto.foto)}
                        alt={`${producto.producto_nombre} ${producto.presentacion_nombre}`}
                        fill
                        className='object-contain p-1.5'
                      />
                    </div>
                    {/* Info */}
                    <div className='flex flex-col gap-0.5 p-2 text-center'>
                      <p className='truncate text-xs font-semibold leading-snug text-gray-700 dark:text-neutral-200'>
                        {producto.producto_nombre}
                      </p>
                      <p className='truncate text-xs text-muted-foreground'>
                        {producto.presentacion_nombre}
                      </p>
                      <p className='text-xs font-medium tabular-nums text-primary'>
                        {formatCurrencyCLP(producto.precio_venta)}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            )}

            <p className='text-xs text-muted-foreground'>
              Bebidas hasta {formatCurrencyCLP(topeCortesia)} incluidas en el cover
              {adicionalNumero === 0 && (
                <span className='ml-1'>
                  · Selecciona un producto por entrada ({totalProductosSeleccionados}/
                  {cantidadEntradas})
                </span>
              )}
              {adicionalNumero > 0 && (
                <span className='ml-1'>
                  ({cantidadEntradas} × {formatCurrencyCLP(costoEntradaPredeterminado)} +{' '}
                  {formatCurrencyCLP(adicionalNumero)} adicional)
                </span>
              )}
              .
            </p>
          </div>

          {productosSeleccionados.length > 0 && (
            <div className='space-y-3 rounded-xl border p-3'>
              <div className='flex items-center justify-between gap-2'>
                <Label>Productos seleccionados ({totalProductosSeleccionados})</Label>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setProductosSeleccionados([])}
                >
                  Limpiar
                </Button>
              </div>
              {adicionalNumero > 0 && (
                <p className='text-xs text-muted-foreground'>
                  Total de productos: {formatCurrencyCLP(valorProductosSeleccionados)} /{' '}
                  {formatCurrencyCLP(montoTotalProductosPermitido)} requeridos
                </p>
              )}
              {productosSeleccionados.map(item => {
                const producto = productosBar.find(p => p.presentacion_id === item.presentacionId);
                if (!producto) return null;
                const unidades = unidadesAcompanamiento(producto);
                return (
                  <div
                    key={item.presentacionId}
                    className='flex flex-wrap items-center gap-3 border-t pt-3'
                  >
                    <div className='min-w-36 flex-1'>
                      <p className='text-sm font-medium'>
                        {producto.producto_nombre} · {producto.presentacion_nombre}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {formatCurrencyCLP(producto.precio_venta)} · {producto.stock_bar} en bar
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        aria-label={`Quitar una unidad de ${producto.producto_nombre}`}
                        onClick={() =>
                          cambiarCantidadProducto(item.presentacionId, item.cantidad - 1)
                        }
                      >
                        <Minus className='h-4 w-4' />
                      </Button>
                      <span className='w-6 text-center tabular-nums'>{item.cantidad}</span>
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        aria-label={`Agregar una unidad de ${producto.producto_nombre}`}
                        disabled={
                          item.cantidad >= producto.stock_bar ||
                          totalProductosSeleccionados >= maxProductosSeleccionables
                        }
                        onClick={() =>
                          cambiarCantidadProducto(item.presentacionId, item.cantidad + 1)
                        }
                      >
                        <Plus className='h-4 w-4' />
                      </Button>
                    </div>
                    {unidades > 0 && (
                      <div className='w-full sm:w-72'>
                        <Label htmlFor={`acompanamiento-${item.presentacionId}`}>
                          Acompañamiento ({unidades} unidad{unidades === 1 ? '' : 'es'} por
                          producto)
                        </Label>
                        <SearchableSelect
                          id={`acompanamiento-${item.presentacionId}`}
                          value={item.acompanamientoId}
                          onChange={value =>
                            setProductosSeleccionados(actuales =>
                              actuales.map(actual =>
                                actual.presentacionId === item.presentacionId
                                  ? { ...actual, acompanamientoId: value }
                                  : actual
                              )
                            )
                          }
                          placeholder={
                            acompanamientosLoading
                              ? 'Cargando acompañamientos…'
                              : 'Seleccionar bebida acompañante'
                          }
                          searchPlaceholder='Buscar bebida…'
                          options={[
                            { value: '', label: 'Seleccionar acompañamiento' },
                            ...bebidasAcompanamiento
                              .filter(
                                bebida =>
                                  bebida.id !== item.presentacionId &&
                                  bebida.stock_bar >= unidades * item.cantidad
                              )
                              .map(bebida => ({
                                value: bebida.id,
                                label: `${bebida.producto_nombre} · ${bebida.nombre} · ${bebida.stock_bar} en bar`,
                                keywords: [bebida.producto_nombre, bebida.nombre]
                              }))
                          ]}
                        />
                        {acompanamientosError && (
                          <p className='mt-1 text-xs text-destructive' role='alert'>
                            {acompanamientosError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className='text-right text-sm text-muted-foreground'>
            Total a cobrar:{' '}
            <span className='font-semibold text-foreground'>
              {formatCurrencyCLP(
                costoEntradaPredeterminado * cantidadEntradas + Number(montoBebida || 0)
              )}
            </span>
          </p>
          <div className='flex justify-center pt-1'>
            <Button
              type='submit'
              disabled={saving || !hasOpenCaja}
              className='w-full rounded-full sm:w-auto'
            >
              <UserRoundPlus className='mr-2 h-4 w-4' />
              {saving
                ? 'Registrando…'
                : cantidadEntradas > 1
                  ? `Registrar ${cantidadEntradas} entradas`
                  : 'Registrar entrada'}
            </Button>
          </div>
        </form>
      )}

      <section className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='font-semibold'>Entradas registradas</h2>
            <p className='text-sm text-muted-foreground'>Detalle por fecha seleccionada.</p>
          </div>
          <Input
            aria-label='Filtrar entradas por fecha'
            type='date'
            className='w-auto'
            value={fechaFiltro}
            onChange={event => setFechaFiltro(event.target.value)}
          />
        </div>
        {loading ? (
          <p className='text-sm text-muted-foreground'>Cargando entradas…</p>
        ) : entradas.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No hay entradas registradas para esta fecha.
          </p>
        ) : (
          <Table className='w-full table-fixed text-sm'>
            <TableHeader className='bg-muted/50 text-muted-foreground'>
              <TableRow>
                <TableHead>Monto entrada</TableHead>
                <TableHead>Adicional bebida</TableHead>
                <TableHead>Método de pago</TableHead>
                <TableHead>Producto de cortesía</TableHead>
                <TableHead>Registró</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead className='text-right'>Ver detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gruposEntradas.map(grupo => {
                const primero = grupo.registros[0];
                const tieneVenta = grupo.monto_bebida_adicional > 0;
                return (
                  <TableRow key={grupo.id} className='transform-none hover:transform-none'>
                    <TableCell className='tabular-nums'>
                      {formatCurrencyCLP(tieneVenta ? 0 : grupo.monto_entrada)}
                    </TableCell>
                    <TableCell
                      className='tabular-nums'
                      title={
                        tieneVenta
                          ? 'Incluye el monto de entrada; total registrado en Ventas'
                          : undefined
                      }
                    >
                      {formatCurrencyCLP(
                        tieneVenta ? grupo.monto_entrada + grupo.monto_bebida_adicional : 0
                      )}
                      {tieneVenta && (
                        <span className='ml-1 text-xs text-muted-foreground'>(Venta)</span>
                      )}
                    </TableCell>
                    <TableCell className='capitalize'>{primero.metodo_pago}</TableCell>
                    <TableCell>
                      <span className='inline-flex items-center gap-2'>
                        {grupo.cantidad_productos_cortesia > 0
                          ? `${grupo.cantidad_productos_cortesia} producto(s) · ${grupo.registros.length} entrada(s)`
                          : `${grupo.registros.length} entrada(s) · Sin productos`}
                      </span>
                    </TableCell>
                    <TableCell>{primero.registrado_por_nombre}</TableCell>
                    <TableCell className='tabular-nums'>{primero.hora}</TableCell>
                    <TableCell className='text-right'>
                      <TooltipProvider>
                        <Tooltip delayDuration={250}>
                          <TooltipTrigger asChild>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              disabled={detalleVentaCargando === grupo.id}
                              aria-label={
                                detalleVentaCargando === grupo.id
                                  ? 'Cargando detalle…'
                                  : `Ver detalle de ${grupo.registros.length} entrada(s)`
                              }
                              onClick={() => abrirDetalle(grupo)}
                              className='rounded-full transition-all duration-200 hover:scale-110 hover:bg-primary/10 hover:text-primary hover:shadow-md active:scale-95'
                            >
                              <Eye className='h-4 w-4 transition-transform duration-200 group-hover:scale-110' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className='rounded-xl border-none bg-black px-3 py-1.5 text-xs font-bold text-white shadow-xl dark:bg-white dark:text-black'>
                            Ver detalle
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
      <Dialog open={Boolean(grupoDetalle)} onOpenChange={open => !open && setGrupoDetalleId(null)}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Detalle de entradas</DialogTitle>
            <DialogDescription>
              {grupoDetalle &&
                `Registrado por ${grupoDetalle.registros[0]?.registrado_por_nombre || '–'} · ${grupoDetalle.registros[0]?.hora || ''}`}
            </DialogDescription>
          </DialogHeader>
          {grupoDetalle && (
            <div className='space-y-4'>
              <div className='grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2'>
                <div>
                  <p className='text-muted-foreground'>Monto de entrada</p>
                  <p className='font-semibold'>
                    {formatCurrencyCLP(
                      grupoDetalle.monto_bebida_adicional > 0 ? 0 : grupoDetalle.monto_entrada
                    )}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground'>
                    {grupoDetalle.monto_bebida_adicional > 0
                      ? 'Adicional + entrada (Venta)'
                      : 'Monto adicional'}
                  </p>
                  <p className='font-semibold'>
                    {formatCurrencyCLP(
                      grupoDetalle.monto_bebida_adicional > 0
                        ? grupoDetalle.monto_entrada + grupoDetalle.monto_bebida_adicional
                        : 0
                    )}
                  </p>
                </div>
              </div>
              {grupoDetalle.monto_bebida_adicional > 0 ? (
                <div className='rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm'>
                  <p className='font-semibold'>Registrado en Ventas</p>
                  <p className='text-muted-foreground'>
                    Total de la venta:{' '}
                    {formatCurrencyCLP(
                      grupoDetalle.monto_entrada + grupoDetalle.monto_bebida_adicional
                    )}
                    . El monto de entrada no se registró en los montos de Entradas.
                  </p>
                </div>
              ) : (
                <div className='rounded-lg border p-4 text-sm'>
                  <p className='text-muted-foreground'>Total registrado en Entradas</p>
                  <p className='font-semibold'>{formatCurrencyCLP(grupoDetalle.monto_entrada)}</p>
                </div>
              )}
              <div className='space-y-2'>
                <h3 className='text-sm font-semibold'>Productos y cantidades</h3>
                {productosDetalle.length > 0 ? (
                  <Table className='text-sm'>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className='w-28 text-right'>Cantidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productosDetalle.map(producto => (
                        <TableRow key={producto.nombre}>
                          <TableCell>{producto.nombre}</TableCell>
                          <TableCell className='text-right tabular-nums'>
                            {producto.cantidad}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className='rounded-lg border px-4 py-3 text-sm text-muted-foreground'>
                    Sin productos
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <SalesDetailModal
        open={Boolean(detalleVenta)}
        onOpenChange={open => !open && setDetalleVenta(null)}
        selectedVenta={detalleVenta}
        anfitrionaColors={anfitrionaColors}
        metodoPagoLabels={metodoPagoLabels}
      />
    </main>
  );
}
