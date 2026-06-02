import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bed, DollarSign, Clock } from 'lucide-react';
import { Room } from '@/types/room';
import { useRoomForm, type RoomFormValues } from '@/hooks/personal';

interface RoomFormProps {
  open: boolean;
  onSubmit: (form: RoomFormValues) => void;
  onCancel: () => void;
  initialValues?: Room | null;
  isLoading: boolean;
  hideButtons?: boolean;
}

export function RoomForm({ open, onSubmit, onCancel, initialValues, isLoading, hideButtons = false }: RoomFormProps) {
  const { form, errors, handleChange, handleFocus, handleBlur, handleSubmit } = useRoomForm({ open, initialValues, onSubmit });

  return (
    <form id='room-form' onSubmit={handleSubmit} className='space-y-4'>
      <div>
        <label htmlFor='room-name' className='block text-sm sm:text-base font-medium mb-2'>Nombre</label>
        <div className='relative'>
          <Bed className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
          <Input id='room-name' name='name' value={form.name} onChange={handleChange}
            placeholder='Nombre de la habitacion' disabled={isLoading} autoFocus className='text-sm sm:text-base pl-10' />
        </div>
        {errors.name && <span className='text-red-500 text-xs mt-1 block'>{errors.name}</span>}
      </div>
      <div>
        <label htmlFor='room-price' className='block text-sm sm:text-base font-medium mb-2'>Precio</label>
        <div className='relative'>
          <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
          <Input id='room-price' name='price' value={form.price} onChange={handleChange}
            onFocus={handleFocus} onBlur={handleBlur} placeholder='Precio de la habitacion'
            disabled={isLoading} inputMode='numeric' className='text-sm sm:text-base pl-10' />
        </div>
        {errors.price && <span className='text-red-500 text-xs mt-1 block'>{errors.price}</span>}
      </div>
      <div>
        <label htmlFor='room-time' className='block text-sm sm:text-base font-medium mb-2'>Tiempo (minutos)</label>
        <div className='relative'>
          <Clock className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
          <Input id='room-time' name='time' value={form.time} onChange={handleChange}
            onFocus={handleFocus} onBlur={handleBlur} placeholder='Tiempo de la habitacion'
            disabled={isLoading} inputMode='numeric' className='text-sm sm:text-base pl-10' />
        </div>
        {errors.time && <span className='text-red-500 text-xs mt-1 block'>{errors.time}</span>}
      </div>
      <div>
        <label htmlFor='room-comm' className='block text-sm sm:text-base font-medium mb-2'>Comision Anfitriona (Monto)</label>
        <div className='relative'>
          <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
          <Input id='room-comm' name='comision_anfitriona' value={form.comision_anfitriona} onChange={handleChange}
            onFocus={handleFocus} onBlur={handleBlur} placeholder='Monto de comision'
            disabled={isLoading} inputMode='numeric' className='text-sm sm:text-base pl-10' />
        </div>
        {errors.comision_anfitriona && <span className='text-red-500 text-xs mt-1 block'>{errors.comision_anfitriona}</span>}
      </div>
      {!hideButtons && (
        <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
          <Button type='button' onClick={onCancel} variant='outline' disabled={isLoading}
            className='w-full sm:w-auto rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white'>
            Cancelar
          </Button>
          <Button type='submit' disabled={isLoading} variant='outline'
            className='flex items-center gap-2 w-full sm:w-auto rounded-full hover:scale-105 transition-all duration-200 bg-black text-white'>
            {initialValues ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      )}
    </form>
  );
}

