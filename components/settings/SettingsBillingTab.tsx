'use client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { BillingConfig } from './settings-types';
import logger from '@/lib/utils/logger';
import { categoriaDeClave, defaultDeClave } from '@/modules/configuracion/contracts';
import { refrescarConfiguraciones } from '@/hooks/shared/useConfigValue';
import { Label } from '@/components/ui/label';

// Defaults y categorías salen del registro de claves: el mismo que valida el endpoint, así
// el formulario no abre con un número distinto del que el servidor usaría.
const CATEGORIA_FACTURACION = categoriaDeClave('impuesto_iva');
const CATEGORIA_COMISIONES = categoriaDeClave('split_tarjeta_venta');
const defaultDe = (clave: string) => String(defaultDeClave(clave));

export function SettingsBillingTab() {
  const [config, setConfig] = useState<BillingConfig>({
    impuesto_iva: defaultDe('impuesto_iva'),
    propina_venta: defaultDe('propina_venta'),
    moneda: defaultDe('moneda'),
    split_tarjeta_venta: defaultDe('split_tarjeta_venta'),
    split_tarjeta_propina: defaultDe('split_tarjeta_propina')
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configurations');
      const result = await response.json();
      if (result.success) {
        // Sólo se toman las claves que este tab todavía edita. Las que quedaron guardadas
        // y ya no tienen campo (por ejemplo `facturacion_activada`) no se reenvían al
        // guardar: si volvieran al estado por el spread, cada guardado reescribiría con
        // el valor por defecto de un campo que nadie ve.
        const facturacion = result.data?.[CATEGORIA_FACTURACION ?? 'facturacion'] ?? {};
        const comisiones = result.data?.[CATEGORIA_COMISIONES ?? 'comisiones'];
        setConfig(prev => ({
          impuesto_iva: String(facturacion.impuesto_iva ?? prev.impuesto_iva),
          propina_venta: String(facturacion.propina_venta ?? prev.propina_venta),
          moneda: String(facturacion.moneda ?? prev.moneda),
          // El split vive en la categoría `comisiones`, se edita acá por ser regla de pagos.
          split_tarjeta_venta: String(comisiones?.split_tarjeta_venta ?? prev.split_tarjeta_venta),
          split_tarjeta_propina: String(
            comisiones?.split_tarjeta_propina ?? prev.split_tarjeta_propina
          )
        }));
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsBillingTab:fetch' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    const v = Number(config.split_tarjeta_venta);
    const p = Number(config.split_tarjeta_propina);
    if (!Number.isInteger(v) || !Number.isInteger(p) || v < 0 || p < 0) {
      toast.error('Split tarjeta: deben ser enteros >= 0');
      return;
    }
    if (v + p !== 100) {
      toast.error('Split tarjeta: venta + propina debe sumar 100');
      return;
    }
    try {
      setSaving(true);
      const configs = Object.entries(config).map(([clave, valor]) => ({
        clave,
        valor: String(valor)
      }));
      const response = await fetch('/api/configurations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs })
      });
      const result = await response.json();
      if (result.success) {
        // El IVA y la propina los leen otras pantallas de la caché compartida: sin refrescarla
        // seguirían mostrando el valor anterior hasta recargar la página.
        await refrescarConfiguraciones();
        toast.success('Configuración de facturación guardada');
      } else {
        throw new Error(result.error || 'Error al guardar');
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsBillingTab:save' });
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CollapsibleCard
      defaultOpen
      aria-label='Configuración de Facturación'
      className='rounded-2xl border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
      headerClassName='p-4 sm:px-5 sm:py-4'
      contentClassName='px-4 pb-4 sm:px-5 sm:pb-5'
      title={
        <div className='flex items-center gap-3'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800'>
            <SettingsIcon className='h-4 w-4 text-neutral-700 dark:text-neutral-300' />
          </div>
          <span className='text-base font-semibold leading-tight text-neutral-900 sm:text-lg dark:text-white'>
            Configuración de Facturación
          </span>
        </div>
      }
    >
      {loading ? (
        <div className='text-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto'></div>
          <p aria-live='polite' className='text-sm text-gray-600 mt-2'>
            Cargando configuración...
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='space-y-4'>
            <div>
              <Label htmlFor='billing-iva' className='block text-sm font-medium mb-1'>
                % IVA
              </Label>
              <Input
                id='billing-iva'
                type='number'
                min='0'
                max='100'
                step='0.01'
                value={config.impuesto_iva}
                onChange={e => setConfig(prev => ({ ...prev, impuesto_iva: e.target.value }))}
                className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                placeholder='19'
              />
            </div>
            <div>
              <Label htmlFor='billing-propina' className='block text-sm font-medium mb-1'>
                % Propina de venta (reparto)
              </Label>
              <Input
                id='billing-propina'
                type='number'
                min='0'
                max='100'
                step='0.01'
                value={config.propina_venta}
                onChange={e => setConfig(prev => ({ ...prev, propina_venta: e.target.value }))}
                className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                placeholder='10'
              />
            </div>
            <div>
              <Label htmlFor='billing-moneda' className='block text-sm font-medium mb-1'>
                Moneda
              </Label>
              <Select
                value={config.moneda}
                onValueChange={(value: string) => setConfig(prev => ({ ...prev, moneda: value }))}
              >
                <SelectTrigger id='billing-moneda'>
                  <SelectValue placeholder='Seleccionar moneda' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='CLP'>CLP - Peso Chileno</SelectItem>
                  <SelectItem value='USD'>USD - Dólar</SelectItem>
                  <SelectItem value='EUR'>EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='space-y-4'>
            <div className='p-4 border border-gray-200 rounded-2xl'>
              <p className='text-sm font-medium'>Split pago con tarjeta</p>
              <div className='mt-3 grid grid-cols-2 gap-3'>
                <div>
                  <Label htmlFor='billing-split-venta' className='block text-xs font-medium mb-1'>
                    Venta %
                  </Label>
                  <Input
                    id='billing-split-venta'
                    type='number'
                    min='0'
                    max='100'
                    value={config.split_tarjeta_venta ?? '51'}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, split_tarjeta_venta: e.target.value }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  />
                </div>
                <div>
                  <Label htmlFor='billing-split-propina' className='block text-xs font-medium mb-1'>
                    Propina %
                  </Label>
                  <Input
                    id='billing-split-propina'
                    type='number'
                    min='0'
                    max='100'
                    value={config.split_tarjeta_propina ?? '49'}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, split_tarjeta_propina: e.target.value }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className='mt-6 flex justify-center'>
        <Button
          variant='unstyled'
          onClick={handleSave}
          disabled={saving}
          className='rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50'
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </CollapsibleCard>
  );
}
