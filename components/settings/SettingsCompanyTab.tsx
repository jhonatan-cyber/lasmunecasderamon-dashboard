'use client';

import { Building2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompanyConfig, SetCompanyConfig } from './settings-types';

interface SettingsCompanyTabProps {
  configLoading: boolean;
  companyConfig: CompanyConfig;
  setCompanyConfig: SetCompanyConfig;
  isSavingConfig: boolean;
  onSave: () => void;
}

export function SettingsCompanyTab({
  configLoading,
  companyConfig,
  setCompanyConfig,
  isSavingConfig,
  onSave
}: SettingsCompanyTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Building2 className='h-5 w-5' />
          Información de la Empresa
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
                <label className='block text-sm font-medium mb-1'>Nombre de la Empresa</label>
                <input
                  type='text'
                  value={companyConfig.empresa_nombre}
                  onChange={e =>
                    setCompanyConfig(prev => ({ ...prev, empresa_nombre: e.target.value }))
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='Las Muñecas de Ramón'
                />
              </div>
              <div>
                <label className='block text-sm font-medium mb-1'>RUT</label>
                <input
                  type='text'
                  value={companyConfig.empresa_rut}
                  onChange={e =>
                    setCompanyConfig(prev => ({ ...prev, empresa_rut: e.target.value }))
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='12.345.678-9'
                />
              </div>
              <div>
                <label className='block text-sm font-medium mb-1'>Dirección</label>
                <input
                  type='text'
                  value={companyConfig.empresa_direccion}
                  onChange={e =>
                    setCompanyConfig(prev => ({ ...prev, empresa_direccion: e.target.value }))
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='Dirección de la empresa'
                />
              </div>
            </div>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-1'>Teléfono</label>
                <input
                  type='text'
                  value={companyConfig.empresa_telefono}
                  onChange={e =>
                    setCompanyConfig(prev => ({ ...prev, empresa_telefono: e.target.value }))
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='+56 9 1234 5678'
                />
              </div>
              <div>
                <label className='block text-sm font-medium mb-1'>Email</label>
                <input
                  type='email'
                  value={companyConfig.empresa_email}
                  onChange={e =>
                    setCompanyConfig(prev => ({ ...prev, empresa_email: e.target.value }))
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='contacto@empresa.cl'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium mb-1'>WhatsApp</label>
                  <input
                    type='text'
                    value={companyConfig.empresa_whatsapp}
                    onChange={e =>
                      setCompanyConfig(prev => ({ ...prev, empresa_whatsapp: e.target.value }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                    placeholder='+56 9 1234 5678'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1'>Instagram</label>
                  <input
                    type='text'
                    value={companyConfig.empresa_instagram}
                    onChange={e =>
                      setCompanyConfig(prev => ({ ...prev, empresa_instagram: e.target.value }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                    placeholder='@instagram'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1'>Facebook</label>
                  <input
                    type='text'
                    value={companyConfig.empresa_facebook}
                    onChange={e =>
                      setCompanyConfig(prev => ({ ...prev, empresa_facebook: e.target.value }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                    placeholder='@facebook'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1'>TikTok</label>
                  <input
                    type='text'
                    value={companyConfig.empresa_tiktok || ''}
                    onChange={e =>
                      setCompanyConfig(prev => ({ ...prev, empresa_tiktok: e.target.value }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                    placeholder='@tiktok'
                  />
                </div>
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
