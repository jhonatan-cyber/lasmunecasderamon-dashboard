'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface CodigoVerificacionHeaderProps {
  userRole?: string;
}

export function CodigoVerificacionHeader({ userRole }: CodigoVerificacionHeaderProps) {
  const [codigo, setCodigo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const fetchCodigo = async (showToast = false) => {
    setLoading(true);
    try {
      const res = await fetch('/api/codigo/actual', {
        headers: {
          'x-user-role': userRole || ''
        }
      });
      const data = await res.json();

      if (data.success) {
        setCodigo(data.codigo);
        if (showToast) {
          toast.success('Código actualizado');
        }
      } else {
        if (showToast) {
          toast.error(data.message || 'Error al obtener el código');
        }
      }
    } catch (error) {
      if (showToast) {
        toast.error('Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualUpdate = () => {
    fetchCodigo(true);
  };

  useEffect(() => {
    // Solo ejecutar si es administrador
    if (userRole && userRole.toLowerCase() === 'administrador') {
      fetchCodigo();

      // Configurar intervalo para actualizar cada 60 segundos
      const interval = setInterval(() => {
        fetchCodigo();
      }, 60000); // 60 segundos

      // Limpiar intervalo cuando el componente se desmonte o cambie el rol
      return () => clearInterval(interval);
    }
  }, [userRole]);

  // Solo mostrar para administradores
  if (!userRole || userRole.toLowerCase() !== 'administrador') {
    return null;
  }

  return (
    <div className='flex items-center gap-2'>
      <div className='flex items-center gap-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full px-3 py-1'>
        <span className='text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest mr-1'>
          Código:
        </span>
        <span className='text-sm font-mono font-bold tracking-wider text-gray-900 dark:text-gray-100'>
          {codigo || '****'}
        </span>
      </div>
      <Button
        onClick={handleManualUpdate}
        variant='ghost'
        size='icon'
        disabled={loading}
        className='h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800'
        title='Actualizar código'
      >
        <RotateCcw className={`${loading ? 'animate-spin' : ''} w-4 h-4 text-gray-500`} />
      </Button>
    </div>
  );
}
