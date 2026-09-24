'use client';

import { useState, useEffect } from 'react';
import { Save, Users, BedDouble, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { setServiceLevels } from '@/components/orders/productModalRules';

export function SettingsServiceLevelsCard() {
  const configSimple = useConfigValue('comisiones', 'umbral_simple_hasta', 10000);
  const configHostess = useConfigValue('comisiones', 'umbral_anfitriona_desde', 20000);
  const configHabitacion = useConfigValue('comisiones', 'umbral_habitacion_desde', 30000);
  const [simpleValue, setSimpleValue] = useState('');
  const [hostessValue, setHostessValue] = useState('');
  const [habitacionValue, setHabitacionValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSimpleValue(String(configSimple));
  }, [configSimple]);

  useEffect(() => {
    setHostessValue(String(configHostess));
  }, [configHostess]);

  useEffect(() => {
    setHabitacionValue(String(configHabitacion));
  }, [configHabitacion]);

  // Aplica los valores guardados al runtime en cuanto cargan.
  useEffect(() => {
    setServiceLevels({
      simpleHasta: Number(configSimple),
      hostessDesde: Number(configHostess),
      habitacionDesde: Number(configHabitacion)
    });
  }, [configSimple, configHostess, configHabitacion]);

  const handleSave = async () => {
    const simple = Number(simpleValue.trim());
    const hostess = Number(hostessValue.trim());
    const habitacion = Number(habitacionValue.trim());
    if (!Number.isInteger(simple) || simple < 0) {
      toast.error('La venta simple debe ser un entero mayor o igual a 0');
      return;
    }
    if (!Number.isInteger(hostess) || hostess < 0) {
      toast.error('El umbral de anfitriona debe ser un entero mayor o igual a 0');
      return;
    }
    if (!Number.isInteger(habitacion) || habitacion < 0) {
      toast.error('El umbral de habitación debe ser un entero mayor o igual a 0');
      return;
    }
    if (hostess < simple) {
      toast.error('El umbral de anfitriona no puede ser menor a la venta simple');
      return;
    }
    if (habitacion < hostess) {
      toast.error('El umbral de habitación no puede ser menor al de anfitriona');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/configurations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: [
            { clave: 'umbral_simple_hasta', valor: String(simple) },
            { clave: 'umbral_anfitriona_desde', valor: String(hostess) },
            { clave: 'umbral_habitacion_desde', valor: String(habitacion) }
          ]
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) throw new Error(result.message || 'Error al guardar');
      setServiceLevels({ simpleHasta: simple, hostessDesde: hostess, habitacionDesde: habitacion });
      toast.success('Reglas por precio actualizadas');
    } catch (error) {
      logger.captureException(error, { context: 'SettingsServiceLevelsCard:save' });
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className='border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-xl font-bold dark:text-white'>
          <Users className='h-5 w-5 text-neutral-500' />
          Reglas por Precio de Venta
        </CardTitle>
        <CardDescription className='text-neutral-500 dark:text-neutral-400'>
          Fuente única de reglas por precio. Hasta el primer monto es venta simple (sin comisión ni
          anfitriona); desde el segundo se puede asignar anfitriona; desde el tercero, además, se
          exige habitación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700'>
            <div className='flex items-center gap-3'>
              <ShoppingCart className='h-5 w-5 text-neutral-500 shrink-0' />
              <div className='flex-1'>
                <label
                  htmlFor='service-simple'
                  className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
                >
                  Venta simple hasta
                </label>
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                  Sin comisión ni anfitriona hasta este precio.
                </p>
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <span className='text-sm text-neutral-500'>$</span>
                <input
                  id='service-simple'
                  type='number'
                  min='0'
                  value={simpleValue}
                  onChange={e => setSimpleValue(e.target.value)}
                  className='w-28 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
                />
              </div>
            </div>
          </div>

          <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700'>
            <div className='flex items-center gap-3'>
              <Users className='h-5 w-5 text-neutral-500 shrink-0' />
              <div className='flex-1'>
                <label
                  htmlFor='service-hostess'
                  className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
                >
                  Anfitriona desde
                </label>
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                  Precio mínimo para asignar anfitriona.
                </p>
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <span className='text-sm text-neutral-500'>$</span>
                <input
                  id='service-hostess'
                  type='number'
                  min='0'
                  value={hostessValue}
                  onChange={e => setHostessValue(e.target.value)}
                  className='w-28 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
                />
              </div>
            </div>
          </div>

          <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700'>
            <div className='flex items-center gap-3'>
              <BedDouble className='h-5 w-5 text-neutral-500 shrink-0' />
              <div className='flex-1'>
                <label
                  htmlFor='service-habitacion'
                  className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
                >
                  Habitación desde
                </label>
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                  Precio mínimo para exigir habitación.
                </p>
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <span className='text-sm text-neutral-500'>$</span>
                <input
                  id='service-habitacion'
                  type='number'
                  min='0'
                  value={habitacionValue}
                  onChange={e => setHabitacionValue(e.target.value)}
                  className='w-28 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
                />
              </div>
            </div>
          </div>
        </div>

        <div className='flex justify-end pt-4'>
          <button
            onClick={handleSave}
            disabled={saving}
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
