import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, Bed, DollarSign, Clock, Percent } from 'lucide-react';
import { Room } from '@/types/room';

export interface RoomForm {
  name: string;
  price: string;
  time: string;
  comision_anfitriona: string;
}

interface RoomFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: RoomForm) => void;
  initialValues?: Room | null;
  isLoading: boolean;
}

const initialFormState: RoomForm = {
  name: '',
  price: '',
  time: '',
  comision_anfitriona: ''
};

const formatNumberWithSeparators = (value: string) => {
  if (!value) return '';
  // Mantener solo dígitos y agregar puntos de miles
  const numeric = value.replace(/\D/g, '');
  if (!numeric) return '';
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const RoomFormDialog: React.FC<RoomFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  isLoading
}) => {
  const [form, setForm] = useState<RoomForm>(initialFormState);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (open && initialValues) {
      setForm({
        name: initialValues.name || '',
        price: initialValues.price ? String(initialValues.price) : '',
        time: initialValues.time ? String(initialValues.time) : '',
        comision_anfitriona: initialValues.comision_anfitriona ? String(initialValues.comision_anfitriona) : ''
      });
    } else if (open) {
      setForm(initialFormState);
    }
    setErrors({});
  }, [open, initialValues]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!form.price.trim() || isNaN(Number(form.price)))
      newErrors.price = 'Precio válido requerido';
    if (!form.time.trim() || isNaN(Number(form.time))) newErrors.time = 'Tiempo válido requerido';
    if (form.comision_anfitriona && (isNaN(Number(form.comision_anfitriona)) || Number(form.comision_anfitriona) < 0 || Number(form.comision_anfitriona) > 100)) {
      newErrors.comision_anfitriona = 'La comisión debe ser un número entre 0 y 100';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'price') {
      setForm({ ...form, price: formatNumberWithSeparators(value) });
      return;
    }

    if (name === 'name') {
      // Capitaliza cada palabra en el nombre
      const capitalized = value.replace(/\b\w/g, l => l.toUpperCase());
      setForm({ ...form, name: capitalized });
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.name === 'price' || e.target.name === 'time') {
      setForm({ ...form, [e.target.name]: '' });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if ((e.target.name === 'price' || e.target.name === 'time') && !form[e.target.name]) {
      setForm({
        ...form,
        [e.target.name]: initialValues ? String((initialValues as any)[e.target.name]) : ''
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('submit ejecutado', form);
    if (validate()) {
      onSubmit(form);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onClose();
      }}
    >
      <DialogContent className='p-0 w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[500px] max-h-[90vh] flex flex-col'>
        <form onSubmit={handleSubmit} className='flex flex-col h-full'>
          <DialogHeader className='flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b'>
            <DialogTitle className='text-lg sm:text-xl lg:text-2xl font-bold'>
              {initialValues ? 'Editar habitación' : 'Nueva habitación'}
            </DialogTitle>
          </DialogHeader>
          <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-4'>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm sm:text-base font-medium mb-2'>Nombre</label>
                <div className='relative'>
                  <Bed className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
                  <Input
                    name='name'
                    value={form.name}
                    onChange={handleChange}
                    placeholder='Nombre de la habitación'
                    disabled={isLoading}
                    autoFocus
                    className='text-sm sm:text-base pl-10'
                  />
                </div>
                {errors.name && (
                  <span className='text-red-500 text-xs sm:text-sm mt-1 block'>{errors.name}</span>
                )}
              </div>
              <div>
                <label className='block text-sm sm:text-base font-medium mb-2'>Precio</label>
                <div className='relative'>
                  <DollarSign className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
                  <Input
                    name='price'
                    value={form.price}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder='Precio de la habitación'
                    disabled={isLoading}
                    inputMode='numeric'
                    className='text-sm sm:text-base pl-10'
                  />
                </div>
                {errors.price && (
                  <span className='text-red-500 text-xs sm:text-sm mt-1 block'>{errors.price}</span>
                )}
              </div>
              <div>
                <label className='block text-sm sm:text-base font-medium mb-2'>
                  Tiempo (minutos)
                </label>
                <div className='relative'>
                  <Clock className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
                  <Input
                    name='time'
                    value={form.time}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder='Tiempo de la habitación'
                    disabled={isLoading}
                    inputMode='numeric'
                    className='text-sm sm:text-base pl-10'
                  />
                </div>
                {errors.time && (
                  <span className='text-red-500 text-xs sm:text-sm mt-1 block'>{errors.time}</span>
                )}
              </div>
              <div>
                <label className='block text-sm sm:text-base font-medium mb-2'>
                  Comisión Anfitriona (%)
                </label>
                <div className='relative'>
                  <Percent className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
                  <Input
                    name='comision_anfitriona'
                    value={form.comision_anfitriona}
                    onChange={handleChange}
                    placeholder='Porcentaje de comisión'
                    disabled={isLoading}
                    inputMode='numeric'
                    className='text-sm sm:text-base pl-10'
                  />
                </div>
                {errors.comision_anfitriona && (
                  <span className='text-red-500 text-xs sm:text-sm mt-1 block'>{errors.comision_anfitriona}</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className='flex-shrink-0 border-t px-4 sm:px-6 py-4'>
            <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
              <Button
                type='button'
                onClick={onClose}
                variant='outline'
                disabled={isLoading}
                className=' sm:text-base w-full sm:w-auto rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white'
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                disabled={isLoading}
                variant='outline'
                className='flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto rounded-full hover:scale-105 transition-all duration-200 bg-black text-white'
              >
                {initialValues ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoomFormDialog;
