'use client';

import { useState, useEffect } from 'react';
import { Save, GlassWater } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';

const DEFAULT_SHOT_ML = 50;

export function SettingsBarTab() {
  const [shotMl, setShotMl] = useState(String(DEFAULT_SHOT_ML));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/configurations');
        const result = await response.json();
        if (!cancelled && result.success) {
          const saved = result.data?.bar?.shot_ml;
          if (saved !== undefined && saved !== null && String(saved).trim() !== '') {
            setShotMl(String(saved));
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
    const value = Number(String(shotMl).trim());
    if (!Number.isInteger(value) || value < 1 || value > 1000) {
      toast.error('Los ml por shot deben ser un número entero entre 1 y 1000');
      return;
    }
    try {
      setSaving(true);
      const response = await fetch('/api/configurations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: [{ clave: 'shot_ml', valor: String(value) }] })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Error al guardar');
      }
      setShotMl(String(value));
      toast.success('Mililitros por shot actualizados');
    } catch (error) {
      logger.captureException(error, { context: 'SettingsBarTab:save' });
      toast.error('Error al guardar los ml por shot');
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
          Volumen que se sirve en cada shot de los tragos. Se muestra junto a las opciones de venta
          del bar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700 max-w-sm'>
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
                Volumen servido por shot (ej: 50).
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
                className='w-28 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
              />
              <span className='text-sm text-neutral-500'>ml</span>
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
