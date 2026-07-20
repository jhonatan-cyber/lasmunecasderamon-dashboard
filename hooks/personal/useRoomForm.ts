'use client';

import { useState, useEffect } from 'react';
import { Room } from '@/types/room';

export interface RoomFormValues {
  name: string;
  price: string;
  time: string;
  comision_anfitriona: string;
}

const initialFormState: RoomFormValues = { name: '', price: '', time: '', comision_anfitriona: '' };

const formatNumberWithSeparators = (value: string) => {
  const numeric = value.replace(/\D/g, '');
  if (!numeric) return '';
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

interface UseRoomFormProps {
  open: boolean;
  initialValues?: Room | null;
  onSubmit: (form: RoomFormValues) => void;
}

export function useRoomForm({ open, initialValues, onSubmit }: UseRoomFormProps) {
  const [form, setForm] = useState<RoomFormValues>(initialFormState);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (open && initialValues) {
      setForm({
        name: initialValues.name || '',
        price: initialValues.price ? formatNumberWithSeparators(String(initialValues.price)) : '',
        time: initialValues.time ? String(initialValues.time) : '',
        comision_anfitriona: initialValues.comision_anfitriona
          ? formatNumberWithSeparators(String(initialValues.comision_anfitriona))
          : ''
      });
    } else if (open) {
      setForm(initialFormState);
    }
    setErrors({});
  }, [open, initialValues]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!form.price.trim() || isNaN(Number(form.price.replace(/\./g, ''))))
      newErrors.price = 'Precio válido requerido';
    if (!form.time.trim() || isNaN(Number(form.time))) newErrors.time = 'Tiempo válido requerido';
    if (
      form.comision_anfitriona &&
      (isNaN(Number(form.comision_anfitriona.replace(/\./g, ''))) ||
        Number(form.comision_anfitriona.replace(/\./g, '')) < 0)
    ) {
      newErrors.comision_anfitriona = 'La comisión debe ser un monto válido mayor o igual a 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'price' || name === 'comision_anfitriona') {
      setForm(prev => ({ ...prev, [name]: formatNumberWithSeparators(value) }));
    } else if (name === 'name') {
      setForm(prev => ({ ...prev, name: value.replace(/\b\w/g, l => l.toUpperCase()) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (['price', 'time', 'comision_anfitriona'].includes(e.target.name)) {
      setForm(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    if (
      ['price', 'time', 'comision_anfitriona'].includes(name) &&
      !form[name as keyof RoomFormValues]
    ) {
      const initialValue = initialValues ? (initialValues as any)[name] : '';
      setForm(prev => ({
        ...prev,
        [name]: initialValue
          ? name !== 'time'
            ? formatNumberWithSeparators(String(initialValue))
            : String(initialValue)
          : ''
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  return { form, errors, handleChange, handleFocus, handleBlur, handleSubmit };
}
