'use client';

import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGratificaciones } from '@/hooks/personal/useGratificaciones';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import { User, Calendar, DollarSign, FileText } from 'lucide-react';

interface GratificacionesDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
}

export default function GratificacionesDetailModal({
  isOpen,
  onClose,
  userId,
  userName
}: GratificacionesDetailModalProps) {
  const { getGratificacionesDetails, detailsLoading, gratificacionesDetails } = useGratificaciones();

  useEffect(() => {
    if (isOpen && userId) {
      getGratificacionesDetails(userId);
    }
  }, [isOpen, userId, getGratificacionesDetails]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalMonto = gratificacionesDetails.reduce((acc, g) => acc + g.monto, 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[600px] max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-center text-lg sm:text-xl lg:text-2xl font-semibold'>
            Detalle de Gratificaciones
          </DialogTitle>
          <p className='text-center text-sm text-gray-500'>{userName}</p>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          {detailsLoading ? (
            <div className='space-y-3'>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className='h-20 w-full' />
              ))}
            </div>
          ) : gratificacionesDetails.length === 0 ? (
            <div className='text-center py-8 text-gray-500'>
              No hay gratificaciones para este usuario
            </div>
          ) : (
            <div className='space-y-3'>
              {gratificacionesDetails.map((detail, index) => (
                <Card key={index} className='shadow-sm'>
                  <CardContent className='p-4'>
                    <div className='flex flex-col gap-2'>
                      <div className='flex items-center gap-2'>
                        <Calendar className='h-4 w-4 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          {formatDateTime(detail.fecha_crea)}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <DollarSign className='h-4 w-4 text-green-500' />
                        <span className='text-sm font-semibold text-green-600'>
                          {formatCurrencyNoDecimals(detail.monto)}
                        </span>
                      </div>
                      {detail.descripcion && (
                        <div className='flex items-start gap-2 pt-2 border-t border-gray-100'>
                          <FileText className='h-4 w-4 text-gray-400 mt-0.5' />
                          <span className='text-sm text-gray-600'>{detail.descripcion}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {!detailsLoading && gratificacionesDetails.length > 0 && (
          <div className='flex-shrink-0 border-t px-6 py-4 bg-gray-50'>
            <div className='flex justify-between items-center'>
              <span className='font-semibold text-sm sm:text-base'>Total:</span>
              <span className='font-bold text-lg text-green-600'>
                {formatCurrencyNoDecimals(totalMonto)}
              </span>
            </div>
          </div>
        )}

        <div className='flex-shrink-0 border-t px-6 py-4'>
          <div className='flex justify-center'>
            <button
              onClick={onClose}
              className='px-6 py-2 rounded-full border border-gray-300 text-sm hover:bg-gray-100 transition-colors'
            >
              Cerrar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
