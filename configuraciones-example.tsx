
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { toast } from 'sonner';

export default function Configuraciones() {
  const [isLoading, setIsLoading] = useState(false);
  const [configuraciones, setConfiguraciones] = useState([]);
  const [error, setError] = useState(null);

  const fetchConfiguraciones = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener configuraciones');
      }

      setConfiguraciones(data.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al cargar configuraciones';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSaveConfiguracion = useCallback(async (configData) => {
    try {
      setError(null);

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar configuración');
      }

      toast.success('Configuración guardada exitosamente');
      fetchConfiguraciones();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar configuración';
      toast.error(message);
    }
  }, [fetchConfiguraciones]);

  if (isLoading) return <div>Cargando configuraciones...</div>;
  if (error) return <div>Error al cargar las configuraciones: {error}</div>;

  return (
    <PermissionGuard module="configuraciones" action="listar">
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
          <div className='flex flex-col'>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Configuraciones</h1>
            <p className='text-sm sm:text-base text-gray-600'>Gestiona todas las configuraciones del sistema.</p>
          </div>
          <div className='flex flex-col sm:flex-row gap-2 items-stretch sm:items-center'>
            <Button
              onClick={fetchConfiguraciones}
              size='sm'
              variant='outline'
              className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
            >
              Actualizar
            </Button>
          </div>
        </div>

        <div className='mt-4 sm:mt-6'>
          <div className='bg-white rounded-lg shadow'>
            <div className='p-6'>
              <h2 className='text-lg font-semibold mb-4'>Configuraciones del Sistema</h2>
              
              <div className='space-y-6'>
                <div className='border-b pb-4'>
                  <h3 className='text-md font-medium mb-2'>Información General</h3>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Nombre del Negocio</label>
                      <input
                        type='text'
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        placeholder='Nombre del negocio'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Email de Contacto</label>
                      <input
                        type='email'
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        placeholder='email@ejemplo.com'
                      />
                    </div>
                  </div>
                </div>

                <div className='border-b pb-4'>
                  <h3 className='text-md font-medium mb-2'>Configuración de Pagos</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='flex items-center space-x-2'>
                        <input type='checkbox' className='rounded' />
                        <span className='text-sm'>Habilitar pagos con tarjeta</span>
                      </label>
                    </div>
                    <div>
                      <label className='flex items-center space-x-2'>
                        <input type='checkbox' className='rounded' />
                        <span className='text-sm'>Habilitar pagos con transferencia</span>
                      </label>
                    </div>
                    <div>
                      <label className='flex items-center space-x-2'>
                        <input type='checkbox' className='rounded' />
                        <span className='text-sm'>Habilitar pagos con efectivo</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className='border-b pb-4'>
                  <h3 className='text-md font-medium mb-2'>Notificaciones</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='flex items-center space-x-2'>
                        <input type='checkbox' className='rounded' />
                        <span className='text-sm'>Notificaciones por email</span>
                      </label>
                    </div>
                    <div>
                      <label className='flex items-center space-x-2'>
                        <input type='checkbox' className='rounded' />
                        <span className='text-sm'>Notificaciones SMS</span>
                      </label>
                    </div>
                    <div>
                      <label className='flex items-center space-x-2'>
                        <input type='checkbox' className='rounded' />
                        <span className='text-sm'>Notificaciones push</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className='pb-4'>
                  <h3 className='text-md font-medium mb-2'>Configuración de Impuestos</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>IVA (%)</label>
                      <input
                        type='number'
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        placeholder='19'
                        min='0'
                        max='100'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Retención (%)</label>
                      <input
                        type='number'
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        placeholder='10'
                        min='0'
                        max='100'
                      />
                    </div>
                  </div>
                </div>

                <div className='pt-4'>
                  <Button
                    onClick={() => handleSaveConfiguracion({})}
                    size='lg'
                    className='w-full bg-black text-white rounded-full hover:scale-105 transition-all duration-200'
                  >
                    Guardar Configuraciones
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-red-600'>{error}</p>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
