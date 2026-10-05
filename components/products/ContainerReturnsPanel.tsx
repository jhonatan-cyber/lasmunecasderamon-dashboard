'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, PackageCheck, ScanLine } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils/utils';
import type { DevolucionEnvaseRegistro } from '@/modules/inventario/contracts';
import { EscaneoLote } from '@/components/products/EscaneoLote';
import { MOTIVO_ENVASE, useContainerScan } from '@/hooks/productos/useContainerScan';
import { useSharedSSE } from '@/hooks/shared';
import type { ResumenEnvases } from '@/lib/business/containerAlerts';

/** El servidor contesta además con el umbral en horas que usó para contar. */
type ResumenEnvasesUI = ResumenEnvases & { umbral_horas?: number };

/** Fallback si un payload viejo no trae el umbral (por defecto: 2 horas). */
const UMBRAL_DEFECTO = 2;

/** Fecha y hora compactas; el timestamp llega como ISO desde la API. */
function fechaHora(valor: string | Date | null): string {
  if (!valor) return '—';
  const fecha = valor instanceof Date ? valor : new Date(String(valor));
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/** Nombre visible de quien entregó o confirmó el envase. */
function nombreDe(...campos: Array<string | null>): string {
  const nombre = `${campos[0] || ''} ${campos[1] || ''}`.trim();
  return nombre || campos[2] || '—';
}

/** Rechazos que no son un error del operador y se muestran en ámbar. */
const MOTIVOS_AVISO = ['ya_confirmado', 'no_entregado'];

/**
 * Segundo paso del control de envases: el almacén escanea lo que el bar
 * entregó y confirma la recepción. Solo puede confirmar envases que el barman
 * ya marcó como entregados en `/bar`, y cada confirmación queda con quién y
 * cuándo la hizo (migración 033).
 */
export function ContainerReturnsPanel() {
  const [devoluciones, setDevoluciones] = useState<DevolucionEnvaseRegistro[]>([]);
  const [loading, setLoading] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [resumen, setResumen] = useState<ResumenEnvasesUI | null>(null);
  const inputEnvaseRef = useRef<HTMLInputElement>(null);

  const fetchDevoluciones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bar/containers', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (data.success && Array.isArray(data.data)) setDevoluciones(data.data);
    } catch {
      // la tabla queda vacía y se reintenta al recargar
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevoluciones();
  }, [fetchDevoluciones]);

  const fetchResumen = useCallback(async () => {
    try {
      const res = await fetch('/api/bar/containers/summary', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.data) setResumen(data.data);
    } catch {
      // el contador se retoma en el siguiente ciclo
    }
  }, []);

  useEffect(() => {
    fetchResumen();
    // El umbral se cruza con el paso del tiempo, no con una acción del usuario:
    // el contador tiene que avanzar aunque nadie toque la página (además del
    // SSE, que es el que reacciona al instante).
    const intervalo = setInterval(fetchResumen, 60_000);
    return () => clearInterval(intervalo);
  }, [fetchResumen]);

  // Alerta en vivo: el servidor la emite cuando cambia el número de atrasados.
  useSharedSSE('/api/notifications/sse', payload => {
    if (payload?.type === 'warehouse_container_alert') {
      setResumen(payload.data ?? null);
      fetchDevoluciones();
    }
  });

  const pendientes = useMemo(
    () => devoluciones.filter(d => d.pendiente_confirmacion),
    [devoluciones]
  );
  const visibles = useMemo(
    () => (soloPendientes ? pendientes : devoluciones),
    [soloPendientes, pendientes, devoluciones]
  );

  // Escaneo continuo de la recepción: confirma códigos uno tras otro y lleva
  // los contadores de la sesión con aviso sonoro.
  const {
    escanear,
    escaneando: confirmando,
    resultado,
    sesion,
    aceptados,
    rechazados,
    enCola,
    sincronizando,
    sincronizar,
    limpiar,
    sonido,
    alternarSonido
  } = useContainerScan({ endpoint: '/api/bar/containers/confirm', onAceptado: fetchDevoluciones });

  // Se limpia el campo y se devuelve el foco al input tras cada lectura, para
  // que el lote siga sin que el operador toque el teclado.
  const enviarEscaneo = useCallback(
    async (valor: string) => {
      if (await escanear(valor)) setCodigo('');
      inputEnvaseRef.current?.focus();
    },
    [escanear]
  );

  return (
    <PermissionGuard
      module='products'
      action='confirm_container_return'
      fallback={
        <div className='p-4 sm:p-6 lg:p-10 text-center text-gray-500 text-sm sm:text-base'>
          No tienes permiso para confirmar la recepción de envases.
        </div>
      }
    >
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
            <PackageCheck className='w-6 h-6' />
            Envases devueltos
          </h1>
          <p className='text-sm sm:text-base text-gray-600'>
            Confirma la recepción de los envases vacíos que el bar entregó. Cada uno se contrasta
            con el código que registramos nosotros, y puedes escanearlos uno tras otro sin recargar:
            los contadores de la sesión quedan abajo. Sin conexión, cada lectura queda guardada
            localmente y se verifica al reconectar.
          </p>
        </div>

        {resumen && resumen.vencidos > 0 && (
          <div
            role='alert'
            className='p-4 rounded-2xl border bg-red-50 border-red-200 text-red-800 flex items-start gap-3'
          >
            <AlertTriangle className='w-5 h-5 shrink-0 mt-0.5' />
            <div className='text-sm'>
              <p className='font-bold'>
                {resumen.vencidos} envase(s) llevan más de {resumen.umbral_horas ?? UMBRAL_DEFECTO}{' '}
                horas entregados sin recibir
              </p>
              <p className='mt-1'>
                {resumen.pendientes > 0
                  ? `${resumen.pendientes} envase(s) esperan recepción en total.`
                  : 'Todos los demás ya fueron recibidos.'}{' '}
                El bar entregó y todavía no se confirmó nada de eso.
              </p>
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <div className='p-4 rounded-2xl bg-white dark:bg-slate-900/40 shadow-md'>
            <p className='text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400'>
              Pendientes por confirmar
            </p>
            <p
              className={cn(
                'mt-1 text-2xl font-bold',
                pendientes.length > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-900 dark:text-white'
              )}
            >
              {pendientes.length}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              Entregados por el bar, sin recepción registrada
            </p>
            {resumen && resumen.vencidos > 0 && (
              <p className='mt-1 text-xs font-semibold text-red-600 dark:text-red-400'>
                {resumen.vencidos} con más de {resumen.umbral_horas ?? UMBRAL_DEFECTO} h
              </p>
            )}
          </div>
          <div className='p-4 rounded-2xl bg-white dark:bg-slate-900/40 shadow-md'>
            <p className='text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400'>
              Recibidos en almacén
            </p>
            <p className='mt-1 text-2xl font-bold text-gray-900 dark:text-white'>
              {devoluciones.length - pendientes.length}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Con recepción confirmada</p>
          </div>
          <div className='p-4 rounded-2xl bg-white dark:bg-slate-900/40 shadow-md'>
            <p className='text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400'>
              Envases entregados
            </p>
            <p className='mt-1 text-2xl font-bold text-gray-900 dark:text-white'>
              {devoluciones.length}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              Últimos {devoluciones.length} movimientos del control
            </p>
          </div>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            enviarEscaneo(codigo);
          }}
          className='flex flex-col sm:flex-row gap-2'
        >
          <Input
            autoFocus
            ref={inputEnvaseRef}
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            placeholder='Escanea o digita el código del envase'
            aria-label='Código del envase recibido'
            className='rounded-full font-mono'
          />
          <Button
            type='submit'
            disabled={confirmando || !codigo.trim()}
            className='rounded-full flex items-center gap-2'
          >
            <ScanLine className='w-4 h-4' />
            {confirmando ? 'Confirmando...' : 'Confirmar recepción'}
          </Button>
        </form>

        {resultado && (
          <div
            className={cn(
              'p-4 rounded-2xl border text-sm',
              resultado.ok
                ? 'bg-green-50 border-green-200 text-green-800'
                : MOTIVOS_AVISO.includes(resultado.motivo)
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-800'
            )}
            role='status'
          >
            <p className='font-bold flex items-center gap-2'>
              {resultado.ok ? (
                <>
                  <PackageCheck className='w-4 h-4' />
                  Recepción confirmada
                </>
              ) : (
                <>
                  <AlertTriangle className='w-4 h-4' />
                  {MOTIVO_ENVASE[resultado.motivo] ?? 'No es nuestro'}
                </>
              )}
            </p>
            <p className='mt-1'>{resultado.mensaje}</p>
            {resultado.unidad && (
              <p className='text-xs mt-1 font-mono'>
                {resultado.unidad.producto_nombre || '—'} ·{' '}
                {resultado.unidad.presentacion_nombre || '—'} · SKU {resultado.unidad.codigo}
              </p>
            )}
          </div>
        )}

        <EscaneoLote
          aceptados={aceptados}
          rechazados={rechazados}
          enCola={enCola}
          sesion={sesion}
          sincronizando={sincronizando}
          sonido={sonido}
          onAlternarSonido={alternarSonido}
          onLimpiar={limpiar}
          onReintentar={sincronizar}
          etiquetaAceptado='Recibido'
          tituloAceptados='Recibidos en almacén'
        />

        <div className='space-y-2'>
          <div className='flex items-center justify-between gap-2 flex-wrap'>
            <p className='text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400'>
              {soloPendientes
                ? `Pendientes de recepción (${pendientes.length})`
                : `Historial de envases devueltos (${devoluciones.length})`}
            </p>
            <Button
              variant='outline'
              size='sm'
              className='rounded-full'
              onClick={() => setSoloPendientes(v => !v)}
            >
              {soloPendientes ? 'Ver todo el historial' : 'Ver solo pendientes'}
            </Button>
          </div>

          <div className='bg-white dark:bg-slate-900/40 rounded-3xl shadow-md overflow-hidden'>
            <div className='overflow-x-auto'>
              <Table className='min-w-full text-base text-center'>
                <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                  <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                      Entrega
                    </TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>SKU</TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                      Producto
                    </TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                      Presentación
                    </TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                      Entregado por
                    </TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                      Recepción
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.length === 0 ? (
                    <TableRow key='empty'>
                      <TableCell
                        colSpan={6}
                        className='text-center py-8 text-gray-400 text-sm sm:text-base bg-white'
                      >
                        {loading
                          ? 'Cargando...'
                          : soloPendientes
                            ? 'No hay envases pendientes de recepción.'
                            : 'Sin envases entregados por el bar.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibles.map(d => (
                      <TableRow
                        key={d.id}
                        className='border-b bg-white hover:bg-gray-50 transition-colors dark:bg-slate-900/40'
                      >
                        <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm whitespace-nowrap'>
                          <span>{fechaHora(d.fecha_devolucion).split(',')[0]}</span>
                          <br />
                          <span className='text-gray-400'>
                            {fechaHora(d.fecha_devolucion).split(',')[1]?.trim() || ''}
                          </span>
                        </TableCell>
                        <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
                          {d.codigo}
                        </TableCell>
                        <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm font-medium'>
                          {d.producto_nombre || '—'}
                        </TableCell>
                        <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm'>
                          {d.presentacion_nombre || '—'}
                        </TableCell>
                        <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm'>
                          {nombreDe(d.usuario_nombre, d.usuario_apellido, d.usuario_nick)}
                        </TableCell>
                        <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm'>
                          {d.pendiente_confirmacion ? (
                            <Badge className='bg-amber-100 text-amber-700 rounded-full px-2 sm:px-3 py-1 text-xs'>
                              Pendiente
                            </Badge>
                          ) : (
                            <>
                              <Badge className='bg-green-100 text-green-700 rounded-full px-2 sm:px-3 py-1 text-xs'>
                                Recibido
                              </Badge>
                              <p className='mt-1 text-[10px] text-gray-500'>
                                {nombreDe(
                                  d.confirmado_nombre,
                                  d.confirmado_apellido,
                                  d.confirmado_nick
                                )}
                                {d.fecha_confirmacion
                                  ? ` · ${fechaHora(d.fecha_confirmacion)}`
                                  : ''}
                              </p>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
