'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function SettingsBillingTab() {
  const [config, setConfig] = useState<BillingConfig>({
    impuesto_iva: '19',
    propina_venta: '10',
    moneda: 'CLP',
    facturacion_activada: true,
    resolucion_sii: '',
    split_tarjeta_venta: '51',
    split_tarjeta_propina: '49'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configurations');
      const result = await response.json();
      if (result.success) {
        setConfig(prev => ({
          ...prev,
          ...result.data?.facturacion,
          // Split vive en categoría `comisiones`, se edita acá por ser regla de pagos.
          ...(result.data?.comisiones
            ? {
                split_tarjeta_venta: String(
                  result.data.comisiones.split_tarjeta_venta ?? prev.split_tarjeta_venta
                ),
                split_tarjeta_propina: String(
                  result.data.comisiones.split_tarjeta_propina ?? prev.split_tarjeta_propina
                )
              }
            : {})
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
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <SettingsIcon className='h-5 w-5' />
          Configuración de Facturación
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                <label htmlFor='billing-iva' className='block text-sm font-medium mb-1'>
                  % IVA
                </label>
                <input
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
                <label htmlFor='billing-propina' className='block text-sm font-medium mb-1'>
                  % Propina de venta (reparto)
                </label>
                <input
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
                <p className='text-xs text-gray-500 mt-1'>
                  Porcentaje de las ventas que se distribuye entre cajeros, garzones y barman
                  activos con sesi?n iniciada o presentes en el local del local.
                </p>
              </div>
              <div>
                <label htmlFor='billing-moneda' className='block text-sm font-medium mb-1'>
                  Moneda
                </label>
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
              <div>
                <label htmlFor='billing-resolucion' className='block text-sm font-medium mb-1'>
                  Resolución SII
                </label>
                <input
                  id='billing-resolucion'
                  type='text'
                  value={config.resolucion_sii}
                  onChange={e => setConfig(prev => ({ ...prev, resolucion_sii: e.target.value }))}
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='Resolución SII'
                />
              </div>
              <div className='flex items-center gap-3 p-4 border border-gray-200 rounded-full'>
                <input
                  type='checkbox'
                  id='facturacion_activada'
                  checked={config.facturacion_activada}
                  onChange={e =>
                    setConfig(prev => ({
                      ...prev,
                      facturacion_activada: e.target.checked
                    }))
                  }
                  className='w-5 h-5 rounded border-gray-300 text-black focus:ring-black'
                />
                <label htmlFor='facturacion_activada' className='text-sm font-medium'>
                  Activar facturación electrónica
                </label>
              </div>
              <div className='p-4 border border-gray-200 rounded-3xl'>
                <p className='text-sm font-medium'>Split pago con tarjeta</p>
                <p className='text-xs text-gray-500 mt-0.5'>
                  Cómo se divide un pago con tarjeta entre venta y propina. Debe sumar 100.
                </p>
                <div className='mt-3 grid grid-cols-2 gap-3'>
                  <div>
                    <label htmlFor='billing-split-venta' className='block text-xs font-medium mb-1'>
                      Venta %
                    </label>
                    <input
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
                    <label
                      htmlFor='billing-split-propina'
                      className='block text-xs font-medium mb-1'
                    >
                      Propina %
                    </label>
                    <input
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

        <div className='mt-6 flex justify-end'>
          <button
            onClick={handleSave}
            disabled={saving}
            className='flex items-center gap-2 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50'
          >
            <Save className='h-4 w-4' />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
