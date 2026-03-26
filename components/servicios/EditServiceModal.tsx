'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ServicioWithDetails } from '@/types/servicio';
import { Clock } from 'lucide-react';
import { useEditServiceForm } from '@/hooks/personal/useEditServiceForm';
import { ServiceFormFields } from './ServiceFormFields';
import { ServicePriceSummary } from './ServicePriceSummary';

interface EditServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio: ServicioWithDetails | null;
  onUpdate?: () => void;
  onPauseMainTimer?: () => void;
  onResumeMainTimer?: () => void;
  onTemporaryTimerComplete?: (nuevasAnfitrionas: string) => void;
}

export default function EditServiceModal({
  open,
  onOpenChange,
  servicio,
  onUpdate,
  onPauseMainTimer,
  onResumeMainTimer,
  onTemporaryTimerComplete
}: EditServiceModalProps) {
  const {
    formData,
    isSaving,
    anfitrionasDisponibles,
    anfitrionasDelServicio,
    loadingAnfitrionas,
    precioServicioDisplay,
    precioHabitacionDisplay,
    precioHabitacionSinComision,
    numAnfitrionasSeleccionadas,
    pricing,
    handlePrecioServicioChange,
    handleMetodoPagoChange,
    handleTiempoChange,
    handleUsuariosChange,
    handleClose,
    handleSave,
    numAnfitrionasOriginal
  } = useEditServiceForm({
    open,
    servicio,
    onOpenChange,
    onUpdate,
    onPauseMainTimer,
    onResumeMainTimer,
    onTemporaryTimerComplete
  });

  const { precioServicioTotal, precioHabitacionTotal, iva, subTotal, total, multiplicadorTiempo } = pricing;

  if (!servicio) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>Crear Nuevo Servicio + Timer</span>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Clock className="w-4 h-4" />
              <span>Timer principal pausado</span>
            </div>
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Habitación {servicio.habitacion_numero} - Código #{servicio.codigo}
          </p>
          {numAnfitrionasOriginal > 1 && (
            <p className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
              {numAnfitrionasOriginal} anfitrionas - Los precios se multiplicarán automáticamente
            </p>
          )}

        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-4">
            <ServiceFormFields
              anfitrionasDisponibles={anfitrionasDisponibles}
              selectedUsuarios={formData.usuarios}
              onUsuariosChange={handleUsuariosChange}
              anfitrionasDelServicio={anfitrionasDelServicio}
              loadingAnfitrionas={loadingAnfitrionas}
              precioServicioDisplay={precioServicioDisplay}
              onPrecioServicioChange={handlePrecioServicioChange}
              onPrecioServicioFocus={() => { }}
              onPrecioServicioBlur={() => { }}
              precioServicioTotal={precioServicioTotal}
              numAnfitrionas={numAnfitrionasSeleccionadas}
              multiplicadorTiempo={multiplicadorTiempo}
              precioHabitacionDisplay={precioHabitacionDisplay}
              precioHabitacionSinComision={precioHabitacionSinComision}
              precioHabitacionTotal={precioHabitacionTotal}
              metodoPago={formData.metodo_pago}
              onMetodoPagoChange={handleMetodoPagoChange}
              precioServicioTotalForIVA={precioServicioTotal}
              iva={iva}
              tiempo={formData.tiempo}
              onTiempoChange={handleTiempoChange}
              isSaving={isSaving}
            />

            <ServicePriceSummary
              subTotal={subTotal}
              precioHabitacionTotal={precioHabitacionTotal}
              iva={iva}
              total={total}
              precioServicioTotal={precioServicioTotal}
              numAnfitrionas={numAnfitrionasSeleccionadas}
              multiplicadorTiempo={multiplicadorTiempo}
              precioServicio={formData.precio_servicio}
              precioHabitacion={formData.precio_habitacion}
            />
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex-shrink-0 border-t px-4 sm:px-6 py-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 rounded-full"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

