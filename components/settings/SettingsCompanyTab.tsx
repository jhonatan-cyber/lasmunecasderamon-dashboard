'use client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { CompanyConfig } from './settings-types';
import logger from '@/lib/utils/logger';
import { Label } from '@/components/ui/label';

export function SettingsCompanyTab() {
  const [config, setConfig] = useState<CompanyConfig>({
    empresa_nombre: '',
    empresa_rut: '',
    empresa_direccion: '',
    empresa_telefono: '',
    empresa_email: '',
    empresa_facebook: '',
    empresa_instagram: '',
    empresa_whatsapp: '',
    empresa_tiktok: ''
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
          ...result.data?.empresa
        }));
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsCompanyTab:fetch' });
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
        valor: valor || ''
      }));
      const response = await fetch('/api/configurations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Configuración de empresa guardada');
      } else {
        throw new Error(result.error || 'Error al guardar');
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsCompanyTab:save' });
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Building2 className='h-5 w-5' />
          Información de la Empresa
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
                <Label htmlFor='company-name' className='block text-sm font-medium mb-1'>
                  Nombre de la Empresa
                </Label>
                <Input
                  id='company-name'
                  type='text'
                  value={config.empresa_nombre}
                  onChange={e => setConfig(prev => ({ ...prev, empresa_nombre: e.target.value }))}
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='Las Muñecas de Ramón'
                />
              </div>
              <div>
                <Label htmlFor='company-rut' className='block text-sm font-medium mb-1'>
                  RUT
                </Label>
                <Input
                  id='company-rut'
                  type='text'
                  value={config.empresa_rut}
                  onChange={e => setConfig(prev => ({ ...prev, empresa_rut: e.target.value }))}
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='12.345.678-9'
                />
              </div>
              <div>
                <Label htmlFor='company-address' className='block text-sm font-medium mb-1'>
                  Dirección
                </Label>
                <Input
                  id='company-address'
                  type='text'
                  value={config.empresa_direccion}
                  onChange={e =>
                    setConfig(prev => ({ ...prev, empresa_direccion: e.target.value }))
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='Dirección de la empresa'
                />
              </div>
            </div>
            <div className='space-y-4'>
              <div>
                <Label htmlFor='company-phone' className='block text-sm font-medium mb-1'>
                  Teléfono
                </Label>
                <Input
                  id='company-phone'
                  type='text'
                  value={config.empresa_telefono}
                  onChange={e => setConfig(prev => ({ ...prev, empresa_telefono: e.target.value }))}
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='+56 9 1234 5678'
                />
              </div>
              <div>
                <Label htmlFor='company-email' className='block text-sm font-medium mb-1'>
                  Email
                </Label>
                <Input
                  id='company-email'
                  type='email'
                  value={config.empresa_email}
                  onChange={e => setConfig(prev => ({ ...prev, empresa_email: e.target.value }))}
                  className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                  placeholder='contacto@empresa.cl'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='company-whatsapp' className='block text-sm font-medium mb-1'>
                    WhatsApp público
                  </Label>
                  <Input
                    id='company-whatsapp'
                    type='text'
                    value={config.empresa_whatsapp}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, empresa_whatsapp: e.target.value }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                    placeholder='+56 9 1234 5678'
                  />
                </div>
                <div>
                  <Label htmlFor='company-instagram' className='block text-sm font-medium mb-1'>
                    Instagram
                  </Label>
                  <Input
                    id='company-instagram'
                    type='text'
                    value={config.empresa_instagram}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, empresa_instagram: e.target.value }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                    placeholder='@instagram'
                  />
                </div>
                <div>
                  <Label htmlFor='company-facebook' className='block text-sm font-medium mb-1'>
                    Facebook
                  </Label>
                  <Input
                    id='company-facebook'
                    type='text'
                    value={config.empresa_facebook}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, empresa_facebook: e.target.value }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                    placeholder='@facebook'
                  />
                </div>
                <div>
                  <Label htmlFor='company-tiktok' className='block text-sm font-medium mb-1'>
                    TikTok
                  </Label>
                  <Input
                    id='company-tiktok'
                    type='text'
                    value={config.empresa_tiktok || ''}
                    onChange={e => setConfig(prev => ({ ...prev, empresa_tiktok: e.target.value }))}
                    className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                    placeholder='@tiktok'
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className='mt-6 flex justify-end'>
          <Button
            variant='unstyled'
            onClick={handleSave}
            disabled={saving}
            className='flex items-center gap-2 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50'
          >
            <Save className='h-4 w-4' />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
