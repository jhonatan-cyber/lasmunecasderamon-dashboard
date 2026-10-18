'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { DollarSign, Ticket, UserRoundPlus } from 'lucide-react';
import { CajaStatusBanner } from '@/components/sales/CajaStatusBanner';
import { MetricCard } from '@/components/shared/MetricCard';
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
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useConfigValue } from '@/hooks/shared/useConfigValue';

type Entrada = {
  id: string;
  cliente_nombre: string | null;
  monto_entrada: number;
  monto_bebida_adicional: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  bebida_cortesia_presentacion_id: string | null;
  bebida_cortesia: string | null;
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
  opciones_venta?: { tipo: string; acompanamiento?: { unidades: number } }[];
};

type BebidaAcompanamiento = {
  id: string;
  producto_nombre: string;
  nombre: string;
  stock_bar: number;
};

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

export default function EntradasPage() {
  const [fechaFiltro, setFechaFiltro] = useState(fechaLocal);
  const [fechaHoraEntrada, setFechaHoraEntrada] = useState(fechaHoraLocal);
  const [montoBebida, setMontoBebida] = useState('0');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>(
    'efectivo'
  );
  const [bebidaCortesiaId, setBebidaCortesiaId] = useState('');
  const [bebidaAcompanamientoId, setBebidaAcompanamientoId] = useState('');
  const [productosBar, setProductosBar] = useState<ProductoCortesia[]>([]);
  const [bebidasAcompanamiento, setBebidasAcompanamiento] = useState<BebidaAcompanamiento[]>([]);
  const [productosLoading, setProductosLoading] = useState(true);
  const [productosError, setProductosError] = useState('');
  const [acompanamientosLoading, setAcompanamientosLoading] = useState(false);
  const [acompanamientosError, setAcompanamientosError] = useState('');
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { hasOpenCaja } = useCashRegisterStatus();
  const { hasPermission } = useUserPermissions();
  const canCreate = hasPermission('products', 'write');
  const costoEntradaPredeterminado = Number(useConfigValue('comisiones', 'costo_entrada', 10000));
  const montoMaximoBebida = costoEntradaPredeterminado + Number(montoBebida || 0);
  const productosCortesia = useMemo(
    () => productosBar.filter(producto => producto.precio_venta <= montoMaximoBebida),
    [productosBar, montoMaximoBebida]
  );

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
    if (!bebidaCortesiaId || unidadesAcompanamientoRequeridas <= 0) {
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
  }, [bebidaCortesiaId, unidadesAcompanamientoRequeridas]);

  useEffect(() => {
    if (bebidaCortesiaId && !productosCortesia.some(p => p.presentacion_id === bebidaCortesiaId))
      setBebidaCortesiaId('');
  }, [bebidaCortesiaId, productosCortesia]);

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

  const total = useMemo(
    () => entradas.reduce((sum, item) => sum + Number(item.monto_entrada), 0),
    [entradas]
  );
  const registrar = async (event: FormEvent) => {
    event.preventDefault();
    const base = costoEntradaPredeterminado;
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
    if (unidadesAcompanamientoRequeridas > 0 && !bebidaAcompanamientoId) {
      toast.error('Selecciona el acompañamiento configurado para esta bebida');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/entradas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto_entrada: base,
          monto_bebida_adicional: adicional,
          metodo_pago: metodoPago,
          bebida_cortesia_presentacion_id: bebidaCortesiaId || null,
          bebida_acompanamiento_presentacion_id: bebidaAcompanamientoId || null,
          fecha: fechaHoraEntrada.fecha,
          hora: fechaHoraEntrada.hora
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo registrar la entrada');
      toast.success('Entrada registrada');
      setMontoBebida('0');
      setBebidaCortesiaId('');
      setBebidaAcompanamientoId('');
      setFechaHoraEntrada(fechaHoraLocal());
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
        />
        <MetricCard
          icon={<DollarSign />}
          badge='Solo monto base'
          label='Total de entradas'
          value={formatCurrencyCLP(total)}
          tone='emerald'
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
              <Input
                id='entrada-monto'
                type='text'
                value={formatCurrencyCLP(costoEntradaPredeterminado)}
                readOnly
                aria-readonly='true'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='entrada-adicional'>Adicional por otra bebida</Label>
              <Input
                id='entrada-adicional'
                type='number'
                min={0}
                step={1}
                inputMode='numeric'
                value={montoBebida}
                onChange={event => setMontoBebida(event.target.value || '0')}
                placeholder='0'
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
            <div className='space-y-2'>
              <Label htmlFor='entrada-bebida-cortesia'>Bebida incluida</Label>
              <SearchableSelect
                id='entrada-bebida-cortesia'
                value={bebidaCortesiaId}
                onChange={value => {
                  setBebidaCortesiaId(value);
                  setBebidaAcompanamientoId('');
                }}
                placeholder={
                  productosLoading
                    ? 'Cargando productos…'
                    : `Sin bebida (hasta ${formatCurrencyCLP(montoMaximoBebida)})`
                }
                searchPlaceholder='Buscar producto…'
                options={[
                  { value: '', label: 'Sin bebida' },
                  ...productosCortesia.map(producto => ({
                    value: producto.presentacion_id,
                    label: `${producto.producto_nombre} · ${producto.presentacion_nombre} · ${formatCurrencyCLP(producto.precio_venta)} · ${producto.stock_bar} en bar`,
                    keywords: [producto.producto_nombre, producto.presentacion_nombre]
                  }))
                ]}
              />
              {productosError ? (
                <p className='text-xs text-destructive' role='alert'>
                  {productosError}
                </p>
              ) : (
                <p className='text-xs text-muted-foreground'>
                  Se muestran bebidas con precio de venta hasta{' '}
                  {formatCurrencyCLP(montoMaximoBebida)} (entrada + adicional).
                </p>
              )}
            </div>
            {unidadesAcompanamientoRequeridas > 0 && (
              <div className='space-y-2'>
                <Label htmlFor='entrada-bebida-acompanamiento'>Acompañamiento</Label>
                <SearchableSelect
                  id='entrada-bebida-acompanamiento'
                  value={bebidaAcompanamientoId}
                  onChange={setBebidaAcompanamientoId}
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
                          bebida.id !== bebidaCortesiaId &&
                          bebida.stock_bar >= unidadesAcompanamientoRequeridas
                      )
                      .map(bebida => ({
                        value: bebida.id,
                        label: `${bebida.producto_nombre} · ${bebida.nombre} · ${bebida.stock_bar} en bar`,
                        keywords: [bebida.producto_nombre, bebida.nombre]
                      }))
                  ]}
                />
                {acompanamientosError ? (
                  <p className='text-xs text-destructive' role='alert'>
                    {acompanamientosError}
                  </p>
                ) : (
                  <p className='text-xs text-muted-foreground'>
                    Esta bebida incluye {unidadesAcompanamientoRequeridas} unidad(es) de
                    acompañamiento.
                  </p>
                )}
              </div>
            )}
          </div>
          <p className='text-right text-sm text-muted-foreground'>
            Total a cobrar:{' '}
            <span className='font-semibold text-foreground'>
              {formatCurrencyCLP(costoEntradaPredeterminado + Number(montoBebida || 0))}
            </span>
          </p>
          <div className='flex justify-center pt-1'>
            <Button
              type='submit'
              disabled={saving || !hasOpenCaja}
              className='w-full rounded-full sm:w-auto'
            >
              <UserRoundPlus className='mr-2 h-4 w-4' />
              {saving ? 'Registrando…' : 'Registrar entrada'}
            </Button>
          </div>
        </form>
      )}

      <section className='overflow-hidden rounded-2xl border bg-card shadow-xs'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b p-4'>
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
          <p className='p-6 text-sm text-muted-foreground'>Cargando entradas…</p>
        ) : entradas.length === 0 ? (
          <p className='p-6 text-sm text-muted-foreground'>
            No hay entradas registradas para esta fecha.
          </p>
        ) : (
          <div className='overflow-x-auto'>
            <Table className='min-w-[1050px] text-sm'>
              <TableHeader className='bg-muted/50 text-muted-foreground'>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto entrada</TableHead>
                  <TableHead>Adicional bebida</TableHead>
                  <TableHead>Método de pago</TableHead>
                  <TableHead>Producto de cortesía</TableHead>
                  <TableHead>Registró</TableHead>
                  <TableHead>Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entradas.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className='font-medium'>
                      {item.cliente_nombre || 'Sin nombre'}
                    </TableCell>
                    <TableCell className='tabular-nums'>
                      {formatCurrencyCLP(Number(item.monto_entrada))}
                    </TableCell>
                    <TableCell className='tabular-nums'>
                      {formatCurrencyCLP(Number(item.monto_bebida_adicional))}
                    </TableCell>
                    <TableCell className='capitalize'>{item.metodo_pago}</TableCell>
                    <TableCell>
                      {item.bebida_cortesia
                        ? `${item.bebida_cortesia}${item.acompanamiento_bebida ? ` + ${item.acompanamiento_bebida}` : ''}`
                        : 'No'}
                    </TableCell>
                    <TableCell>{item.registrado_por_nombre}</TableCell>
                    <TableCell className='tabular-nums'>{item.hora}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  );
}
