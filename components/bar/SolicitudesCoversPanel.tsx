'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, LoaderCircle, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

type JsonRecord = Record<string, unknown>;

type UnidadSolicitud = {
  presentacion_id?: string;
  tipo_entrega?: string;
};

type BebidaNombre = { producto: string; presentacion: string };

type SolicitudCovers = {
  id: string;
  cliente_nombre: string | null;
  solicitado_por_nick: string | null;
  unidades: UnidadSolicitud[];
  monto_total: number;
  fecha_solicitud: string;
};

const esRegistro = (valor: unknown): valor is JsonRecord =>
  typeof valor === 'object' && valor !== null;

const texto = (valor: unknown, respaldo = ''): string =>
  typeof valor === 'string' ? valor : typeof valor === 'number' ? String(valor) : respaldo;

const numero = (valor: unknown, respaldo = 0): number => {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : respaldo;
};

function mensajeDe(json: unknown, respaldo: string): string {
  return esRegistro(json) && typeof json.message === 'string' && json.message.trim()
    ? json.message
    : respaldo;
}

function listaDeUnidades(valor: unknown): UnidadSolicitud[] {
  if (Array.isArray(valor)) return valor.filter(esRegistro);
  if (typeof valor !== 'string') return [];
  try {
    const parseado: unknown = JSON.parse(valor);
    return Array.isArray(parseado) ? parseado.filter(esRegistro) : [];
  } catch {
    return [];
  }
}

function aSolicitud(valor: unknown): SolicitudCovers | null {
  if (!esRegistro(valor)) return null;
  const id = texto(valor.id);
  if (!id) return null;
  return {
    id,
    cliente_nombre: texto(valor.cliente_nombre) || null,
    solicitado_por_nick: texto(valor.solicitado_por_nick) || null,
    unidades: listaDeUnidades(valor.unidades),
    monto_total: numero(valor.monto_total),
    fecha_solicitud: texto(valor.fecha_solicitud)
  };
}

function horaDe(fecha: string): string {
  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime())
    ? ''
    : valor.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

/** El catálogo del bar traduce la presentación que guarda la solicitud. */
async function nombresDeCatalogo(): Promise<Map<string, BebidaNombre>> {
  const mapa = new Map<string, BebidaNombre>();
  try {
    const respuesta = await fetch('/api/products/for-sale', { cache: 'no-store' });
    const json: unknown = await respuesta.json().catch(() => null);
    const lista = esRegistro(json) && Array.isArray(json.data) ? json.data : [];
    for (const item of lista) {
      if (!esRegistro(item)) continue;
      const id = texto(item.presentacion_id);
      if (!id) continue;
      mapa.set(id, {
        producto: texto(item.producto_nombre, 'Producto'),
        presentacion: texto(item.presentacion_nombre)
      });
    }
  } catch {
    // Sin catálogo se muestra la unidad sin nombre; la solicitud sigue siendo válida.
  }
  return mapa;
}

function unidadesAgrupadas(unidades: UnidadSolicitud[], nombres: Map<string, BebidaNombre>) {
  const grupos = new Map<string, { etiqueta: string; formato: string; cantidad: number }>();
  for (const unidad of unidades) {
    const id = unidad.presentacion_id ?? '';
    const nombre = nombres.get(id);
    const etiqueta = nombre
      ? `${nombre.producto}${nombre.presentacion ? ` · ${nombre.presentacion}` : ''}`
      : 'Producto';
    const formato = unidad.tipo_entrega === 'botella' ? 'Botella sin anfitriona' : 'Corte';
    const clave = `${id}:${unidad.tipo_entrega ?? 'corte'}`;
    const actual = grupos.get(clave);
    if (actual) actual.cantidad += 1;
    else grupos.set(clave, { etiqueta, formato, cantidad: 1 });
  }
  return [...grupos.values()];
}

export function SolicitudesCoversPanel({ onProcesada }: { onProcesada?: () => void }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudCovers[]>([]);
  const [nombres, setNombres] = useState<Map<string, BebidaNombre>>(() => new Map());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [rechazo, setRechazo] = useState<SolicitudCovers | null>(null);
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError(null);
    try {
      const [respuesta, catalogo] = await Promise.all([
        fetch('/api/tickets/cover-solicitudes?estado=pendiente', { cache: 'no-store' }),
        nombresDeCatalogo()
      ]);
      const json: unknown = await respuesta.json().catch(() => null);
      const lista =
        esRegistro(json) && Array.isArray(json.data)
          ? json.data.map(aSolicitud).filter((fila): fila is SolicitudCovers => fila !== null)
          : null;
      if (!respuesta.ok || lista === null)
        throw new Error(mensajeDe(json, 'No se pudieron cargar las solicitudes'));
      setSolicitudes(lista);
      setNombres(catalogo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes');
      setSolicitudes([]);
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useRealtimeRefresh('tickets', () => cargar(true));

  const terminar = async (solicitud: SolicitudCovers, accion: string) => {
    toast.success(accion, {
      description: solicitud.cliente_nombre || 'Sin nombre'
    });
    await cargar(true);
    onProcesada?.();
  };

  const aprobar = async (solicitud: SolicitudCovers) => {
    setProcesandoId(solicitud.id);
    try {
      const respuesta = await fetch(
        `/api/tickets/cover-solicitudes/${encodeURIComponent(solicitud.id)}/approve`,
        { method: 'PATCH' }
      );
      const json: unknown = await respuesta.json().catch(() => null);
      if (!respuesta.ok || !esRegistro(json) || json.success !== true)
        throw new Error(mensajeDe(json, 'No se pudo aprobar la solicitud'));
      const entregadas = esRegistro(json.data)
        ? numero(json.data.entradas)
        : solicitud.unidades.length;
      await terminar(
        solicitud,
        `${entregadas} ${entregadas === 1 ? 'cover entregado' : 'covers entregados'}`
      );
    } catch (err) {
      toast.error('No se pudo aprobar la solicitud', {
        description: err instanceof Error ? err.message : 'Intenta de nuevo.'
      });
    } finally {
      setProcesandoId(null);
    }
  };

  const abrirRechazo = (solicitud: SolicitudCovers) => {
    setRechazo(solicitud);
    setMotivo('');
  };

  const rechazar = async () => {
    if (!rechazo) return;
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      toast.error('Indica el motivo del rechazo');
      return;
    }
    setProcesandoId(rechazo.id);
    try {
      const respuesta = await fetch(
        `/api/tickets/cover-solicitudes/${encodeURIComponent(rechazo.id)}/reject`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motivo: motivoLimpio })
        }
      );
      const json: unknown = await respuesta.json().catch(() => null);
      if (!respuesta.ok || !esRegistro(json) || json.success !== true)
        throw new Error(mensajeDe(json, 'No se pudo rechazar la solicitud'));
      const solicitud = rechazo;
      setRechazo(null);
      setMotivo('');
      await terminar(solicitud, 'Solicitud rechazada');
    } catch (err) {
      toast.error('No se pudo rechazar la solicitud', {
        description: err instanceof Error ? err.message : 'Intenta de nuevo.'
      });
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <section className='overflow-hidden rounded-2xl border bg-card shadow-xs'>
      <div className='flex flex-wrap items-center justify-between gap-2 border-b p-4'>
        <div className='flex items-start gap-3'>
          <div className='rounded-xl border bg-background p-2.5 text-primary'>
            <ShieldCheck className='size-5' aria-hidden='true' />
          </div>
          <div>
            <h2 className='font-semibold'>Solicitudes que hace el barman</h2>
            <p className='text-sm text-muted-foreground'>
              Entregas de covers pendientes de tu autorización.
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant={solicitudes.length > 0 ? 'default' : 'outline'}>
            {solicitudes.length} {solicitudes.length === 1 ? 'pendiente' : 'pendientes'}
          </Badge>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={cargando}
            onClick={() => void cargar()}
            aria-label='Actualizar solicitudes de covers'
            className='gap-1.5 rounded-full'
          >
            <RefreshCw className={cargando ? 'size-4 animate-spin' : 'size-4'} aria-hidden='true' />
            Actualizar
          </Button>
        </div>
      </div>

      {cargando ? (
        <div className='flex items-center gap-2 p-6 text-sm text-muted-foreground'>
          <LoaderCircle className='size-4 animate-spin' /> Cargando solicitudes…
        </div>
      ) : error ? (
        <div className='p-6 text-sm text-destructive'>{error}</div>
      ) : solicitudes.length === 0 ? (
        <p className='p-8 text-center text-sm text-muted-foreground'>
          No hay covers por autorizar.
        </p>
      ) : (
        <ul className='divide-y'>
          {solicitudes.map(solicitud => {
            const ocupada = procesandoId === solicitud.id;
            return (
              <li key={solicitud.id} className='space-y-3 p-4'>
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div>
                    <p className='font-medium'>
                      {solicitud.cliente_nombre || 'Cliente sin nombre'}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Solicitó {solicitud.solicitado_por_nick || 'el barman'}
                      {solicitud.fecha_solicitud ? ` · ${horaDe(solicitud.fecha_solicitud)}` : ''}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm font-medium tabular-nums'>
                      {formatCurrencyCLP(solicitud.monto_total)}
                    </p>
                    <p className='text-xs text-muted-foreground'>adicional</p>
                  </div>
                </div>

                <ul className='space-y-1 text-sm'>
                  {unidadesAgrupadas(solicitud.unidades, nombres).map((linea, indice) => (
                    <li key={`${linea.etiqueta}-${linea.formato}-${indice}`}>
                      • {linea.cantidad}× {linea.etiqueta} · {linea.formato}
                    </li>
                  ))}
                </ul>

                <div className='flex justify-end gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='rounded-full'
                    disabled={ocupada}
                    onClick={() => abrirRechazo(solicitud)}
                    aria-label={`Rechazar solicitud de ${solicitud.cliente_nombre || 'cliente sin nombre'}`}
                  >
                    <X className='size-4' aria-hidden='true' />
                    Rechazar
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    className='rounded-full'
                    disabled={ocupada}
                    onClick={() => void aprobar(solicitud)}
                    aria-label={`Aprobar entrega de ${solicitud.cliente_nombre || 'cliente sin nombre'}`}
                  >
                    {ocupada ? (
                      <LoaderCircle className='size-4 animate-spin' aria-hidden='true' />
                    ) : (
                      <Check className='size-4' aria-hidden='true' />
                    )}
                    Aprobar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={rechazo !== null}
        onOpenChange={abierto => {
          if (!abierto && !procesandoId) {
            setRechazo(null);
            setMotivo('');
          }
        }}
      >
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              {rechazo?.cliente_nombre || 'Cliente sin nombre'}. El motivo queda registrado en la
              solicitud.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={motivo}
            onChange={evento => setMotivo(evento.target.value)}
            placeholder='Escribe el motivo del rechazo'
            rows={3}
            aria-label='Motivo del rechazo'
          />
          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              className='rounded-full'
              disabled={Boolean(procesandoId)}
              onClick={() => {
                setRechazo(null);
                setMotivo('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              className='rounded-full'
              disabled={Boolean(procesandoId) || !motivo.trim()}
              onClick={() => void rechazar()}
            >
              {procesandoId ? (
                <LoaderCircle className='size-4 animate-spin' aria-hidden='true' />
              ) : null}
              Rechazar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
