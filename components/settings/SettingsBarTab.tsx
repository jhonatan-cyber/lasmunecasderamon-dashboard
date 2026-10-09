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

  return (
    <Card className='border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-xl font-bold dark:text-white'>
          <GlassWater className='h-5 w-5 text-neutral-500' />
          Tragos y Shots
        </CardTitle>
        <CardDescription className='text-neutral-500 dark:text-neutral-400'>
          Cuánto se sirve en cada shot y cuánto trae la botella. La tolerancia se aplica al escanear
          una botella abierta para devolverla: el residuo aceptado queda registrado como merma. Cada
          producto puede definir sus propios ml por shot en su ficha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700'>
            <div className='flex items-center gap-3'>
              <GlassWater className='h-5 w-5 text-neutral-500 shrink-0' />
              <div className='flex-1'>
                <label
                  htmlFor='bar-shot-ml'
                  className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
                >
                  Mililitros por shot
                </label>
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                  Volumen servido en cada shot (ej: 50).
                </p>
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <input
                  id='bar-shot-ml'
                  type='number'
                  min='1'
                  max='1000'
                  disabled={loading}
                  value={shotMl}
                  onChange={event => setShotMl(event.target.value)}
                  className='w-24 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
                />
                <span className='text-sm text-neutral-500'>ml</span>
              </div>
            </div>
          </div>
          <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700'>
            <div className='flex items-center gap-3'>
              <Wine className='h-5 w-5 text-neutral-500 shrink-0' />
              <div className='flex-1'>
                <label
                  htmlFor='bar-merma-shots-ml'
                  className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
                >
                  Tolerancia de merma
                </label>
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                  Permite devolver una botella abierta con este máximo de ml restantes. 0 desactiva
                  la tolerancia.
                </p>
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <input
                  id='bar-merma-shots-ml'
                  type='number'
                  min='0'
                  max='250'
                  disabled={loading}
                  value={mermaShotsMl}
                  onChange={event => setMermaShotsMl(event.target.value)}
                  className='w-20 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
                />
                <span className='text-sm text-neutral-500'>ml</span>
              </div>
            </div>
          </div>

          <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700'>
            <div className='flex items-center gap-3'>
              <Wine className='h-5 w-5 text-neutral-500 shrink-0' />
              <div className='flex-1'>
                <label
                  htmlFor='bar-botella-ml'
                  className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
                >
                  Ml por botella (por defecto)
                </label>
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                  Se usa cuando la presentación no define sus ml (ej: 750).
                </p>
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <input
                  id='bar-botella-ml'
                  type='number'
                  min='1'
                  max='10000'
                  disabled={loading}
                  value={botellaMl}
                  onChange={event => setBotellaMl(event.target.value)}
                  className='w-24 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
                />
                <span className='text-sm text-neutral-500'>ml</span>
              </div>
            </div>
          </div>

          <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700'>
            <div className='flex items-center gap-3'>
              <AlertTriangle className='h-5 w-5 text-neutral-500 shrink-0' />
              <div className='flex-1'>
                <label
                  htmlFor='bar-shots-alerta'
                  className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
                >
                  Alerta por botella agotándose
                </label>
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                  Marca la botella abierta cuando le queden estos shots o menos.
                </p>
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <input
                  id='bar-shots-alerta'
                  type='number'
                  min='1'
                  max='50'
                  disabled={loading}
                  value={shotsAlerta}
                  onChange={event => setShotsAlerta(event.target.value)}
                  className='w-20 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
                />
                <span className='text-sm text-neutral-500'>shots</span>
              </div>
            </div>
          </div>
        </div>

        <div className='flex justify-end pt-4'>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className='flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white hover:scale-105 active:scale-95 transition-all duration-200 rounded-full font-bold disabled:opacity-50'
          >
            <Save className='h-4 w-4' />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
