'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Clock, Loader2, Save, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';

interface Ventana {
  asistencia_hora_inicio: number;
  asistencia_hora_fin: number;
}

const VENTANA_DEFECTO: Ventana = { asistencia_hora_inicio: 21, asistencia_hora_fin: 23 };

const HORA_DEFECTO = { inicio: 21, fin: 23 };

const pad = (h: number) => String(h).padStart(2, '0');

/** 0 → 12 AM · 12 → 12 PM · 13 → 1 PM */
const etiqueta12 = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;

const HORAS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: `${pad(h)}:00 hrs (${etiqueta12(h)})`
}));

const MARCAS_HORA = [0, 6, 12, 18, 24];

/**
 * Barra de 24 h que dibuja la ventana de asistencia y dónde estamos ahora.
 * La ventana es semiabierta en el servidor (`hora >= inicio && hora < fin`),
 * así que `inicio >= fin` no cruza medianoche: deja la ventana vacía.
 */
function VentanaTimeline({
  inicio,
  fin,
  valida
}: {
  inicio: number;
  fin: number;
  valida: boolean;
}) {
  const ahora = new Date().getHours();
  const dentro = valida && ahora >= inicio && ahora < fin;
  const pctAhora = ((ahora + 0.5) / 24) * 100;
  // Sin este tope la etiqueta se sale de la tarjeta cerca de las 00 o las 23.
  const pctEtiqueta = Math.min(Math.max(pctAhora, 4), 96);

  return (
    <div className='flex flex-col gap-3'>
      <div className='relative pt-7'>
        <div
          className='absolute top-0 -translate-x-1/2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200'
          style={{ left: `${pctEtiqueta}%` }}
        >
          ahora
        </div>
        <div className='h-10 overflow-hidden rounded-xl border border-border bg-muted'>
          <div className='relative h-full'>
            {valida ? (
              <div
                className='absolute inset-y-0 border-y border-emerald-600/40 bg-emerald-500/25 transition-all duration-300 dark:border-emerald-400/40 dark:bg-emerald-400/20 motion-reduce:transition-none'
                style={{
                  left: `${(inicio / 24) * 100}%`,
                  width: `${((fin - inicio) / 24) * 100}%`
                }}
              />
            ) : (
              <div className='absolute inset-0 bg-amber-500/20' />
            )}
            <div className='pointer-events-none absolute inset-0 flex' aria-hidden='true'>
              {MARCAS_HORA.slice(0, -1).map(h => (
                <div key={h} className='flex-1 border-r border-foreground/20 last:border-r-0' />
              ))}
            </div>
            <div
              className='absolute inset-y-0 w-0.5 -translate-x-1/2 bg-amber-500 ring-1 ring-background transition-all duration-300 motion-reduce:transition-none'
              style={{ left: `${((ahora + 0.5) / 24) * 100}%` }}
              aria-hidden='true'
            />
          </div>
        </div>
        <div className='mt-2 flex justify-between text-[11px] tabular-nums text-muted-foreground'>
          {MARCAS_HORA.map(h => (
            <span key={h}>{pad(h)}</span>
          ))}
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground'>
        <span className='flex items-center gap-1.5'>
          <span className='h-2.5 w-4 shrink-0 rounded-sm border border-emerald-600/40 bg-emerald-500/25 dark:border-emerald-400/40 dark:bg-emerald-400/20' />
          Se registra asistencia
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='h-2.5 w-4 shrink-0 rounded-sm border border-foreground/25 bg-muted' />
          Solo ubicación
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='h-2.5 w-1 rounded-sm bg-amber-500' />
          {dentro ? 'Estás dentro de la ventana' : 'Ahora fuera de la ventana'}
        </span>
      </div>
    </div>
  );
}

export function SettingsAttendanceTab() {
  const [config, setConfig] = useState<Ventana>(VENTANA_DEFECTO);
  const [guardado, setGuardado] = useState<Ventana>(VENTANA_DEFECTO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configurations');
      const result = await response.json();
      if (result.success && result.data?.asistencia) {
        const inicio = Number(result.data.asistencia.asistencia_hora_inicio);
        const fin = Number(result.data.asistencia.asistencia_hora_fin);
        const siguiente: Ventana = {
          asistencia_hora_inicio: Number.isInteger(inicio) ? inicio : HORA_DEFECTO.inicio,
          asistencia_hora_fin: Number.isInteger(fin) ? fin : HORA_DEFECTO.fin
        };
        setConfig(siguiente);
        setGuardado(siguiente);
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsAttendanceTab:fetch' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const inicio = config.asistencia_hora_inicio;
  const fin = config.asistencia_hora_fin;

  // El servidor acepta `hora >= inicio && hora < fin`: con inicio >= fin no
  // entraría nunca ninguna marca, así que se corta acá antes de guardar.
  const valida = inicio >= 0 && fin <= 23 && inicio < fin;
  const duracion = valida ? fin - inicio : 0;
  const sucio = inicio !== guardado.asistencia_hora_inicio || fin !== guardado.asistencia_hora_fin;

  const handleSave = async () => {
    if (!valida) {
      toast.error('La hora de fin debe ser posterior a la de inicio');
      return;
    }

    try {
      setSaving(true);
      const configs = [
        { clave: 'asistencia_hora_inicio', valor: String(inicio) },
        { clave: 'asistencia_hora_fin', valor: String(fin) }
      ];

      const response = await fetch('/api/configurations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs })
      });
      const result = await response.json();
      if (result.success) {
        setGuardado({ asistencia_hora_inicio: inicio, asistencia_hora_fin: fin });
        toast.success('Ventana de asistencia guardada');
      } else {
        throw new Error(result.error || 'Error al guardar');
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsAttendanceTab:save' });
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-xl font-bold'>
          <Clock className='h-5 w-5 text-muted-foreground' />
          Ventana de asistencia
        </CardTitle>
        <CardDescription>
          Rango en el que se aceptan marcas de entrada y salida. Fuera de él el sistema guarda la
          ubicación pero no computa la asistencia del día.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='space-y-4 max-w-2xl' role='status' aria-label='Cargando configuración'>
            <Skeleton className='h-6 w-44' />
            <Skeleton className='h-24 w-full' />
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              <Skeleton className='h-20 w-full' />
              <Skeleton className='h-20 w-full' />
            </div>
            <Skeleton className='h-10 w-40 self-end' />
            <span className='sr-only'>Cargando configuración...</span>
          </div>
        ) : (
          <div className='flex flex-col gap-6'>
            <div className='max-w-full overflow-x-auto pb-2'>
              <div className='grid min-w-[760px] grid-cols-[minmax(380px,0.9fr)_minmax(340px,1.1fr)] items-center gap-6'>
                <div className='grid min-w-0 grid-cols-2 items-start gap-4'>
                  <div className='space-y-2'>
                    <label
                      htmlFor='attendance-hora-inicio'
                      className='block text-sm font-medium text-neutral-700 dark:text-neutral-300'
                    >
                      Hora de inicio (entrada)
                    </label>
                    <div className='relative'>
                      <select
                        id='attendance-hora-inicio'
                        value={inicio}
                        onChange={e =>
                          setConfig(prev => ({
                            ...prev,
                            asistencia_hora_inicio: Number(e.target.value)
                          }))
                        }
                        className='w-full appearance-none rounded-full border border-neutral-300 bg-white px-4 py-2 pr-10 text-neutral-900 focus:ring-2 focus:ring-black focus:border-transparent dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:focus:ring-white cursor-pointer'
                      >
                        {HORAS.map(h => (
                          <option key={h.value} value={h.value}>
                            {h.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className='pointer-events-none absolute inset-y-0 right-4 my-auto h-4 w-4 text-neutral-500' />
                    </div>
                    <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                      Primera hora en la que una marca cuenta como asistencia.
                    </p>
                  </div>

                  <div className='space-y-2'>
                    <label
                      htmlFor='attendance-hora-fin'
                      className='block text-sm font-medium text-neutral-700 dark:text-neutral-300'
                    >
                      Hora de fin (salida / corte)
                    </label>
                    <div className='relative'>
                      <select
                        id='attendance-hora-fin'
                        value={fin}
                        onChange={e =>
                          setConfig(prev => ({
                            ...prev,
                            asistencia_hora_fin: Number(e.target.value)
                          }))
                        }
                        className='w-full appearance-none rounded-full border border-neutral-300 bg-white px-4 py-2 pr-10 text-neutral-900 focus:ring-2 focus:ring-black focus:border-transparent dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:focus:ring-white cursor-pointer'
                      >
                        {HORAS.map(h => (
                          <option key={h.value} value={h.value}>
                            {h.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className='pointer-events-none absolute inset-y-0 right-4 my-auto h-4 w-4 text-neutral-500' />
                    </div>
                    <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                      Hora en que deja de aceptarse (no incluida).
                    </p>
                  </div>
                </div>
                <section className='flex min-w-0 flex-col justify-center gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground'>
                  <div className='flex flex-wrap items-baseline justify-between gap-2'>
                    <h3 className='text-sm font-semibold'>Ventana actual</h3>
                    <span
                      className={
                        valida
                          ? 'rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground'
                          : 'rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }
                    >
                      {valida
                        ? `${pad(inicio)}:00 → ${pad(fin)}:00 · ${duracion} h`
                        : 'Ventana vacía'}
                    </span>
                  </div>
                  <VentanaTimeline inicio={inicio} fin={fin} valida={valida} />
                </section>
              </div>
            </div>

            {!valida && (
              <div
                role='alert'
                className='flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10'
              >
                <TriangleAlert className='mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400' />
                <p className='text-xs text-amber-800 dark:text-amber-300'>
                  La hora de fin debe ser posterior a la hora de inicio. Con{' '}
                  <strong>
                    {pad(inicio)}:00 → {pad(fin)}:00
                  </strong>{' '}
                  no entraría ninguna marca y nadie podría registrar asistencia.
                </p>
              </div>
            )}

            <div className='flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800'>
              <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                {valida
                  ? 'Los cambios afectan a las marcas nuevas, no a las ya registradas.'
                  : 'Corregí el rango para poder guardar.'}
              </p>
              <div className='flex items-center gap-3'>
                {sucio && !saving && (
                  <span className='text-xs font-medium text-amber-700 dark:text-amber-400'>
                    Cambios sin guardar
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !sucio || !valida}
                  className='flex items-center gap-2 rounded-full border-2 border-black bg-black px-6 py-2.5 font-bold text-white transition-all duration-200 hover:scale-105 hover:bg-neutral-800 active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200'
                >
                  {saving ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Save className='h-4 w-4' />
                  )}
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
