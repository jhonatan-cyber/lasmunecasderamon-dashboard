'use client';

import { useState, useEffect } from 'react';
import { Save, GlassWater, Wine, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';
import { categoriaDeClave, defaultDeClave } from '@/modules/configuracion/contracts';
import { refrescarConfiguraciones } from '@/hooks/shared/useConfigValue';

// Defaults y categoría salen del registro de claves: la misma lista que valida el endpoint,
// así el formulario y el servidor no pueden discrepar sobre 50/750/3.
const CATEGORIA_BAR = categoriaDeClave('shot_ml');
const defaultDe = (clave: string) => String(defaultDeClave(clave));

export function SettingsBarTab() {
  const [shotMl, setShotMl] = useState(() => defaultDe('shot_ml'));
  const [botellaMl, setBotellaMl] = useState(() => defaultDe('botella_ml'));
  const [shotsAlerta, setShotsAlerta] = useState(() => defaultDe('shots_alerta'));
  const [mermaShotsMl, setMermaShotsMl] = useState(() => defaultDe('merma_shots_ml'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/configurations');
        const result = await response.json();
        if (!cancelled && result.success) {
          const bar = result.data?.[CATEGORIA_BAR ?? 'bar'] ?? {};
          const guardadoShot = bar.shot_ml;
          const guardadoBotella = bar.botella_ml;
          const guardadoAlerta = bar.shots_alerta;
          const guardadaMerma = bar.merma_shots_ml;
          if (guardadoShot !== undefined && guardadoShot !== null && String(guardadoShot).trim()) {
            setShotMl(String(guardadoShot));
          }
          if (
            guardadoBotella !== undefined &&
            guardadoBotella !== null &&
            String(guardadoBotella).trim()
          ) {
            setBotellaMl(String(guardadoBotella));
          }
          if (
            guardadoAlerta !== undefined &&
            guardadoAlerta !== null &&
            String(guardadoAlerta).trim()
          ) {
            setShotsAlerta(String(guardadoAlerta));
          }
          if (
            guardadaMerma !== undefined &&
            guardadaMerma !== null &&
            String(guardadaMerma).trim()
          ) {
            setMermaShotsMl(String(guardadaMerma));
          }
        }
      } catch (error) {
        logger.captureException(error, { context: 'SettingsBarTab:fetch' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    const shot = Number(String(shotMl).trim());
    if (!Number.isInteger(shot) || shot < 1 || shot > 1000) {
      toast.error('Los ml por shot deben ser un número entero entre 1 y 1000');
      return;
    }
    const botella = Number(String(botellaMl).trim());
    if (!Number.isInteger(botella) || botella < 1 || botella > 10000) {
      toast.error('Los ml de la botella deben ser un número entero entre 1 y 10000');
      return;
    }
    if (shot > botella) {
      toast.error('Los ml por shot no pueden superar los ml de la botella');
      return;
    }
    const alerta = Number(String(shotsAlerta).trim());
    if (!Number.isInteger(alerta) || alerta < 1 || alerta > 50) {
      toast.error('La alerta debe ser un número entero entre 1 y 50 shots restantes');
      return;
    }
    const merma = Number(String(mermaShotsMl).trim());
    if (!Number.isInteger(merma) || merma < 0 || merma > 250) {
      toast.error('La merma permitida debe ser un número entero entre 0 y 250 ml');
      return;
    }
    try {
      setSaving(true);
      const response = await fetch('/api/configurations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: [
            { clave: 'shot_ml', valor: String(shot) },
            { clave: 'botella_ml', valor: String(botella) },
            { clave: 'shots_alerta', valor: String(alerta) },
            { clave: 'merma_shots_ml', valor: String(merma) }
          ]
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Error al guardar');
      }
      setShotMl(String(shot));
      setBotellaMl(String(botella));
      setShotsAlerta(String(alerta));
      setMermaShotsMl(String(merma));
      // El resto de la pestaña lee la configuración de la caché compartida: sin esto, el bar
      // y los formularios seguirían mostrando el valor viejo hasta recargar.
      await refrescarConfiguraciones();
      toast.success('Tragos y shots actualizados');
    } catch (error) {
      logger.captureException(error, { context: 'SettingsBarTab:save' });
      toast.error('Error al guardar la configuración del bar');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    {
      id: 'bar-shot-ml',
      title: 'Mililitros por shot',
      icon: GlassWater,
      description: 'Cantidad que se sirve en cada shot.',
      hint: 'Medida general para productos sin un valor propio.',
      value: shotMl,
      onChange: setShotMl,
      min: 1,
      max: 1000,
      unit: 'ml',
      tone: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
    },
    {
      id: 'bar-botella-ml',
      title: 'Capacidad de la botella',
      icon: Wine,
      description: 'Volumen de la botella por defecto.',
      hint: 'Se usa cuando la presentación no define sus mililitros.',
      value: botellaMl,
      onChange: setBotellaMl,
      min: 1,
      max: 10000,
      unit: 'ml',
      tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
    },
    {
      id: 'bar-shots-alerta',
      title: 'Alerta de nivel bajo',
      icon: AlertTriangle,
      description: 'Avisa cuando queden estos shots o menos.',
      hint: 'Ayuda a identificar las botellas abiertas que están por agotarse.',
      value: shotsAlerta,
      onChange: setShotsAlerta,
      min: 1,
      max: 50,
      unit: 'shots',
      tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
    },
    {
      id: 'bar-merma-shots-ml',
      title: 'Tolerancia de merma',
      icon: Wine,
      description: 'Residuo máximo al devolver una botella abierta.',
      hint: 'El residuo aceptado se registra como merma. Usa 0 para desactivar.',
      value: mermaShotsMl,
      onChange: setMermaShotsMl,
      min: 0,
      max: 250,
      unit: 'ml',
      tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    }
  ];

  return (
    <Card className='overflow-hidden rounded-2xl border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'>
      <CardHeader className='gap-2 p-5 sm:p-6'>
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800'>
            <GlassWater className='h-5 w-5 text-neutral-700 dark:text-neutral-300' />
          </div>
          <CardTitle className='text-lg font-semibold leading-tight text-neutral-900 sm:text-xl dark:text-white'>
            Medidas y control del bar
          </CardTitle>
        </div>
        <CardDescription className='max-w-3xl leading-relaxed text-neutral-500 dark:text-neutral-400'>
          Define las medidas generales de servicio, las alertas de nivel bajo y la tolerancia al
          devolver botellas abiertas.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-5 px-5 pb-5 sm:px-6 sm:pb-6'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4'>
          {fields.map(
            ({
              id,
              title,
              icon: Icon,
              description,
              hint,
              value,
              onChange,
              min,
              max,
              unit,
              tone
            }) => (
              <div
                key={id}
                className='flex min-w-0 flex-col rounded-xl border border-neutral-200 bg-neutral-50/60 p-5 dark:border-neutral-800 dark:bg-neutral-950/40'
              >
                <div className='mb-4 flex items-center gap-3'>
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
                  >
                    <Icon className='h-4 w-4' aria-hidden='true' />
                  </div>
                  <label
                    htmlFor={id}
                    className='text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100'
                  >
                    {title}
                  </label>
                </div>
                <p
                  id={`${id}-description`}
                  className='mb-4 min-h-10 text-sm leading-5 text-neutral-600 dark:text-neutral-400'
                >
                  {description}
                </p>
                <div className='relative mt-auto'>
                  <input
                    id={id}
                    type='number'
                    inputMode='numeric'
                    min={min}
                    max={max}
                    step={1}
                    disabled={loading || saving}
                    value={value}
                    onChange={event => onChange(event.target.value)}
                    aria-describedby={`${id}-description ${id}-hint`}
                    className='h-12 w-full rounded-xl border border-neutral-300 bg-white pl-4 pr-20 text-lg font-semibold tabular-nums text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-neutral-400 dark:focus:ring-neutral-700'
                  />
                  <span className='pointer-events-none absolute inset-y-0 right-8 flex items-center text-sm font-medium text-neutral-500 dark:text-neutral-400'>
                    {unit}
                  </span>
                </div>
                <p
                  id={`${id}-hint`}
                  className='mt-3 min-h-12 text-xs leading-4 text-neutral-500 dark:text-neutral-400'
                >
                  {hint}
                </p>
              </div>
            )
          )}
        </div>
        <div className='rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm leading-relaxed text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200'>
          <span className='font-semibold'>Medidas por producto.</span> Puedes definir distintos ml
          por shot para cliente y anfitriona en la ficha del producto o al traspasar. Esos valores
          tienen prioridad sobre estas medidas generales.
        </div>
        <div className='flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800'>
          <p className='text-xs text-neutral-500 dark:text-neutral-400' role='status'>
            {loading
              ? 'Cargando configuración…'
              : saving
                ? 'Guardando configuración…'
                : 'Guarda los cambios para aplicarlos al bar.'}
          </p>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className='inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:focus-visible:ring-offset-neutral-900'
          >
            <Save className='h-4 w-4' aria-hidden='true' />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
