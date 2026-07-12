'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';

export function SettingsAttendanceTab() {
  const [config, setConfig] = useState({
    asistencia_hora_inicio: 21,
    asistencia_hora_fin: 23
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configurations');
      const result = await response.json();
      if (result.success && result.data?.asistencia) {
        setConfig({
          asistencia_hora_inicio: Number(result.data.asistencia.asistencia_hora_inicio) ?? 21,
          asistencia_hora_fin: Number(result.data.asistencia.asistencia_hora_fin) ?? 23
        });
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

  const handleSave = async () => {
    const start = Number(config.asistencia_hora_inicio);
    const end = Number(config.asistencia_hora_fin);

    if (isNaN(start) || start < 0 || start > 23 || !Number.isInteger(start)) {
      toast.error('La hora de inicio debe ser un número entero entre 0 y 23');
      return;
    }
    if (isNaN(end) || end < 0 || end > 23 || !Number.isInteger(end)) {
      toast.error('La hora de fin debe ser un número entero entre 0 y 23');
      return;
    }

    try {
      setSaving(true);
      const configs = [
        { clave: 'asistencia_hora_inicio', valor: String(start) },
        { clave: 'asistencia_hora_fin', valor: String(end) }
      ];

      const response = await fetch('/api/configurations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Configuración de asistencia guardada');
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
    <Card className='border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-xl font-bold dark:text-white'>
          <Clock className='h-5 w-5 text-neutral-500' />
          Configuración de Asistencia
        </CardTitle>
        <CardDescription className='text-neutral-500 dark:text-neutral-400'>
          Definí el rango horario en el cual los trabajadores pueden registrar su asistencia
          (entrada/salida). Fuera de este rango, el sistema registrará únicamente su ubicación pero
          no su asistencia diaria.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='text-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-500 mx-auto'></div>
            <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-2'>
              Cargando configuración...
            </p>
          </div>
        ) : (
          <div className='space-y-6 max-w-2xl'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                  Hora de Inicio (Entrada)
                </label>
                <div className='relative'>
                  <select
                    value={config.asistencia_hora_inicio}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        asistencia_hora_inicio: Number(e.target.value)
                      }))
                    }
                    className='w-full px-4 py-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white appearance-none cursor-pointer'
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}:00 hrs (
                        {h < 12 ? `${h === 0 ? 12 : h} AM` : `${h === 12 ? 12 : h - 12} PM`})
                      </option>
                    ))}
                  </select>
                  <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500'>
                    ▼
                  </div>
                </div>
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-1'>
                  La hora a partir de la cual se crea un registro de asistencia válido.
                </p>
              </div>

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                  Hora de Fin (Salida/Corte)
                </label>
                <div className='relative'>
                  <select
                    value={config.asistencia_hora_fin}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, asistencia_hora_fin: Number(e.target.value) }))
                    }
                    className='w-full px-4 py-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white appearance-none cursor-pointer'
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}:00 hrs (
                        {h < 12 ? `${h === 0 ? 12 : h} AM` : `${h === 12 ? 12 : h - 12} PM`})
                      </option>
                    ))}
                  </select>
                  <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500'>
                    ▼
                  </div>
                </div>
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-1'>
                  La hora límite para el registro.
                </p>
              </div>
            </div>

            <div className='pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end'>
              <button
                onClick={handleSave}
                disabled={saving}
                className='flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white hover:bg-neutral-800 dark:hover:bg-neutral-200 hover:scale-105 active:scale-95 transition-all duration-200 rounded-full font-bold disabled:opacity-50'
              >
                <Save className='h-4 w-4' />
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
