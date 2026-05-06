'use client';

import { Save, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BillingConfig, SetBillingConfig } from './settings-types';

interface SettingsBillingTabProps {
  configLoading: boolean;
  billingConfig: BillingConfig;
  setBillingConfig: SetBillingConfig;
  isSavingConfig: boolean;
  onSave: () => void;
}

export function SettingsBillingTab({
  configLoading,
  billingConfig,
  setBillingConfig,
  isSavingConfig,
  onSave
}: SettingsBillingTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <SettingsIcon className='h-5 w-5' />
          Configuración de Facturación
        </CardTitle>
      </CardHeader>
      <CardContent>
        {configLoading ? (
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
                  value={billingConfig.impuesto_iva}
                  onChange={e =>
                    setBillingConfig(prev => ({ ...prev, impuesto_iva: e.target.value }))
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='19'
                />
              </div>
              <div>
                <label className='block text-sm font-medium mb-1'>% Propina por defecto</label>
                <input
                  type='number'
                  value={billingConfig.impuesto_propina}
                  onChange={e =>
                    setBillingConfig(prev => ({ ...prev, impuesto_propina: e.target.value }))
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='10'
                />
              </div>
              <div>
                <label className='block text-sm font-medium mb-1'>Moneda</label>
                <Select
                  value={billingConfig.moneda}
                  onValueChange={(value: string) => setBillingConfig(prev => ({ ...prev, moneda: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Seleccionar moneda' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='CLP'>CLP - Peso Chileno</SelectItem>
                    <SelectItem value='USD'>USD - D?lar</SelectItem>
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
                  value={billingConfig.resolucion_sii}
                  onChange={e =>
                    setBillingConfig(prev => ({ ...prev, resolucion_sii: e.target.value }))
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='Resolución SII'
                />
              </div>
              <div className='flex items-center gap-3 p-4 border border-gray-200 rounded-full'>
                <input
                  type='checkbox'
                  id='facturacion_activada'
                  checked={billingConfig.facturacion_activada}
                  onChange={e =>
                    setBillingConfig(prev => ({
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
            onClick={onSave}
            disabled={isSavingConfig}
            className='flex items-center gap-2 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50'
          >
            <Save className='h-4 w-4' />
            {isSavingConfig ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
