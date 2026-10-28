'use client';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Table,
  TableCaption,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Package, ArrowRightLeft, RefreshCw, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils/utils';
import { accesoLimpieza } from '@/lib/business/limpieza';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import {
  NOMBRES_UBICACION,
  UBICACIONES_LIMPIEZA,
  type ResumenLimpieza,
  type UbicacionLimpieza
} from '@/types/limpieza';
import { Label } from '@/components/ui/label';

const numero = (value: number) =>
  Number(value).toLocaleString('es-BO', { maximumFractionDigits: 3 });
// Estilo compartido: todos los campos del módulo usan esquinas totalmente redondeadas.
const selectClass = 'h-10 w-full rounded-full border bg-background px-3 text-sm';
const buttonClass = 'rounded-full';
const fecha = (value: string) => new Date(value).toLocaleString('es-BO');
type Mode = 'articulo' | 'ingreso' | 'traspaso' | 'consumo';
// HTTP en la red local no expone randomUUID; getRandomValues sí está disponible.
const nuevaClave = () =>
  crypto.randomUUID?.() ||
  Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(
    ''
  );

export default function CleaningInventory() {
  const { user, loading: userLoading } = useCurrentUser();
  const [data, setData] = useState<ResumenLimpieza | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const retryRef = useRef<{ body: string; key: string } | null>(null);
  const [mode, setMode] = useState<Mode>('traspaso');
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState<UbicacionLimpieza | 'todas'>('todas');
  const [tab, setTab] = useState('existencias');
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('unidad');
  const [minimo, setMinimo] = useState('0');
  const [articuloId, setArticuloId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [origen, setOrigen] = useState<UbicacionLimpieza>('almacen');
  const [destino, setDestino] = useState<UbicacionLimpieza>('bar');
  const [nota, setNota] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [costo, setCosto] = useState('0');
  const acceso = data?.acceso || accesoLimpieza(user?.role || '');
  const ubicacionPropia = acceso.ubicaciones[0];

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/cleaning', { cache: 'no-store', signal });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(
          result.message || result.error?.message || 'No se pudo cargar el inventario'
        );
      setData(result.data);
      setError('');
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useRealtimeRefresh(
    '/api/cleaning',
    () => load(),
    !!user && !userLoading && accesoLimpieza(user.role).ubicaciones.length > 0
  );

  useEffect(() => {
    if (userLoading || !user || !accesoLimpieza(user.role).ubicaciones.length) return;
    const controller = new AbortController();
    void load(controller.signal);
    const refresh = () => {
      if (!document.hidden && !busyRef.current) void load(controller.signal);
    };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [load, user, userLoading]);

  useEffect(() => {
    if (!acceso.gestionar && ubicacionPropia) {
      setOrigen(ubicacionPropia);
      setDestino('almacen');
      setLocation(ubicacionPropia);
    }
  }, [acceso.gestionar, ubicacionPropia]);

  const send = async (payload: Record<string, unknown>) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    const body = JSON.stringify(payload);
    const attempt =
      retryRef.current?.body === body ? retryRef.current : { body, key: nuevaClave() };
    retryRef.current = attempt;
    try {
      const response = await fetch('/api/cleaning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-idempotency-key': attempt.key },
        body
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        // Conserva la clave cuando el servidor indica una operación en curso/revisión.
        if (!result.code?.startsWith('IDEMPOTENCY_') && response.status < 500)
          retryRef.current = null;
        throw new Error(result.message || result.error?.message || 'No se pudo guardar');
      }
      retryRef.current = null;
      toast.success('Operación registrada');
      await load();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error de conexión');
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    let payload: Record<string, unknown>;
    if (mode === 'articulo') payload = { tipo: mode, nombre, unidad, minimo: Number(minimo) };
    else
      payload = {
        tipo: mode,
        articulo_id: articuloId,
        cantidad: Number(cantidad),
        nota,
        ...(mode === 'ingreso' ? { proveedor, costo_unitario: Number(costo) } : { origen }),
        ...(mode === 'traspaso' ? { destino } : {})
      };
    if (await send(payload)) {
      setNombre('');
      setCantidad('');
      setNota('');
    }
  };

  if (userLoading) return <p className='p-6'>Cargando sesión…</p>;
  if (!acceso.ubicaciones.length)
    return <p className='p-6'>Tu rol no tiene acceso al inventario de limpieza.</p>;
  const items = (data?.articulos || []).filter(a =>
    a.nombre.toLowerCase().includes(search.toLowerCase())
  );
  const pendientes = (data?.movimientos || []).filter(m => m.estado === 'pendiente');
  const selected = data?.articulos.find(a => a.id === articuloId);
  const bajas = (data?.articulos || []).filter(a => a.stock.almacen <= Number(a.minimo));

  return (
    <main className='mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6'>
      <header className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='flex items-center gap-2 text-2xl font-bold'>
            <Package aria-hidden='true' /> Insumos de limpieza
          </h1>
          <p className='text-sm text-muted-foreground'>
            Existencias, recepciones y consumo por ubicación.
          </p>
        </div>
        <Button
          variant='outline'
          className={buttonClass}
          onClick={() => void load()}
          disabled={busy}
        >
          <RefreshCw className='mr-2 h-4 w-4' />
          Actualizar
        </Button>
      </header>
      {error && <ErrorState size='sm' message={error} />}
      {loading && <p role='status'>Cargando inventario…</p>}
      <div className='grid gap-3 sm:grid-cols-3'>
        <div className='rounded-xl border p-4'>
          <p className='text-sm text-muted-foreground'>Artículos registrados</p>
          <p className='text-2xl font-semibold'>{data?.articulos.length ?? '—'}</p>
        </div>
        <div className='rounded-xl border p-4'>
          <p className='text-sm text-muted-foreground'>Traspasos pendientes</p>
          <p className='text-2xl font-semibold'>{pendientes.length}</p>
        </div>
        <div className='rounded-xl border p-4'>
          <p className='text-sm text-muted-foreground'>Artículos en mínimo de almacén</p>
          <p className='text-2xl font-semibold'>{bajas.length}</p>
        </div>
      </div>
      <section className='rounded-xl border p-4 sm:p-6' aria-label='Registrar operación'>
        <div className='mb-4 flex flex-wrap gap-2'>
          {(['articulo', 'ingreso', 'traspaso', 'consumo'] as Mode[])
            .filter(m => acceso.gestionar || !['articulo', 'ingreso'].includes(m))
            .map(m => (
              <Button
                key={m}
                variant={mode === m ? 'default' : 'outline'}
                className={buttonClass}
                onClick={() => setMode(m)}
                disabled={busy}
              >
                {m === 'articulo'
                  ? 'Nuevo artículo'
                  : m === 'ingreso'
                    ? 'Ingreso al almacén'
                    : m === 'traspaso'
                      ? 'Traspaso / devolución'
                      : 'Registrar consumo'}
              </Button>
            ))}
        </div>
        <form onSubmit={submit} className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {mode === 'articulo' ? (
            <>
              <Label className='space-y-1 text-sm'>
                Nombre
                <Input
                  aria-label='Nombre'
                  required
                  minLength={2}
                  maxLength={120}
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder='Ej.: Detergente'
                />
              </Label>
              <Label className='space-y-1 text-sm'>
                Unidad de medida
                <NativeSelect
                  className={selectClass}
                  value={unidad}
                  onChange={e => setUnidad(e.target.value)}
                >
                  {['unidad', 'litro', 'kilo', 'paquete', 'metro'].map(u => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </NativeSelect>
              </Label>
              <Label className='space-y-1 text-sm'>
                Stock mínimo en almacén
                <Input
                  aria-label='Stock mínimo en almacén'
                  type='number'
                  required
                  min='0'
                  step='0.001'
                  value={minimo}
                  onChange={e => setMinimo(e.target.value)}
                />
              </Label>
            </>
          ) : (
            <>
              <Label className='space-y-1 text-sm'>
                Artículo
                <NativeSelect
                  required
                  className={selectClass}
                  value={articuloId}
                  onChange={e => setArticuloId(e.target.value)}
                >
                  <option value=''>Selecciona un artículo</option>
                  {(data?.articulos || []).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} ({a.unidad})
                    </option>
                  ))}
                </NativeSelect>
              </Label>
              <Label className='space-y-1 text-sm'>
                Cantidad{selected ? ` (${selected.unidad})` : ''}
                <Input
                  aria-label='Cantidad'
                  required
                  type='number'
                  min={selected && ['unidad', 'paquete'].includes(selected.unidad) ? '1' : '0.001'}
                  step={selected && ['unidad', 'paquete'].includes(selected.unidad) ? '1' : '0.001'}
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                />
              </Label>
              {mode !== 'ingreso' && (
                <Label className='space-y-1 text-sm'>
                  Origen
                  <NativeSelect
                    aria-label='Origen'
                    className={selectClass}
                    value={origen}
                    onChange={e => setOrigen(e.target.value as UbicacionLimpieza)}
                  >
                    {acceso.ubicaciones.map(u => (
                      <option key={u} value={u}>
                        {NOMBRES_UBICACION[u]}
                      </option>
                    ))}
                  </NativeSelect>
                  {selected && (
                    <span className='text-muted-foreground'>
                      Disponible: {numero(selected.stock[origen])} {selected.unidad}
                    </span>
                  )}
                </Label>
              )}
              {mode === 'traspaso' && (
                <Label className='space-y-1 text-sm'>
                  Destino
                  <NativeSelect
                    className={selectClass}
                    value={destino}
                    onChange={e => setDestino(e.target.value as UbicacionLimpieza)}
                  >
                    {(acceso.gestionar ? UBICACIONES_LIMPIEZA : (['almacen'] as const)).map(u => (
                      <option key={u} value={u}>
                        {NOMBRES_UBICACION[u]}
                      </option>
                    ))}
                  </NativeSelect>
                </Label>
              )}
              {mode === 'ingreso' && (
                <>
                  <Label className='space-y-1 text-sm'>
                    Proveedor
                    <Input
                      aria-label='Proveedor'
                      maxLength={120}
                      value={proveedor}
                      onChange={e => setProveedor(e.target.value)}
                    />
                  </Label>
                  <Label className='space-y-1 text-sm'>
                    Costo por unidad
                    <Input
                      aria-label='Costo por unidad'
                      required
                      type='number'
                      min='0'
                      step='0.001'
                      value={costo}
                      onChange={e => setCosto(e.target.value)}
                    />
                  </Label>
                </>
              )}
              <Label className='space-y-1 text-sm sm:col-span-2'>
                Detalle / motivo{mode === 'consumo' ? ' (obligatorio)' : ''}
                <Input
                  aria-label='Detalle / motivo'
                  required={mode === 'consumo'}
                  minLength={mode === 'consumo' ? 3 : undefined}
                  maxLength={500}
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder={
                    mode === 'consumo' ? 'Ej.: Limpieza de baños' : 'Referencia o comentario'
                  }
                />
              </Label>
            </>
          )}
          <div className='flex items-end'>
            <Button type='submit' className={buttonClass} disabled={busy || !data}>
              <Plus className='mr-2 h-4 w-4' />
              {busy ? 'Guardando…' : mode === 'traspaso' ? 'Enviar traspaso' : 'Guardar'}
            </Button>
          </div>
        </form>
        {mode === 'traspaso' && (
          <p className='mt-3 text-sm text-muted-foreground'>
            Las cantidades quedan en tránsito hasta que el destino acepte. Si rechaza, vuelven al
            origen.
          </p>
        )}
      </section>
      <section aria-label='Traspasos pendientes' className='space-y-3'>
        <h2 className='flex items-center gap-2 text-lg font-semibold'>
          <ArrowRightLeft className='h-5 w-5' />
          Recepciones pendientes
        </h2>
        {!pendientes.length && (
          <p className='text-sm text-muted-foreground'>No hay traspasos pendientes.</p>
        )}
        {pendientes.map(m => (
          <div
            key={m.id}
            className='flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4'
          >
            <div>
              <p className='font-medium'>
                {m.articulo} · {numero(m.cantidad)} {m.unidad}
              </p>
              <p className='text-sm text-muted-foreground'>
                {m.origen && NOMBRES_UBICACION[m.origen]} →{' '}
                {m.destino && NOMBRES_UBICACION[m.destino]} · {fecha(m.fecha)}
              </p>
              {m.nota && <p className='text-sm'>{m.nota}</p>}
            </div>
            {m.destino && acceso.ubicaciones.includes(m.destino) ? (
              <div className='flex gap-2'>
                <Button
                  className={buttonClass}
                  disabled={busy}
                  onClick={() => void send({ tipo: 'resolver', id: m.id, accion: 'aceptar' })}
                >
                  Aceptar recepción
                </Button>
                <Button
                  className={buttonClass}
                  disabled={busy}
                  variant='outline'
                  onClick={() => void send({ tipo: 'resolver', id: m.id, accion: 'rechazar' })}
                >
                  Rechazar
                </Button>
              </div>
            ) : (
              <Badge variant='secondary'>Esperando al destino</Badge>
            )}
          </div>
        ))}
      </section>
      <Tabs value={tab} onValueChange={setTab} className='flex flex-col gap-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <TabsList
            aria-label='Inventario y movimientos'
            className='grid h-auto w-full shrink-0 grid-cols-2 rounded-full sm:w-fit'
          >
            <TabsTrigger value='existencias' className='rounded-full'>
              Existencias
            </TabsTrigger>
            <TabsTrigger value='historial' className='rounded-full whitespace-normal text-center'>
              Historial de transferencias
            </TabsTrigger>
          </TabsList>
          {tab === 'existencias' && (
            <div className='flex flex-wrap gap-2'>
              <Input
                aria-label='Buscar artículo'
                placeholder='Buscar artículo…'
                className='rounded-full sm:w-56'
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <NativeSelect
                aria-label='Filtrar ubicación'
                className={cn(selectClass, 'sm:w-48')}
                value={location}
                onChange={e => setLocation(e.target.value as typeof location)}
              >
                <option value='todas'>Todas las ubicaciones</option>
                {UBICACIONES_LIMPIEZA.map(u => (
                  <option key={u} value={u}>
                    {NOMBRES_UBICACION[u]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
        </div>
        <TabsContent value='existencias'>
          <section className='space-y-3' aria-label='Existencias'>
            <h2 className='text-lg font-semibold'>Existencias</h2>
            <div className='overflow-x-auto rounded-xl border'>
              <Table className='w-full'>
                <TableCaption className='sr-only'>
                  Stock disponible por ubicación y cantidades en tránsito
                </TableCaption>
                <TableHeader className='bg-muted'>
                  <TableRow>
                    <TableHead className='text-left'>Artículo</TableHead>
                    {UBICACIONES_LIMPIEZA.filter(u => location === 'todas' || location === u).map(
                      u => (
                        <TableHead className='text-right' key={u}>
                          {NOMBRES_UBICACION[u]}
                        </TableHead>
                      )
                    )}
                    <TableHead className='text-right'>En tránsito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(a => (
                    <TableRow key={a.id} className='border-t'>
                      <TableCell>
                        <p className='font-medium'>{a.nombre}</p>
                        <p className='text-xs text-muted-foreground'>
                          {a.unidad} · mínimo almacén: {numero(a.minimo)}
                        </p>
                        {a.stock.almacen <= Number(a.minimo) && (
                          <Badge variant='secondary' className='mt-1 gap-1'>
                            <AlertTriangle className='h-3 w-3' />
                            Reponer almacén
                          </Badge>
                        )}
                      </TableCell>
                      {UBICACIONES_LIMPIEZA.filter(u => location === 'todas' || location === u).map(
                        u => (
                          <TableCell className='text-right tabular-nums' key={u}>
                            {numero(a.stock[u])}
                          </TableCell>
                        )
                      )}
                      <TableCell className='text-right tabular-nums'>
                        {numero(a.en_transito)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!items.length && (
                    <TableRow>
                      <TableCell colSpan={6} className='text-center text-muted-foreground'>
                        <EmptyState
                          variant='text'
                          title={
                            search
                              ? 'No hay coincidencias.'
                              : 'Registra el primer artículo para comenzar.'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>
        <TabsContent value='historial'>
          <section className='space-y-3' aria-label='Historial de transferencias'>
            <h2 className='text-lg font-semibold'>Historial de transferencias</h2>
            <p className='text-xs text-muted-foreground'>
              Todos los pendientes y los últimos 500 movimientos resueltos (ingresos, traspasos y
              consumos).
            </p>
            <div className='overflow-x-auto rounded-xl border'>
              <Table className='w-full'>
                <TableHeader className='bg-muted'>
                  <TableRow>
                    {[
                      'Fecha',
                      'Artículo',
                      'Operación',
                      'Cantidad',
                      'Origen → destino',
                      'Estado',
                      'Responsables / detalle'
                    ].map(t => (
                      <TableHead className='text-left' key={t}>
                        {t}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.movimientos || []).map(m => (
                    <TableRow key={m.id} className='border-t'>
                      <TableCell className='whitespace-nowrap'>{fecha(m.fecha)}</TableCell>
                      <TableCell>{m.articulo}</TableCell>
                      <TableCell className='capitalize'>{m.tipo}</TableCell>
                      <TableCell className='whitespace-nowrap'>
                        {numero(m.cantidad)} {m.unidad}
                      </TableCell>
                      <TableCell className='whitespace-nowrap'>
                        {m.origen ? NOMBRES_UBICACION[m.origen] : 'Proveedor'} →{' '}
                        {m.destino ? NOMBRES_UBICACION[m.destino] : 'Consumo'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.estado === 'pendiente' ? 'outline' : 'secondary'}>
                          {m.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p>
                          Envía/registra: {m.creador_nombre || m.creado_por}
                          {m.recibido_por
                            ? ` · Recibe/resuelve: ${m.receptor_nombre || m.recibido_por}`
                            : ''}
                        </p>
                        {m.nota && <p>{m.nota}</p>}
                        {m.proveedor && <p>Proveedor: {m.proveedor}</p>}
                        {m.costo_unitario !== null && (
                          <p>Costo/unidad: {numero(m.costo_unitario)}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!data?.movimientos.length && (
                    <TableRow>
                      <TableCell colSpan={7} className='text-center text-muted-foreground'>
                        <EmptyState variant='text' title='Todavía no hay movimientos.' />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}
