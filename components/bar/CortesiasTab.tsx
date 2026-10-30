'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, LoaderCircle, RefreshCw, Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { EntregaCortesiasDialog } from '@/components/bar/EntregaCortesiasDialog';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { fechaDeNegocio } from '@/lib/business/timezoneService';
import { cn } from '@/lib/utils/utils';

type JsonRecord = Record<string, unknown>;

/** Fila de la cola del bar: una persona que todavía no recibió su bebida. */
type EntradaPendiente = {
  id: string;
  grupo_registro_id: string | null;
  cliente_nombre: string | null;
  monto_entrada: number;
  metodo_pago: string;
  fecha: string;
  hora: string;
  caja_id: string;
  registrado_por_nombre: string;
};

/** Compra con al menos una cortesía pendiente: la barra la atiende completa. */
type GrupoPendiente = {
  id: string;
  filas: EntradaPendiente[];
  cliente: string | null;
  cantidad: number;
  total: number;
  montoUnitario: number;
  metodo: string;
  hora: string;
  registradoPor: string;
};

const ETIQUETAS_METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia'
};

const esRegistro = (valor: unknown): valor is JsonRecord =>
  typeof valor === 'object' && valor !== null;

const texto = (valor: unknown, respaldo = ''): string =>
  typeof valor === 'string' ? valor : typeof valor === 'number' ? String(valor) : respaldo;

const numero = (valor: unknown, respaldo = 0): number => {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : respaldo;
};

/** `data` de la respuesta o null cuando la forma no es la esperada. */
function listaDe(json: unknown): unknown[] | null {
  if (!esRegistro(json) || !Array.isArray(json.data)) return null;
  return json.data;
}

function mensajeDe(json: unknown, respaldo: string): string {
  return esRegistro(json) && typeof json.message === 'string' && json.message.trim()
    ? json.message
    : respaldo;
}

function aEntrada(valor: unknown): EntradaPendiente | null {
  if (!esRegistro(valor)) return null;
  const id = texto(valor.id);
  if (!id) return null;
  return {
    id,
    grupo_registro_id:
      typeof valor.grupo_registro_id === 'string' && valor.grupo_registro_id.trim()
        ? valor.grupo_registro_id
        : null,
    cliente_nombre:
      typeof valor.cliente_nombre === 'string' && valor.cliente_nombre.trim()
        ? valor.cliente_nombre
        : null,
    monto_entrada: numero(valor.monto_entrada),
    metodo_pago: texto(valor.metodo_pago, 'efectivo'),
    fecha: texto(valor.fecha),
    hora: texto(valor.hora),
    caja_id: texto(valor.caja_id),
    registrado_por_nombre: texto(valor.registrado_por_nombre)
  };
}

export function CortesiasTab({ searchTerm = '' }: { searchTerm?: string }) {
  const [entradas, setEntradas] = useState<EntradaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCola, setErrorCola] = useState<string | null>(null);
  const [recargando, setRecargando] = useState(false);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<GrupoPendiente | null>(null);
  const [comprasExpandidas, setComprasExpandidas] = useState<Set<string>>(() => new Set());

  const { hasPermission } = useUserPermissions();
  const puedeEntregar = hasPermission('entradas', 'deliver');
  const topeCortesia = Number(
    useConfigValue('comisiones', 'monto_base_trago_cortesia_cliente', 10000)
  );

  const cargarCola = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorCola(null);
    try {
      const respuesta = await fetch(
        `/api/tickets/pendientes?fecha=${encodeURIComponent(fechaDeNegocio())}`,
        { cache: 'no-store' }
      );
      const json: unknown = await respuesta.json().catch(() => null);
      const lista = listaDe(json);
      if (!respuesta.ok || lista === null)
        throw new Error(mensajeDe(json, 'No se pudo cargar la cola de cortesías'));
      setEntradas(lista.map(aEntrada).filter((fila): fila is EntradaPendiente => fila !== null));
    } catch (error) {
      setErrorCola(
        error instanceof Error ? error.message : 'No se pudo cargar la cola de cortesías'
      );
      setEntradas([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarCola();
  }, [cargarCola]);

  // El garzón sigue registrando entradas en la puerta: la cola se actualiza
  // sola sin reemplazar la tabla por el mensaje de carga.
  useRealtimeRefresh('tickets', () => cargarCola(true));

  /** Recarga manual de la cola: el garzón sigue registrando entradas en la puerta. */
  const recargar = useCallback(async () => {
    if (recargando) return;
    setRecargando(true);
    try {
      await cargarCola();
    } finally {
      setRecargando(false);
    }
  }, [recargando, cargarCola]);

  // La cola trae una persona por fila; la barra atiende la compra completa.
  const grupos = useMemo<GrupoPendiente[]>(() => {
    const porGrupo = new Map<string, EntradaPendiente[]>();
    for (const fila of entradas) {
      const clave = fila.grupo_registro_id ?? fila.id;
      const actual = porGrupo.get(clave);
      if (actual) actual.push(fila);
      else porGrupo.set(clave, [fila]);
    }
    return Array.from(porGrupo.entries()).map(([id, filas]) => {
      const primera = filas[0];
      return {
        id,
        filas,
        cliente: filas.find(fila => fila.cliente_nombre)?.cliente_nombre ?? null,
        cantidad: filas.length,
        total: filas.reduce((suma, fila) => suma + fila.monto_entrada, 0),
        montoUnitario: primera.monto_entrada,
        metodo: primera.metodo_pago,
        hora: primera.hora,
        registradoPor: primera.registrado_por_nombre
      };
    });
  }, [entradas]);

  const gruposVisibles = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('es');
    if (!term) return grupos;
    return grupos.filter(grupo =>
      [
        grupo.cliente,
        grupo.registradoPor,
        ETIQUETAS_METODO[grupo.metodo] ?? grupo.metodo,
        grupo.hora
      ].some(valor =>
        String(valor ?? '')
          .toLocaleLowerCase('es')
          .includes(term)
      )
    );
  }, [grupos, searchTerm]);

  const totalVisible = useMemo(
    () => gruposVisibles.reduce((suma, grupo) => suma + grupo.cantidad, 0),
    [gruposVisibles]
  );

  const abrirDialogo = (grupo: GrupoPendiente) => setGrupoSeleccionado(grupo);

  const cerrarDialogo = () => setGrupoSeleccionado(null);

  /** Despliega el desglose de entradas de una compra sin salir de la cola. */
  const alternarDetalle = (id: string) => {
    setComprasExpandidas(previas => {
      const siguientes = new Set(previas);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });
  };

  return (
    <div className='space-y-5'>
      <section className='overflow-hidden rounded-2xl border bg-card shadow-xs'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b p-4'>
          <div className='flex items-start gap-3'>
            <div className='rounded-xl border bg-background p-2.5 text-primary'>
              <Ticket className='size-5' aria-hidden='true' />
            </div>
            <div>
              <h2 className='font-semibold'>Cortesías pendientes</h2>
              <p className='text-sm text-muted-foreground'>
                Compras cobradas en la puerta que esperan sus bebidas en la barra.
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium tabular-nums'>
              {gruposVisibles.length} {gruposVisibles.length === 1 ? 'compra' : 'compras'} ·{' '}
              {totalVisible} {totalVisible === 1 ? 'entrada' : 'entradas'}
            </span>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={loading || recargando}
              onClick={() => void recargar()}
              aria-label='Actualizar cortesías pendientes'
              className='gap-1.5 rounded-full'
            >
              <RefreshCw
                className={cn('size-4', (loading || recargando) && 'animate-spin')}
                aria-hidden='true'
              />
              Actualizar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className='flex items-center gap-2 p-6 text-sm text-muted-foreground'>
            <LoaderCircle className='size-4 animate-spin' /> Cargando cortesías…
          </div>
        ) : errorCola ? (
          <div className='p-6 text-sm text-destructive'>{errorCola}</div>
        ) : gruposVisibles.length === 0 ? (
          <div className='p-8 text-center'>
            <Ticket className='mx-auto mb-2 size-7 text-muted-foreground' aria-hidden='true' />
            <p className='font-medium'>
              {searchTerm ? 'No hay cortesías que coincidan' : 'No hay cortesías pendientes'}
            </p>
            <p className='mt-1 text-sm text-muted-foreground'>
              Las compras registradas en la puerta aparecerán aquí hasta entregar sus bebidas.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table className='min-w-[900px]'>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-10'>
                    <span className='sr-only'>Ver entradas</span>
                  </TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Entradas</TableHead>
                  <TableHead>Costo unitario</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Método de pago</TableHead>
                  <TableHead>Registró</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className='text-right'>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gruposVisibles.map(grupo => {
                  const abierto = comprasExpandidas.has(grupo.id);
                  const idDetalle = `detalle-compra-${grupo.id}`;
                  return (
                    <Fragment key={grupo.id}>
                      <TableRow>
                        <TableCell className='w-10'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='size-7 rounded-full'
                            onClick={() => alternarDetalle(grupo.id)}
                            aria-expanded={abierto}
                            aria-controls={idDetalle}
                            aria-label={`${abierto ? 'Ocultar' : 'Mostrar'} las entradas de ${
                              grupo.cliente || 'la compra'
                            }`}
                          >
                            {abierto ? (
                              <ChevronDown className='size-4' aria-hidden='true' />
                            ) : (
                              <ChevronRight className='size-4' aria-hidden='true' />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className='tabular-nums'>{grupo.hora || '—'}</TableCell>
                        <TableCell className='font-medium'>
                          {grupo.cliente || 'Sin nombre'}
                        </TableCell>
                        <TableCell className='tabular-nums'>{grupo.cantidad}</TableCell>
                        <TableCell className='tabular-nums'>
                          {formatCurrencyCLP(grupo.montoUnitario)}
                        </TableCell>
                        <TableCell className='font-medium tabular-nums'>
                          {formatCurrencyCLP(grupo.total)}
                        </TableCell>
                        <TableCell>{ETIQUETAS_METODO[grupo.metodo] ?? grupo.metodo}</TableCell>
                        <TableCell>{grupo.registradoPor || '—'}</TableCell>
                        <TableCell>
                          <Badge variant='outline'>Pendiente</Badge>
                        </TableCell>
                        <TableCell className='text-right'>
                          {puedeEntregar ? (
                            <Button
                              type='button'
                              size='sm'
                              className='rounded-full'
                              onClick={() => abrirDialogo(grupo)}
                              aria-label={`Entregar ${grupo.cantidad} ${
                                grupo.cantidad === 1 ? 'cortesía' : 'cortesías'
                              } de ${grupo.cliente || 'cliente sin nombre'}`}
                            >
                              Entregar
                            </Button>
                          ) : (
                            <span className='text-xs text-muted-foreground'>Sin permiso</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {abierto ? (
                        <TableRow className='bg-muted/30 hover:bg-muted/30'>
                          <TableCell colSpan={10} className='p-0'>
                            <div id={idDetalle} className='space-y-2 px-4 py-3'>
                              <p className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                                Entradas individuales ({grupo.cantidad})
                              </p>
                              <ul className='divide-y rounded-lg border bg-background'>
                                {grupo.filas.map((fila, indice) => (
                                  <li
                                    key={fila.id}
                                    className='flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-sm'
                                  >
                                    <span className='inline-flex min-w-6 justify-center rounded-md border px-1.5 py-0.5 text-xs font-medium tabular-nums'>
                                      {fila.id}
                                    </span>
                                    <span className='font-medium'>
                                      {fila.cliente_nombre || grupo.cliente || 'Sin nombre'}
                                    </span>
                                    <span className='text-xs text-muted-foreground'>
                                      Hora{' '}
                                      <span className='text-foreground tabular-nums'>
                                        {fila.hora || '—'}
                                      </span>
                                    </span>
                                    <span className='text-xs text-muted-foreground'>
                                      Costo{' '}
                                      <span className='text-foreground tabular-nums'>
                                        {formatCurrencyCLP(fila.monto_entrada)}
                                      </span>
                                    </span>
                                    <span className='text-xs text-muted-foreground'>
                                      Registró{' '}
                                      <span className='text-foreground'>
                                        {fila.registrado_por_nombre || '—'}
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {!puedeEntregar ? (
          <p className='border-t p-4 text-sm text-muted-foreground'>
            No tienes permiso para entregar cortesías.
          </p>
        ) : null}
      </section>

      <EntregaCortesiasDialog
        grupo={grupoSeleccionado}
        tope={topeCortesia}
        onClose={cerrarDialogo}
        onEntregado={() => cargarCola(true)}
      />
    </div>
  );
}
