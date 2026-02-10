import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import HostessSelect from '@/components/ui/HostessSelect';

interface ServiceFormFieldsProps {
  // Anfitrionas
  anfitrionasDisponibles: any[];
  selectedUsuarios: string[];
  onUsuariosChange: (usuarios: string[]) => void;
  anfitrionasDelServicio: string[];
  loadingAnfitrionas: boolean;
  
  // Precio Servicio
  precioServicioDisplay: string;
  onPrecioServicioChange: (value: string) => void;
  onPrecioServicioFocus: () => void;
  onPrecioServicioBlur: () => void;
  precioServicioTotal: number;
  numAnfitrionas: number;
  multiplicadorTiempo: number;
  
  // Precio Habitación
  precioHabitacionDisplay: string;
  precioHabitacionSinComision: number;
  precioHabitacionTotal: number;
  
  // Método de Pago
  metodoPago: string;
  onMetodoPagoChange: (value: string) => void;
  precioServicioTotalForIVA: number;
  iva: number;
  
  // Tiempo
  tiempo: number;
  onTiempoChange: (value: string) => void;
  
  // Estado
  isSaving: boolean;
}

export const ServiceFormFields = React.memo<ServiceFormFieldsProps>(({
  anfitrionasDisponibles,
  selectedUsuarios,
  onUsuariosChange,
  anfitrionasDelServicio,
  loadingAnfitrionas,
  precioServicioDisplay,
  onPrecioServicioChange,
  onPrecioServicioFocus,
  onPrecioServicioBlur,
  precioServicioTotal,
  numAnfitrionas,
  multiplicadorTiempo,
  precioHabitacionDisplay,
  precioHabitacionSinComision,
  precioHabitacionTotal,
  metodoPago,
  onMetodoPagoChange,
  precioServicioTotalForIVA,
  iva,
  tiempo,
  onTiempoChange,
  isSaving
}) => {
  return (
    <div className="space-y-4">
      {/* Selector de Anfitrionas */}
      <div className="space-y-2">
        <Label>Anfitrionas</Label>
        <HostessSelect
          anfitrionas={anfitrionasDisponibles}
          value={selectedUsuarios}
          onChange={onUsuariosChange}
          placeholder="Seleccione anfitrionas"
          maxSelection={10}
          disabled={isSaving || loadingAnfitrionas}
        />
        {selectedUsuarios.length > 0 && (
          <p className="text-xs text-gray-500">
            {selectedUsuarios.length} anfitriona{selectedUsuarios.length > 1 ? 's' : ''} seleccionada{selectedUsuarios.length > 1 ? 's' : ''}
          </p>
        )}
        {anfitrionasDelServicio.length > 0 && (
          <p className="text-xs text-blue-600">
            Anfitrionas actuales del servicio están incluidas en la lista
          </p>
        )}
      </div>

      {/* Precio del Servicio */}
      <div className="space-y-2">
        <Label htmlFor="precio_servicio">
          Precio del Servicio {numAnfitrionas > 1 ? `(por anfitriona)` : ''}
        </Label>
        <Input
          id="precio_servicio"
          type="text"
          value={precioServicioDisplay}
          onChange={(e) => onPrecioServicioChange(e.target.value)}
          onFocus={onPrecioServicioFocus}
          onBlur={onPrecioServicioBlur}
          placeholder="Ingrese el precio del servicio"
          disabled={isSaving}
        />
        {numAnfitrionas > 1 && precioServicioTotal > 0 && (
          <p className="text-xs text-gray-500">
            Total: {formatCurrencyNoDecimals(precioServicioTotal)} ({numAnfitrionas} × {formatCurrencyNoDecimals(precioServicioTotal / numAnfitrionas / multiplicadorTiempo)}{multiplicadorTiempo > 1 ? ` × ${multiplicadorTiempo}` : ''})
          </p>
        )}
        {multiplicadorTiempo > 1 && (
          <p className="text-xs text-orange-600">
            Precio duplicado por seleccionar 60 minutos
          </p>
        )}
      </div>

      {/* Precio de la Habitación */}
      <div className="space-y-2">
        <Label htmlFor="precio_habitacion">
          Precio de la Habitación {numAnfitrionas > 1 ? `(por anfitriona)` : ''}
        </Label>
        <Input
          id="precio_habitacion"
          type="text"
          value={precioHabitacionDisplay}
          placeholder="Precio tomado de habitación sin comisión"
          disabled={true}
          className="bg-gray-100 cursor-not-allowed"
        />
        {precioHabitacionSinComision > 0 && (
          <p className="text-xs text-blue-600">
            Precio automático de habitación sin comisión: {formatCurrencyNoDecimals(precioHabitacionSinComision)}
          </p>
        )}
        {numAnfitrionas > 1 && precioHabitacionTotal > 0 && (
          <p className="text-xs text-gray-500">
            Total: {formatCurrencyNoDecimals(precioHabitacionTotal)} ({numAnfitrionas} × {formatCurrencyNoDecimals(precioHabitacionTotal / numAnfitrionas / multiplicadorTiempo)}{multiplicadorTiempo > 1 ? ` × ${multiplicadorTiempo}` : ''})
          </p>
        )}
        {multiplicadorTiempo > 1 && precioHabitacionTotal > 0 && (
          <p className="text-xs text-orange-600">
            Precio duplicado por seleccionar 60 minutos
          </p>
        )}
      </div>

      {/* Método de Pago */}
      <div className="space-y-2">
        <Label htmlFor="metodo_pago">Método de Pago</Label>
        <Select
          value={metodoPago}
          onValueChange={onMetodoPagoChange}
          disabled={isSaving}
        >
          <SelectTrigger className="rounded-full">
            <SelectValue placeholder="Seleccione método de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="efectivo">Efectivo</SelectItem>
            <SelectItem value="tarjeta">Tarjeta (+ 20% IVA)</SelectItem>
            <SelectItem value="transferencia">Transferencia</SelectItem>
          </SelectContent>
        </Select>
        {metodoPago === 'tarjeta' && (
          <div className="space-y-1">
            <p className="text-xs text-purple-600">
              Se aplicará automáticamente 20% de IVA sobre el precio total del servicio ({formatCurrencyNoDecimals(precioServicioTotalForIVA)})
            </p>
            {iva > 0 && (
              <p className="text-xs text-gray-500">
                Total IVA ajustado: {formatCurrencyNoDecimals(iva)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tiempo */}
      <div className="space-y-2">
        <Label htmlFor="tiempo">Tiempo Adicional (minutos)</Label>
        <Select
          value={tiempo.toString()}
          onValueChange={onTiempoChange}
          disabled={isSaving}
        >
          <SelectTrigger className="rounded-full">
            <SelectValue placeholder="Seleccione tiempo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Seleccione tiempo</SelectItem>
            <SelectItem value="2">2 minutos</SelectItem>
            <SelectItem value="10">10 minutos</SelectItem>
            <SelectItem value="20">20 minutos</SelectItem>
            <SelectItem value="30">30 minutos</SelectItem>
            <SelectItem value="60">60 minutos (costos duplicados)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-blue-600">
          Este tiempo creará un nuevo servicio completo en la base de datos. El timer principal se pausará hasta que termine.
        </p>
        {tiempo === 60 && (
          <p className="text-xs text-orange-600 font-medium">
            Con 60 minutos los costos se duplicarán automáticamente
          </p>
        )}
      </div>
    </div>
  );
});

ServiceFormFields.displayName = 'ServiceFormFields';
