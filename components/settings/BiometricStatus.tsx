'use client';

import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFechaConHora } from '@/lib/utils/formatters';

interface EstadoLector {
  id: string;
  nombre: string;
  marca: string;
  serial: string;
  ip: string | null;
  habilitado: boolean;
  ultimo_evento: string | null;
  hoy: string;
}

interface EstadoBiometrico {
  asistenciasBiometricasHoy: number;
  asistencias: { usuario: string; hora: string }[];
  ventana: { inicio: number; fin: number };
  lectores: EstadoLector[];
  pollerActivo: boolean;
}

/**
 * Métrica del subsistema biométrico (Configuraciones → Asistencia):
 * asistencias registradas hoy por el lector y estado de cada equipo.
 * Se refresca solo (30s) y también lo actualiza el evento SSE de asistencia.
 */
export function BiometricStatus() {
  const [estado, setEstado] = useState<EstadoBiometrico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/biometric/status', { cache: 'no-store' });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || 'Error de conexión.');
      setEstado(result.data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const intervalo = setInterval(() => void load(), 30_000);

    // Refresco instantáneo cuando alguien marca asistencia (incluido el lector).
    const fuente = new EventSource('/api/sse');
    fuente.addEventListener('attendance_registered', () => void load());
    fuente.onerror = () => fuente.close();

    return () => {
      clearInterval(intervalo);
      fuente.close();
    };
  }, [load]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asistencia biométrica</CardTitle>
        </CardHeader>
        <CardContent>
          <p role='status'>Cargando estado...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !estado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asistencia biométrica</CardTitle>
        </CardHeader>
        <CardContent>
          <div role='alert' className='flex flex-col gap-2'>
            <p>{error || 'No se pudo cargar el estado.'}</p>
            <Button type='button' variant='outline' onClick={() => void load()}>
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const habilitados = estado.lectores.filter(l => l.habilitado);

  return (
    <Card>
      <CardHeader className='flex flex-row items-start justify-between space-y-0'>
        <div className='space-y-1.5'>
          <CardTitle className='flex items-center gap-2'>
            <Fingerprint className='h-5 w-5' /> Asistencia biométrica
          </CardTitle>
          <CardDescription>
            Ventana configurada: {estado.ventana.inicio}:00 a {estado.ventana.fin}:00 · red de
            seguridad {estado.pollerActivo ? 'activa' : 'inactiva'}
          </CardDescription>
        </div>
        <Button type='button' variant='outline' size='sm' onClick={() => void load()}>
          <RefreshCw className='h-4 w-4' />
          <span className='sr-only'>Refrescar</span>
        </Button>
      </CardHeader>
      <CardContent className='flex flex-col gap-5'>
        <div className='flex flex-wrap items-end gap-6'>
          <div>
            <p className='text-4xl font-semibold tabular-nums'>
              {estado.asistenciasBiometricasHoy}
            </p>
            <p className='text-sm text-muted-foreground'>asistencias por lector hoy</p>
          </div>
          {estado.asistencias.length > 0 && (
            <ul className='flex min-w-0 flex-1 flex-col gap-1 text-sm'>
              {estado.asistencias.slice(0, 5).map(a => (
                <li
                  key={`${a.usuario}-${a.hora}`}
                  className='flex items-center justify-between gap-3'
                >
                  <span className='truncate'>{a.usuario}</span>
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

        <div className='flex flex-col gap-2'>
          <h3 className='text-sm font-medium'>Lectores</h3>
          {estado.lectores.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No hay lectores vinculados.</p>
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
              Encendé un lector abajo para que sus verificaciones se conviertan en asistencia.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
