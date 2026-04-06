'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';
import { useAnfitrionas } from '@/hooks/personal/useAnfitrionas';
import { useTimer } from '@/contexts/TimerContext';

interface ServiceRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: any | null;
  onProcessed: () => void;
}

export function ServiceRequestModal({
  open,
  onOpenChange,
  solicitud,
  onProcessed,
}: ServiceRequestModalProps) {
  const { anfitrionas } = useAnfitrionas(false);
  const { startTimer } = useTimer();

  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [isRoomAvailable, setIsRoomAvailable] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('');

  // Cargar disponibilidad de habitaciones al abrir el modal
  const loadRoomAvailability = useCallback(async (sol: any) => {
    try {
      const response = await fetch('/api/rooms?status=1');
      const data = await response.json();
      if (data.success) {
        const rooms = data.data || [];
        setAvailableRooms(rooms);
        const currentRoomId = sol?.habitacion_id;
        const currentIsAvailable = rooms.some(
          (r: any) => (r.id_habitacion || r.id) === currentRoomId
        );
        setIsRoomAvailable(currentIsAvailable);
        setSelectedRoomId(currentIsAvailable ? currentRoomId : '');
      } else {
        setAvailableRooms([]);
        setIsRoomAvailable(true);
        setSelectedRoomId(sol?.habitacion_id || '');
      }
    } catch {
      setAvailableRooms([]);
      setIsRoomAvailable(true);
      setSelectedRoomId(sol?.habitacion_id || '');
    }
  }, []);

  useEffect(() => {
    if (open && solicitud) {
      setRejectReason('');
      loadRoomAvailability(solicitud);
    }
  }, [open, solicitud, loadRoomAvailability]);

  const getAnfitrionasNicks = (ids: any): string => {
    let finalIds = ids;

    if (typeof ids === 'string') {
      try {
        finalIds = JSON.parse(ids);
      } catch {
        finalIds = ids.split(',').map((id: string) => parseInt(id.trim())).filter(Boolean);
      }
    }

    if (!finalIds || !Array.isArray(finalIds) || finalIds.length === 0) return 'N/A';

    const nickMap = new Map<number, string>();
    anfitrionas.forEach((a: any) => {
      const id = a.id_usuario || a.id;
      if (id) {
        nickMap.set(Number(id), a.nick || a.nombre || a.name || `#${id}`);
      }
    });

    const nicks = finalIds.map((id: number) => nickMap.get(Number(id)) || `#${id}`);
    return nicks.length > 0 ? nicks.join(', ') : 'N/A';
  };

  const calculateIVA = (sol: any): number => {
    let anfitrionasIds = sol.anfitrionas_ids;

    if (typeof anfitrionasIds === 'string') {
      try {
        anfitrionasIds = JSON.parse(anfitrionasIds);
      } catch {
        anfitrionasIds = [];
      }
    }

    const metodoPago = (sol?.metodo_pago || '').toString().toLowerCase();
    if (metodoPago !== 'tarjeta') return 0;

    const numAnfitrionas = Array.isArray(anfitrionasIds) ? anfitrionasIds.length : 0;
    const tiempo = Number(sol.tiempo || 0);
    const multiplicador = tiempo === 60 ? 2 : 1;
    const precioServicio = (sol.precio_servicio || 0) * multiplicador;
    const precioHabitacion = (sol.precio_habitacion || 0) * multiplicador;

    const nuevoSubTotal = precioServicio * numAnfitrionas;
    const precioHabitacionTotal = precioHabitacion * numAnfitrionas;
    let nuevoIVA = Math.floor(nuevoSubTotal * 0.2);
    const nuevoTotal = nuevoSubTotal + precioHabitacionTotal + nuevoIVA;
    const totalRedondeado = Math.ceil(nuevoTotal / 5000) * 5000;
    const excedente = totalRedondeado - nuevoTotal;
    nuevoIVA = nuevoIVA + excedente;

    return nuevoIVA;
  };

  const handleApprove = async () => {
    if (!solicitud) return;
    if (!isRoomAvailable && !selectedRoomId) {
      showErrorToast('Selecciona una habitación disponible');
      return;
    }
    setProcessing(true);
    try {
      const habitacionIdFinal =
        (isRoomAvailable ? solicitud.habitacion_id : selectedRoomId) ||
        solicitud.habitacion_id;

      const url = `/api/solicitudes-servicios/${solicitud.id_solicitud}/aprobar`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitacion_id: habitacionIdFinal })
      });
      const data = await response.json();

      if (data.success && data.data) {
        const {
          servicio_id,
          codigo,
          habitacion_nombre,
          cliente_nombre,
          anfitrionas: anfs,
          tiempo
        } = data.data;

        const habitacionId = habitacionIdFinal || solicitud.habitacion_id;
        const solicitante =
          solicitud.solicitado_por_nombre ||
          solicitud.solicitado_por_nick ||
          undefined;

        if (servicio_id && habitacionId && tiempo > 0) {
          startTimer(
            servicio_id,
            habitacionId,
            habitacion_nombre,
            tiempo,
            codigo,
            cliente_nombre,
            anfs,
            'servicio',
            solicitante
          );
        }

        showSuccessToast('Solicitud aprobada exitosamente');
        onOpenChange(false);
        onProcessed();
      } else {
        showErrorToast(data.message || 'Error al aprobar solicitud');
      }
    } catch {
      showErrorToast('Error al aprobar solicitud');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!solicitud) return;
    if (!rejectReason.trim()) {
      showErrorToast('El motivo de rechazo es requerido');
      return;
    }

    setProcessing(true);
    try {
      const url = `/api/solicitudes-servicios/${solicitud.id_solicitud}/rechazar`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo_rechazo: rejectReason })
      });
      const data = await response.json();
      if (data.success) {
        showSuccessToast('Solicitud rechazada exitosamente');
        onOpenChange(false);
        onProcessed();
      } else {
        showErrorToast(data.message || 'Error al rechazar solicitud');
      }
    } catch {
      showErrorToast('Error al rechazar solicitud');
    } finally {
      setProcessing(false);
    }
  };

  if (!solicitud) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            Solicitud de Servicio #{solicitud.id_solicitud}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-3 text-sm'>
          <div>
            <span className='font-medium'>Anfitrionas:</span>{' '}
            {getAnfitrionasNicks(solicitud.anfitrionas_ids)}
          </div>
          <div>
            <span className='font-medium'>Habitación:</span>{' '}
            {solicitud.habitacion_nombre || solicitud.habitacion_id}
          </div>
          {!isRoomAvailable && (
            <div className='space-y-2'>
              <div className='text-sm text-red-600'>
                La habitación está ocupada. Selecciona una disponible:
              </div>
              <Select
                value={selectedRoomId ? String(selectedRoomId) : ''}
                onValueChange={value => setSelectedRoomId(value ? Number(value) : '')}
              >
                <SelectTrigger className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full'>
                  <SelectValue placeholder='Seleccionar habitación' />
                </SelectTrigger>
                <SelectContent className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700'>
                  {availableRooms.map((room: any) => (
                    <SelectItem
                      key={room.id_habitacion || room.id}
                      value={String(room.id_habitacion || room.id)}
                      className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    >
                      {room.nombre || room.name} - $
                      {formatCurrencyCLP(room.precio || room.price || 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <span className='font-medium'>Tiempo:</span> {solicitud.tiempo} min
          </div>
          <div>
            <span className='font-medium'>Total:</span> $
            {formatCurrencyCLP(solicitud.total)}
          </div>
          <div>
            <span className='font-medium'>Garzón:</span>{' '}
            {solicitud.solicitado_por_nombre ||
              solicitud.solicitado_por_nick ||
              'N/A'}
          </div>
          <div>
            <span className='font-medium'>Método de pago:</span>{' '}
            {solicitud.metodo_pago}
          </div>
          <div>
            <span className='font-medium'>IVA:</span> $
            {formatCurrencyCLP(calculateIVA(solicitud))}
          </div>
        </div>

        <div className='mt-4 space-y-2'>
          <Label>Motivo de rechazo</Label>
          <Textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder='Escribe el motivo si vas a rechazar'
            rows={3}
          />
        </div>

        <div className='mt-4 flex justify-center gap-2'>
          <Button
            className='bg-red-600 hover:bg-red-700 rounded-full'
            onClick={handleReject}
            disabled={processing}
          >
            Rechazar
          </Button>
          <Button
            className='bg-green-600 hover:bg-green-700 rounded-full'
            onClick={handleApprove}
            disabled={processing}
          >
            Aprobar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
