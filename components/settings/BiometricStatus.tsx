'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint, RefreshCw, UserRound, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatFechaConHora } from '@/lib/utils/formatters';

interface DesfaseReloj {
  segundos: number;
  muestras: number;
}

interface EstadoLector {
  id: string;
  nombre: string;
  marca: string;
  serial: string;
  ip: string | null;
  habilitado: boolean;
  ultimo_evento: string | null;
  desfase: DesfaseReloj | null;
  hoy: string;
}

interface EstadoBiometrico {
  asistenciasBiometricasHoy: number;
  asistencias: { usuario: string; hora: string; recordId: string | null }[];
  ventana: { inicio: number; fin: number };
  lectores: EstadoLector[];
  pollerActivo: boolean;
}

const pad = (h: number) => String(h).padStart(2, '0');

/**
 * Desfase del reloj en formato humano. `segundos > 0` = reloj del lector va
 * ATRASADO (el servidor recibió el evento después de la hora que reportó el
 * equipo). Menos de 1 minuto se considera normal (incluye el ciclo del poller
 * de 15 s); más de 5 minutos se resalta en ámbar.
 */
function formatearDesfase(desfase: DesfaseReloj | null): string | null {
  if (!desfase || desfase.muestras === 0) return null;
  const total = Math.round(desfase.segundos);
  const abs = Math.abs(total);
  if (abs < 60) return 'menos de 1 minuto de desfase';
  const texto = `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
  return `${texto} ${total > 0 ? 'de atraso' : 'de adelanto'}`;
}

function TituloSeccion({ children }: { children: React.ReactNode }) {
  return (
    <h3 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
      {children}
    </h3>
  );
}

/**
 * Métrica del subsistema biométrico (Configuraciones → Asistencia):
 * asistencias registradas hoy por el lector y estado de cada equipo.
 * Se refresca solo (30s) y también lo actualiza el evento SSE de asistencia.
 *
 * El SSE se reconecta con backoff: si el proxy corta la conexión no se pierde
 * el refresco instantáneo para el resto de la sesión.
 */
export function BiometricStatus() {
  const [estado, setEstado] = useState<EstadoBiometrico | null>(null);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [error, setError] = useState('');
  const cargandoRef = useRef(false);

  const load = useCallback(async () => {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    setRefrescando(true);
    try {
      const res = await fetch('/api/biometric/status', { cache: 'no-store' });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || 'Error de conexión.');
      setEstado(result.data);
      setUltimaActualizacion(new Date().toISOString());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      cargandoRef.current = false;
      setRefrescando(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const intervalo = setInterval(() => void load(), 30_000);

    // Refresco instantáneo cuando alguien marca asistencia (incluido el lector).
    let vivo = true;
    let intentos = 0;
    let fuente: EventSource | null = null;
    let reintento: ReturnType<typeof setTimeout> | null = null;

    const conectar = () => {
      if (!vivo) return;
      fuente = new EventSource('/api/sse');
      fuente.addEventListener('attendance_registered', () => void load());
      fuente.onopen = () => {
        intentos = 0;
      };
      fuente.onerror = () => {
        fuente?.close();
        if (!vivo) return;
        const espera = Math.min(30_000, 1_000 * 2 ** intentos);
        intentos += 1;
        reintento = setTimeout(conectar, espera);
      };
    };
    conectar();

    return () => {
      vivo = false;
      clearInterval(intervalo);
      if (reintento) clearTimeout(reintento);
      fuente?.close();
    };
  }, [load]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Fingerprint className='h-5 w-5' /> Asistencia biométrica
          </CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-4' role='status'>
          <div className='grid gap-4 sm:grid-cols-[10rem_1fr]'>
            <Skeleton className='h-24 w-full' />
            <Skeleton className='h-24 w-full' />
          </div>
          <Skeleton className='h-16 w-full' />
          <Skeleton className='h-16 w-full' />
          <span className='sr-only'>Cargando estado...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !estado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Fingerprint className='h-5 w-5' /> Asistencia biométrica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role='alert'
            className='flex flex-col items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10'
          >
            <p className='text-sm text-amber-800 dark:text-amber-300'>
              {error || 'No se pudo cargar el estado.'}
            </p>
            <Button
              className='rounded-full'
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void load()}
            >
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const habilitados = estado.lectores.filter(l => l.habilitado);
  const ventana = `${pad(estado.ventana.inicio)}:00 → ${pad(estado.ventana.fin)}:00`;

  return (
    <Card>
      <CardHeader className='flex flex-row items-start justify-between space-y-0'>
        <div className='space-y-1.5'>
          <CardTitle className='flex items-center gap-2'>
            <Fingerprint className='h-5 w-5' /> Asistencia biométrica
          </CardTitle>
          <CardDescription>
            Ventana {ventana} · red de seguridad {estado.pollerActivo ? 'activa' : 'inactiva'}
            {ultimaActualizacion && <> · actualizado {formatFechaConHora(ultimaActualizacion)}</>}
          </CardDescription>
        </div>
        <Button
          className='rounded-full'
          type='button'
          variant='outline'
          size='sm'
          onClick={() => void load()}
          disabled={refrescando}
          title='Refrescar ahora'
        >
          <RefreshCw className={`h-4 w-4 ${refrescando ? 'animate-spin' : ''}`} />
          <span className='sr-only'>Refrescar</span>
        </Button>
      </CardHeader>
      <CardContent className='flex flex-col gap-5'>
        <section className='flex flex-col gap-3'>
          <TituloSeccion>Hoy</TituloSeccion>
          <div className='grid gap-4 sm:grid-cols-[10rem_1fr]'>
            <div className='flex flex-col justify-center rounded-2xl bg-muted/60 px-5 py-4'>
              <p className='text-4xl font-semibold tabular-nums'>
                {estado.asistenciasBiometricasHoy}
              </p>
              <p className='text-xs text-muted-foreground'>asistencias por lector hoy</p>
            </div>

            <div className='rounded-2xl border p-4'>
              <TituloSeccion>Últimos marcasjes</TituloSeccion>
              {estado.asistencias.length === 0 ? (
                <p className='mt-2 text-sm text-muted-foreground'>
                  Todavía nadie marcó asistencia hoy.
                </p>
              ) : (
                <ul className='mt-2 flex flex-col gap-1.5 text-sm'>
                  {estado.asistencias.slice(0, 5).map(a => (
                    <li
                      key={`${a.usuario}-${a.hora}`}
                      className='flex items-center justify-between gap-3'
                    >
                      <span className='flex min-w-0 items-center gap-2'>
                        {a.recordId ? (
                          // La foto es el JPEG que capturó el lector en la puerta
                          // (cookie de sesión viaja sola en el <img>).
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/biometric/records/${a.recordId}/foto`}
                            alt={`Foto de ${a.usuario} al marcar`}
                            width={32}
                            height={32}
                            loading='lazy'
                            className='h-8 w-8 shrink-0 rounded-md border object-cover'
                            onError={evento => {
                              evento.currentTarget.style.visibility = 'hidden';
                            }}
                          />
                        ) : (
                          <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted'>
                            <UserRound className='h-4 w-4 text-muted-foreground' />
                          </span>
                        )}
                        <span className='truncate'>{a.usuario}</span>
                      </span>
                      <span className='tabular-nums text-muted-foreground'>
                        {a.hora.substring(0, 5)}
                      </span>
                    </li>
                  ))}
                  {estado.asistencias.length > 5 && (
                    <li className='text-xs text-muted-foreground'>
                      y {estado.asistencias.length - 5} más...
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className='flex flex-col gap-2'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <TituloSeccion>
              Lectores ({habilitados.length}/{estado.lectores.length} recogiendo)
            </TituloSeccion>
            {estado.lectores.length > 0 && (
              <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                <Wifi
                  className={
                    habilitados.length > 0
                      ? 'h-3.5 w-3.5 text-green-600 dark:text-green-400'
                      : 'h-3.5 w-4'
                  }
                />
                {habilitados.length > 0 ? 'Recogiendo' : 'Ninguno activo'}
              </span>
            )}
          </div>

          {estado.lectores.length === 0 ? (
            <p className='rounded-2xl border border-dashed p-4 text-sm text-muted-foreground'>
              No hay lectores vinculados. Vinculá uno en la tarjeta de abajo para que las
              verificaciones de la puerta se conviertan en asistencia.
            </p>
          ) : (
            <ul className='flex flex-col gap-2'>
              {estado.lectores.map(lector => (
                <li
                  key={lector.id}
                  className='flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3'
                >
                  <div className='min-w-0'>
                    <p className='font-medium'>
                      {lector.nombre}
                      <span className='ml-2 text-xs font-normal text-muted-foreground'>
                        {lector.marca === 'dahua' ? 'Dahua' : 'ZKTeco'}
                        {lector.ip ? ` · ${lector.ip}` : ''}
                      </span>
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Último evento:{' '}
                      {lector.ultimo_evento ? formatFechaConHora(lector.ultimo_evento) : 'nunca'}
                    </p>
                    {lector.desfase && lector.desfase.muestras > 0 && (
                      <p className='text-xs text-muted-foreground'>
                        Reloj del lector:{' '}
                        <span
                          className={
                            Math.abs(lector.desfase.segundos) > 300
                              ? 'font-medium text-amber-700 dark:text-amber-400'
                              : undefined
                          }
                        >
                          {formatearDesfase(lector.desfase)}
                        </span>{' '}
                        ({lector.desfase.muestras} evento(s) en 24 h)
                      </p>
                    )}
                  </div>
                  <span
                    className={
                      lector.habilitado
                        ? 'rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300'
                        : 'rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }
                  >
                    {lector.habilitado ? 'Recogiendo asistencia' : 'Sin recolección'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {habilitados.length === 0 && estado.lectores.length > 0 && (
            <p className='text-xs text-muted-foreground'>
              Encendé un lector para que sus verificaciones se conviertan en asistencia.
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
