"use client";

import React from 'react';
import { useTimer } from '@/contexts/TimerContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Square } from 'lucide-react';

export const TimerDisplay: React.FC = () => {
  const { timers, stopTimer, formatTime } = useTimer();



  const handleStopTimer = async (timerId: string, roomName: string, servicioCode: string, clienteNombre: string) => {
    try {
      const Swal = (await import('sweetalert2')).default;
      const result = await Swal.fire({
        title: '¿Finalizar Servicio?',
        html: `
          <div class="text-left">
            <p><strong>Servicio:</strong> ${servicioCode}</p>
            <p><strong>Habitación:</strong> ${roomName}</p>
            <p><strong>Cliente:</strong> ${clienteNombre}</p>
            <p class="mt-3 text-orange-600"><strong>¿Estás seguro de que quieres finalizar este servicio?</strong></p>
          </div>
        `,
        icon: 'question',
        confirmButtonText: 'Sí, Finalizar',
        confirmButtonColor: '#dc2626',
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#6b7280',
        showCancelButton: true,
        allowOutsideClick: false,
        customClass: {
          popup: 'swal2-custom-popup',
          title: 'swal2-custom-title',
          htmlContainer: 'swal2-custom-html',
          confirmButton: 'swal2-confirm-sm-outline',
          cancelButton: 'swal2-cancel-sm-outline'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          stopTimer(timerId, true); // Indicar que es una parada manual
        }
      });
      
      if (result.isConfirmed) {
        stopTimer(timerId, true); // Indicar que es una parada manual
      }
    } catch (error) {
      console.error('Error al cargar SweetAlert2:', error);
      // Fallback si SweetAlert2 no está disponible
      if (confirm(`¿Estás seguro de que quieres finalizar el servicio ${servicioCode} de la habitación ${roomName}?`)) {
        stopTimer(timerId, true); // Indicar que es una parada manual
      }
    }
  };

  if (timers.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-1">
      {timers.map((timer) => (
        <Card key={timer.id} className="w-40 bg-white shadow-lg border-l-4 border-orange-500">
          <CardHeader className="pb-0 pt-1">
            <CardTitle className="text-xs flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="text-orange-500 text-xs" />
                <span className="truncate text-xs">{timer.roomName}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => await handleStopTimer(timer.id, timer.roomName, timer.servicioCode, timer.clienteNombre)}
                className="h-3 px-1 text-xs"
              >
                <Square className="text-red-500 text-xs" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-1">
            <div className="text-center">
              <div className="text-xs font-bold text-orange-600">
                {formatTime(timer.remainingTime)}
              </div>
              <div className="text-xs text-gray-500 mt-0">
                Tiempo restante
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};