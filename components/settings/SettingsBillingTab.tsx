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
    impuesto_propina: '10',
    moneda: 'CLP',
    facturacion_activada: true,
    resolucion_sii: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configurations');
      const result = await response.json();
      if (result.success && result.data?.facturacion) {
        setConfig(prev => ({ ...prev, ...result.data.facturacion }));
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
            <p className='text-sm text-gray-600 mt-2'>Cargando configuración...</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-1'>% IVA</label>
                <input
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
                <label className='block text-sm font-medium mb-1'>% Propina por defecto</label>
                <input
                  type='number'
                  min='0'
                  max='100'
                  step='0.01'
                  value={config.impuesto_propina}
                  onChange={e => setConfig(prev => ({ ...prev, impuesto_propina: e.target.value }))}
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='10'
                />
              </div>
              <div>
                <label className='block text-sm font-medium mb-1'>Moneda</label>
                <Select
                  value={config.moneda}
                  onValueChange={(value: string) => setConfig(prev => ({ ...prev, moneda: value }))}
                >
                  <SelectTrigger>
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
                <label className='block text-sm font-medium mb-1'>Resolución SII</label>
                <input
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
