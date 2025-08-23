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
    <div className='bg-white border-b border-gray-200 px-4 sm:px-6 py-3'>
      <div className='max-w-7xl mx-auto flex items-center justify-center gap-2 sm:gap-4'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium text-gray-700 hidden sm:inline'>Código :</span>
        </div>

        <div className='flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2'>
          <span className='text-lg sm:text-xl font-mono font-bold tracking-wider'>
            {codigo || '****'}
          </span>
        </div>

        <div className='flex gap-2'>
          <Button
            onClick={handleManualUpdate}
            variant='outline'
            size='sm'
            disabled={loading}
            className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
          >
            <RotateCcw className={`${loading ? 'animate-spin' : ''} w-3 h-3 sm:w-4 sm:h-4`} />
            <span className='hidden sm:inline ml-1'>Actualizar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
