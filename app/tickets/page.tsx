'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { DollarSign, Eye, Minus, Plus, Ticket, UserRoundPlus } from 'lucide-react';
import { BaucherFileInput } from '@/components/shared/BaucherFileInput';
import { BaucherFoto } from '@/components/shared/BaucherFoto';
import { CajaStatusBanner } from '@/components/sales/CajaStatusBanner';
import { DatePicker } from '@/components/shared/DatePicker';
import { MetricCard } from '@/components/shared/MetricCard';
import { Badge } from '@/components/ui/badge';
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
import {
  EntregaCortesiasDialog,
  type GrupoCortesia
} from '@/components/bar/EntregaCortesiasDialog';
import { EntregaEntradaDialog } from '@/components/entradas/EntregaEntradaDialog';
import { useCashRegisterStatus } from '@/hooks/cash-register/useCashRegisterStatus';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { fechaDeNegocio } from '@/lib/business/timezoneService';
import { useConfigValue } from '@/hooks/shared/useConfigValue';

type EstadoCortesia = 'pendiente' | 'entregada' | 'anulada';

type Entrada = {
  id: string;
  grupo_registro_id: string | null;
  cliente_nombre: string | null;
  monto_entrada: number;
  monto_bebida_adicional: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  /** Nombre del archivo en `public/img/tickets`; sólo lo tienen las de transferencia. */
  baucher_foto: string | null;
  venta_id: string | null;
  bebida_cortesia_presentacion_id: string | null;
  bebida_cortesia: string | null;
  bebida_acompanamiento_presentacion_id: string | null;
  acompanamiento_bebida: string | null;
  productos_cortesia?: string | null;
  cantidad_productos_cortesia: number;
  fecha: string;
  hora: string;
  registrado_por_nombre: string;
  cortesia_estado: EstadoCortesia;
  cortesia_entregada_at: string | null;
  cortesia_entregada_por_nombre: string | null;
};

type GrupoEntrada = {
  id: string;
  registros: Entrada[];
  monto_entrada: number;
  monto_bebida_adicional: number;
  venta_id: string | null;
  pendientes: Entrada[];
  entregadas: Entrada[];
  anuladas: number;
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
  return { fecha: fechaDeNegocio(ahora), hora: horaLocal() };
};

const formatoFechaHora = ({ fecha, hora }: { fecha: string; hora: string }) => {
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year} · ${hora}`;
};

/** `cortesia_entregada_at` llega como `AAAA-MM-DD HH:MM` desde el listado. */
const formatoEntrega = (valor: string | null) => {
  if (!valor) return 'Entregada';
  const [fecha, hora = ''] = valor.split(' ');
  return fecha && hora ? `Entregada ${formatoFechaHora({ fecha, hora })}` : `Entregada ${valor}`;
};

const estadoEtiqueta = (estado: EstadoCortesia) => {
  if (estado === 'entregada') return 'Entregada';
  if (estado === 'anulada') return 'Anulada';
  return 'Pendiente';
};

const varianteEstado = (estado: EstadoCortesia): 'success' | 'secondary' | 'destructive' => {
  if (estado === 'entregada') return 'success';
  if (estado === 'anulada') return 'destructive';
  return 'secondary';
};

/** Resumen del grupo: "Entregada" si no queda nada pendiente, o el conteo por estado. */
const estadoGrupo = (grupo: GrupoEntrada) => {
  if (grupo.pendientes.length === 0 && grupo.anuladas === 0) return 'Entregada';
  const partes: string[] = [];
  if (grupo.pendientes.length > 0)
    partes.push(`${grupo.pendientes.length} pendiente${grupo.pendientes.length === 1 ? '' : 's'}`);
  if (grupo.entregadas.length > 0)
    partes.push(`${grupo.entregadas.length} entregada${grupo.entregadas.length === 1 ? '' : 's'}`);
  if (grupo.anuladas > 0)
    partes.push(`${grupo.anuladas} anulada${grupo.anuladas === 1 ? '' : 's'}`);
  return partes.join(' · ');
};

const varianteGrupo = (grupo: GrupoEntrada): 'success' | 'secondary' | 'destructive' => {
  if (grupo.pendientes.length === 0 && grupo.anuladas === 0) return 'success';
  if (grupo.pendientes.length > 0) return 'secondary';
  return 'destructive';
};

export default function EntradasPage() {
  const [fechaFiltro, setFechaFiltro] = useState(fechaDeNegocio);
  const [fechaHoraEntrada, setFechaHoraEntrada] = useState(fechaHoraLocal);
  const [clienteNombre, setClienteNombre] = useState('');
  const [cantidadEntradas, setCantidadEntradas] = useState(1);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>(
    'efectivo'
  );
  /** Foto del baucher en data URL: obligatoria cuando el pago es transferencia. */
  const [baucherFoto, setBaucherFoto] = useState<string | null>(null);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [grupoDetalleId, setGrupoDetalleId] = useState<string | null>(null);
  const [entradaAEntregar, setEntradaAEntregar] = useState<Entrada | null>(null);
  const [grupoAEntregar, setGrupoAEntregar] = useState<GrupoCortesia | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [anulandoGrupoId, setAnulandoGrupoId] = useState<string | null>(null);
  const operacionEntrada = useRef<{ signature: string; key: string } | null>(null);
  const { hasOpenCaja } = useCashRegisterStatus();
  const { hasPermission } = useUserPermissions();
  const canCreate = hasPermission('entradas', 'create');
  const canDeliver = hasPermission('entradas', 'deliver');
  const costoEntradaPredeterminado = Number(useConfigValue('comisiones', 'costo_entrada', 10000));
  const topeCortesia = Number(
    useConfigValue('comisiones', 'monto_base_trago_cortesia_cliente', 10000)
  );
  const totalPuerta = costoEntradaPredeterminado * cantidadEntradas;

  useEffect(() => {
    const actualizarFechaHora = () => setFechaHoraEntrada(fechaHoraLocal());
    const interval = window.setInterval(actualizarFechaHora, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const cargar = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const entriesResponse = await fetch(
          `/api/tickets?fecha=${encodeURIComponent(fechaFiltro)}`,
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
        if (!silent) setLoading(false);
      }
    },
    [fechaFiltro]
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // La puerta y la barra mueven la misma lista: se refresca en vivo sin
  // reemplazar la tabla por el mensaje de carga.
  useRealtimeRefresh('tickets', () => cargar(true));

  const gruposEntradas = useMemo(() => {
    const grupos = new Map<string, GrupoEntrada>();
    for (const entrada of entradas) {
      const id = entrada.grupo_registro_id || entrada.id;
      let grupo = grupos.get(id);
      if (!grupo) {
        grupo = {
          id,
          registros: [],
          monto_entrada: 0,
          monto_bebida_adicional: 0,
          venta_id: null,
          pendientes: [],
          entregadas: [],
          anuladas: 0
        };
        grupos.set(id, grupo);
      }
      grupo.registros.push(entrada);
      grupo.monto_entrada += Number(entrada.monto_entrada);
      grupo.monto_bebida_adicional += Number(entrada.monto_bebida_adicional || 0);
      if (!grupo.venta_id && entrada.venta_id) grupo.venta_id = entrada.venta_id;
      if (entrada.cortesia_estado === 'pendiente') grupo.pendientes.push(entrada);
      else if (entrada.cortesia_estado === 'entregada') grupo.entregadas.push(entrada);
      else grupo.anuladas += 1;
    }
    return Array.from(grupos.values());
  }, [entradas]);

  // En la puerta el único dinero que entra es el de las entradas cobradas.
  const total = useMemo(
    () => entradas.reduce((sum, entrada) => sum + Number(entrada.monto_entrada), 0),
    [entradas]
  );
  const grupoDetalle = gruposEntradas.find(grupo => grupo.id === grupoDetalleId) ?? null;
  // El baucher se guarda una vez por grupo: las filas del registro comparten el archivo.
  const baucherDetalle = grupoDetalle?.registros.find(registro => registro.baucher_foto) ?? null;
  const baucherDescripcion =
    grupoDetalle && baucherDetalle
      ? `${grupoDetalle.registros[0].cliente_nombre || 'Entrada'} · ${formatoFechaHora({
          fecha: grupoDetalle.registros[0].fecha,
          hora: grupoDetalle.registros[0].hora
        })}`
      : '';

  const registrar = async (event: FormEvent) => {
    event.preventDefault();
    if (!Number.isInteger(cantidadEntradas) || cantidadEntradas < 1 || cantidadEntradas > 100) {
      toast.error('Indica entre 1 y 100 entradas para registrar');
      return;
    }
    if (metodoPago === 'transferencia' && !baucherFoto) {
      toast.error('Adjunta la foto del baucher de la transferencia');
      return;
    }
    const montoEntrada = costoEntradaPredeterminado * cantidadEntradas;
    if (!Number.isInteger(montoEntrada) || montoEntrada <= 0) {
      toast.error('El costo de entrada no está configurado');
      return;
    }
    const { fecha, hora } = fechaHoraLocal();
    const payload = {
      cliente_nombre: clienteNombre.trim(),
      cantidad_entradas: cantidadEntradas,
      metodo_pago: metodoPago,
      ...(metodoPago === 'transferencia' && baucherFoto ? { baucher_foto: baucherFoto } : {}),
      fecha,
      hora,
      monto_entrada: montoEntrada
    };
    // La clave se deriva sólo del intento (cliente, cantidad, método): reintentar
    // el mismo envío no duplica filas aunque cambie el minuto de la puerta.
    const signature = JSON.stringify({
      cliente_nombre: payload.cliente_nombre,
      cantidad_entradas: payload.cantidad_entradas,
      metodo_pago: payload.metodo_pago
    });
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
      const response = await fetch('/api/tickets', {
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
      setClienteNombre('');
      setCantidadEntradas(1);
      setFechaHoraEntrada(fechaHoraLocal());
      setBaucherFoto(null);
      operacionEntrada.current = null;
      await cargar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al registrar la entrada');
    } finally {
      setSaving(false);
    }
  };

  const anularPendientes = async (grupo: GrupoEntrada) => {
    if (grupo.pendientes.length === 0) return;
    const confirmado = window.confirm(
      grupo.pendientes.length === 1
        ? '¿Anular la entrada pendiente de este grupo? El monto se registrará como entrada en la caja.'
        : `¿Anular las ${grupo.pendientes.length} entradas pendientes de este grupo? El monto se registrará como entrada en la caja.`
    );
    if (!confirmado) return;
    setAnulandoGrupoId(grupo.id);
    let anuladas = 0;
    try {
      for (const pendiente of grupo.pendientes) {
        const response = await fetch(`/api/tickets/${pendiente.id}/anular`, { method: 'POST' });
        const result = await response.json();
        if (!response.ok || !result.success)
          throw new Error(result.message || 'No se pudo anular la entrada');
        anuladas += 1;
      }
      toast.success(anuladas === 1 ? 'Entrada anulada' : `${anuladas} entradas anuladas`);
      await cargar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al anular las entradas');
      if (anuladas > 0) await cargar();
    } finally {
      setAnulandoGrupoId(null);
    }
  };

  const abrirEntregaMultiple = (grupo: GrupoEntrada) => {
    const pendientes = grupo.pendientes;
    if (pendientes.length === 0) return;
    const primero = pendientes[0];
    setGrupoAEntregar({
      id: grupo.id,
      cliente:
        pendientes.find(fila => fila.cliente_nombre)?.cliente_nombre ??
        grupo.registros[0]?.cliente_nombre ??
        null,
      filas: pendientes.map(fila => ({
        id: fila.id,
        monto_entrada: Number(fila.monto_entrada),
        hora: fila.hora
      })),
      cantidad: pendientes.length,
      total: pendientes.reduce((suma, fila) => suma + Number(fila.monto_entrada), 0),
      montoUnitario: Number(primero.monto_entrada),
      metodo: primero.metodo_pago,
      hora: primero.hora,
      registradoPor: primero.registrado_por_nombre
    });
    setGrupoDetalleId(null);
  };

  return (
    <main className='w-full space-y-6 p-4 sm:p-6 lg:p-8'>
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
          badge='Cobrado en la puerta'
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
            <p className='text-xs text-muted-foreground'>
              En la puerta sólo se cobra la entrada; la bebida se elige y se entrega en la barra.
            </p>
          </div>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
            <div className='space-y-2'>
              <Label htmlFor='entrada-cliente'>Cliente (opcional)</Label>
              <Input
                id='entrada-cliente'
                type='text'
                value={clienteNombre}
                onChange={event => setClienteNombre(event.target.value)}
                placeholder='Sin nombre'
                autoComplete='off'
                maxLength={120}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='entrada-cantidad'>Cantidad de entradas</Label>
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  aria-label='Disminuir cantidad de entradas'
                  onClick={() => setCantidadEntradas(prev => Math.max(1, prev - 1))}
                  disabled={cantidadEntradas <= 1}
                  className='rounded-full'
                >
                  <Minus className='h-4 w-4' />
                </Button>
                <Input
                  id='entrada-cantidad'
                  type='number'
                  inputMode='numeric'
                  min={1}
                  max={100}
                  value={cantidadEntradas}
                  onChange={event => {
                    const siguiente = event.target.valueAsNumber;
                    if (!Number.isFinite(siguiente)) return;
                    setCantidadEntradas(Math.min(100, Math.max(1, Math.trunc(siguiente))));
                  }}
                  className='text-center'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  aria-label='Aumentar cantidad de entradas'
                  onClick={() => setCantidadEntradas(prev => Math.min(100, prev + 1))}
                  disabled={cantidadEntradas >= 100}
                  className='rounded-full'
                >
                  <Plus className='h-4 w-4' />
                </Button>
              </div>
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
              <Label htmlFor='entrada-total'>Total a cobrar</Label>
              <Input
                id='entrada-total'
                type='text'
                value={formatCurrencyCLP(totalPuerta)}
                readOnly
                aria-readonly='true'
              />
              {cantidadEntradas > 1 && (
                <p className='text-xs text-muted-foreground'>
                  {cantidadEntradas} × {formatCurrencyCLP(costoEntradaPredeterminado)}
                </p>
              )}
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
          {metodoPago === 'transferencia' && (
            <div className='rounded-xl border border-dashed border-amber-400/70 bg-amber-50/70 p-3 dark:border-amber-500/30 dark:bg-amber-500/10'>
              <BaucherFileInput
                id='entrada-baucher'
                label='Foto del baucher (obligatoria)'
                hint='Es la constancia del pago: sin la foto no se registra la entrada.'
                value={baucherFoto}
                onChange={setBaucherFoto}
              />
            </div>
          )}
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

      <section className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='font-semibold'>Entradas registradas</h2>
            <p className='text-sm text-muted-foreground'>Detalle por fecha seleccionada.</p>
          </div>
          <DatePicker
            ariaLabel='Filtrar entradas por fecha'
            displayFormat='short'
            className='w-auto'
            value={fechaFiltro}
            onChange={setFechaFiltro}
          />
        </div>
        {loading ? (
          <p className='text-sm text-muted-foreground'>Cargando entradas…</p>
        ) : entradas.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No hay entradas registradas para esta fecha.
          </p>
        ) : (
          <Table className='w-full text-sm'>
            <TableHeader className='bg-muted/50 text-muted-foreground'>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Entradas</TableHead>
                <TableHead>Monto entrada</TableHead>
                <TableHead>Método de pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Registró</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead className='text-right'>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gruposEntradas.map(grupo => {
                const primero = grupo.registros[0];
                return (
                  <TableRow key={grupo.id} className='align-top'>
                    <TableCell className='font-medium'>
                      {primero.cliente_nombre || 'Sin nombre'}
                    </TableCell>
                    <TableCell className='tabular-nums'>{grupo.registros.length}</TableCell>
                    <TableCell className='tabular-nums'>
                      {formatCurrencyCLP(grupo.monto_entrada)}
                    </TableCell>
                    <TableCell className='capitalize'>{primero.metodo_pago}</TableCell>
                    <TableCell>
                      <div className='space-y-1'>
                        <Badge variant={varianteGrupo(grupo)}>{estadoGrupo(grupo)}</Badge>
                        {grupo.entregadas.map(entrega => (
                          <p key={entrega.id} className='text-xs text-muted-foreground'>
                            {formatoEntrega(entrega.cortesia_entregada_at)}
                            {entrega.cortesia_entregada_por_nombre
                              ? ` · ${entrega.cortesia_entregada_por_nombre}`
                              : ''}
                          </p>
                        ))}
                        {grupo.venta_id && (
                          <p className='text-xs text-muted-foreground'>
                            Adicional {formatCurrencyCLP(grupo.monto_bebida_adicional)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{primero.registrado_por_nombre}</TableCell>
                    <TableCell className='tabular-nums'>{primero.hora}</TableCell>
                    <TableCell className='text-right'>
                      <div className='flex flex-wrap items-center justify-end gap-2'>
                        {canDeliver && grupo.pendientes.length > 0 && (
                          <Button
                            type='button'
                            size='sm'
                            disabled={anulandoGrupoId === grupo.id}
                            onClick={() => {
                              // Una sola pendiente: se entrega directo. Varias: la
                              // entrega múltiple reparte los productos en el acto;
                              // el detalle sigue disponible desde el ojo.
                              if (grupo.pendientes.length === 1)
                                setEntradaAEntregar(grupo.pendientes[0]);
                              else abrirEntregaMultiple(grupo);
                            }}
                            className='rounded-full'
                          >
                            {grupo.pendientes.length > 1
                              ? `Entregar (${grupo.pendientes.length})`
                              : 'Entregar'}
                          </Button>
                        )}
                        {canDeliver && grupo.pendientes.length > 0 && (
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={anulandoGrupoId === grupo.id}
                            onClick={() => void anularPendientes(grupo)}
                            className='rounded-full'
                          >
                            {anulandoGrupoId === grupo.id
                              ? 'Anulando…'
                              : `Anular pendientes (${grupo.pendientes.length})`}
                          </Button>
                        )}
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          aria-label={`Ver detalle de ${grupo.registros.length} entrada(s)`}
                          onClick={() => setGrupoDetalleId(grupo.id)}
                          className='rounded-full transition-all duration-200 hover:scale-110 hover:bg-primary/10 hover:text-primary hover:shadow-md active:scale-95'
                        >
                          <Eye className='h-4 w-4' />
                        </Button>
                      </div>
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
                `${grupoDetalle.registros.length} entrada(s) · ${formatoFechaHora({
                  fecha: grupoDetalle.registros[0].fecha,
                  hora: grupoDetalle.registros[0].hora
                })}`}
            </DialogDescription>
          </DialogHeader>
          {grupoDetalle && (
            <div className='space-y-4'>
              <div className='grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2'>
                <div>
                  <p className='text-muted-foreground'>Cliente</p>
                  <p className='font-semibold'>
                    {grupoDetalle.registros[0].cliente_nombre || 'Sin nombre'}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground'>Método de pago</p>
                  <p className='font-semibold capitalize'>
                    {grupoDetalle.registros[0].metodo_pago}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground'>Cobrado en la puerta</p>
                  <p className='font-semibold'>{formatCurrencyCLP(grupoDetalle.monto_entrada)}</p>
                </div>
                <div>
                  <p className='text-muted-foreground'>Registró</p>
                  <p className='font-semibold'>{grupoDetalle.registros[0].registrado_por_nombre}</p>
                </div>
              </div>
              {canDeliver && grupoDetalle.pendientes.length > 1 ? (
                <Button
                  type='button'
                  className='w-full rounded-full'
                  onClick={() => abrirEntregaMultiple(grupoDetalle)}
                >
                  Entregar todas las pendientes ({grupoDetalle.pendientes.length})
                </Button>
              ) : null}
              {baucherDetalle && (
                <BaucherFoto
                  src={`/api/tickets/${baucherDetalle.id}/baucher`}
                  descripcion={baucherDescripcion}
                />
              )}
              <div className='space-y-2'>
                <h3 className='text-sm font-semibold'>Estado por entrada</h3>
                {grupoDetalle.registros.map((registro, indice) => (
                  <div
                    key={registro.id}
                    className='flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm'
                  >
                    <span className='font-medium'>Entrada {indice + 1}</span>
                    <Badge variant={varianteEstado(registro.cortesia_estado)}>
                      {estadoEtiqueta(registro.cortesia_estado)}
                    </Badge>
                    {registro.cortesia_estado === 'pendiente' && canDeliver && (
                      <Button
                        type='button'
                        size='sm'
                        className='rounded-full'
                        onClick={() => {
                          setGrupoDetalleId(null);
                          setEntradaAEntregar(registro);
                        }}
                      >
                        Entregar bebida
                      </Button>
                    )}
                    {registro.cortesia_estado === 'entregada' && (
                      <span className='text-xs text-muted-foreground'>
                        {formatoEntrega(registro.cortesia_entregada_at)}
                        {registro.cortesia_entregada_por_nombre
                          ? ` · ${registro.cortesia_entregada_por_nombre}`
                          : ''}
                      </span>
                    )}
                    {registro.bebida_cortesia && (
                      <span className='text-xs text-muted-foreground'>
                        {registro.bebida_cortesia}
                      </span>
                    )}
                    {registro.venta_id && (
                      <span className='text-xs text-muted-foreground'>
                        Adicional {formatCurrencyCLP(Number(registro.monto_bebida_adicional))}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EntregaEntradaDialog
        entrada={entradaAEntregar}
        onClose={() => setEntradaAEntregar(null)}
        onEntregada={() => cargar(true)}
      />
      <EntregaCortesiasDialog
        grupo={grupoAEntregar}
        tope={topeCortesia}
        onClose={() => setGrupoAEntregar(null)}
        onEntregado={() => cargar(true)}
      />
    </main>
  );
}
