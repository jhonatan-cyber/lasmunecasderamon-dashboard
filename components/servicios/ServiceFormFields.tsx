import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { HostessSelect } from '@/components/shared/selects';

interface ServiceFormFieldsProps {
  anfitrionasDisponibles: any[];
  selectedUsuarios: string[];
  onUsuariosChange: (usuarios: string[]) => void;
  anfitrionasDelServicio: string[];
  loadingAnfitrionas: boolean;
  precioServicioDisplay: string;
  onPrecioServicioChange: (value: string) => void;
  onPrecioServicioFocus: () => void;
  onPrecioServicioBlur: () => void;
  precioServicioTotal: number;
  numAnfitrionas: number;
  multiplicadorTiempo: number;
  precioHabitacionDisplay: string;
  precioHabitacionSinComision: number;
  precioHabitacionTotal: number;
  metodoPago: string;
  onMetodoPagoChange: (value: string) => void;
  precioServicioTotalForIVA: number;
  iva: number;
  tiempo: number;
  onTiempoChange: (value: string) => void;
  isSaving: boolean;
}

export const ServiceFormFields = React.memo<ServiceFormFieldsProps>(
  ({
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
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label>Anfitrionas</Label>
          <HostessSelect
            anfitrionas={anfitrionasDisponibles}
            value={selectedUsuarios}
            onChange={onUsuariosChange}
            placeholder='Seleccione anfitrionas'
            maxSelection={10}
            disabled={isSaving || loadingAnfitrionas}
          />
          {selectedUsuarios.length > 0 && (
            <p className='text-xs text-gray-500'>
              {selectedUsuarios.length} anfitriona{selectedUsuarios.length > 1 ? 's' : ''}{' '}
              seleccionada{selectedUsuarios.length > 1 ? 's' : ''}
            </p>
          )}
          {anfitrionasDelServicio.length > 0 && (
            <p className='text-xs text-blue-600'>
              Anfitrionas actuales del servicio estÃ¡n incluidas en la lista
            </p>
          )}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='precio_servicio'>
            Precio del Servicio {numAnfitrionas > 1 ? `(por anfitriona)` : ''}
          </Label>
          <Input
            id='precio_servicio'
            type='text'
            value={precioServicioDisplay}
            onChange={e => onPrecioServicioChange(e.target.value)}
            onFocus={onPrecioServicioFocus}
            onBlur={onPrecioServicioBlur}
            placeholder='Ingrese el precio del servicio'
            disabled={isSaving}
          />
          {numAnfitrionas > 1 && precioServicioTotal > 0 && (
            <p className='text-xs text-gray-500'>
              Total: {formatCurrencyNoDecimals(precioServicioTotal)} ({numAnfitrionas} Ã—{' '}
              {formatCurrencyNoDecimals(precioServicioTotal / numAnfitrionas / multiplicadorTiempo)}
              {multiplicadorTiempo > 1 ? ` Ã— ${multiplicadorTiempo}` : ''})
            </p>
          )}
          {multiplicadorTiempo > 1 && (
            <p className='text-xs text-orange-600'>Precio duplicado por seleccionar 60 minutos</p>
          )}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='precio_habitacion'>
            Precio de la HabitaciÃ³n {numAnfitrionas > 1 ? `(por anfitriona)` : ''}
          </Label>
          <Input
            id='precio_habitacion'
            type='text'
            value={precioHabitacionDisplay}
            placeholder='Precio tomado de habitaciÃ³n sin comisiÃ³n'
            disabled
            className='bg-gray-100 cursor-not-allowed'
          />
          {precioHabitacionSinComision > 0 && (
            <p className='text-xs text-blue-600'>
              Precio automÃ¡tico de habitaciÃ³n sin comisiÃ³n:{' '}
              {formatCurrencyNoDecimals(precioHabitacionSinComision)}
            </p>
          )}
          {numAnfitrionas > 1 && precioHabitacionTotal > 0 && (
            <p className='text-xs text-gray-500'>
              Total: {formatCurrencyNoDecimals(precioHabitacionTotal)} ({numAnfitrionas} Ã—{' '}
              {formatCurrencyNoDecimals(
                precioHabitacionTotal / numAnfitrionas / multiplicadorTiempo
              )}
              {multiplicadorTiempo > 1 ? ` Ã— ${multiplicadorTiempo}` : ''})
            </p>
          )}
          {multiplicadorTiempo > 1 && precioHabitacionTotal > 0 && (
            <p className='text-xs text-orange-600'>Precio duplicado por seleccionar 60 minutos</p>
          )}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label htmlFor='metodo_pago'>MÃ©todo de Pago</Label>
            <Select value={metodoPago} onValueChange={onMetodoPagoChange} disabled={isSaving}>
              <SelectTrigger className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 [&>svg]:hidden'>
                <SelectValue placeholder='Seleccione mÃ©todo de pago' />
              </SelectTrigger>
              <SelectContent className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white'>
                <SelectItem value='efectivo'>Efectivo</SelectItem>
                <SelectItem value='tarjeta'>Tarjeta (+ 20% IVA)</SelectItem>
                <SelectItem value='transferencia'>Transferencia</SelectItem>
              </SelectContent>
            </Select>
            {metodoPago === 'tarjeta' && (
              <div className='space-y-1'>
                <p className='text-xs text-purple-600'>
                  Se aplicarÃ¡ automÃ¡ticamente 20% de IVA sobre el precio total del servicio (
                  {formatCurrencyNoDecimals(precioServicioTotalForIVA)})
                </p>
                {iva > 0 && (
                  <p className='text-xs text-gray-500'>
                    Total IVA ajustado: {formatCurrencyNoDecimals(iva)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='tiempo'>Tiempo Adicional (minutos)</Label>
            <Select value={tiempo.toString()} onValueChange={onTiempoChange} disabled={isSaving}>
              <SelectTrigger className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 [&>svg]:hidden'>
                <SelectValue placeholder='Seleccione tiempo' />
              </SelectTrigger>
              <SelectContent className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white'>
                <SelectItem value='0'>Seleccione tiempo</SelectItem>
                <SelectItem value='2'>2 minutos</SelectItem>
                <SelectItem value='10'>10 minutos</SelectItem>
                <SelectItem value='20'>20 minutos</SelectItem>
                <SelectItem value='30'>30 minutos</SelectItem>
                <SelectItem value='60'>60 minutos (costos duplicados)</SelectItem>
              </SelectContent>
            </Select>
            <p className='text-xs text-blue-600'>
              Este tiempo crearÃ¡ un nuevo servicio completo en la base de datos. El timer principal
              se pausarÃ¡ hasta que termine.
            </p>
            {tiempo === 60 && (
              <p className='text-xs text-orange-600 font-medium'>
                Con 60 minutos los costos se duplicarÃ¡n automÃ¡ticamente
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ServiceFormFields.displayName = 'ServiceFormFields';


