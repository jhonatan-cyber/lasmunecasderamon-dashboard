'use client';

import { Input } from '@/components/ui/input';
import { Barcode, Package } from 'lucide-react';
import type { ProductFormValues } from '@/hooks/personal/useProductForm';

type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

interface ProductBasicFieldsProps {
  form: ProductFormValues;
  errors: ProductFormErrors;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  isEdit: boolean;
}

export function ProductBasicFields({
  form,
  errors,
  handleChange,
  isLoading
}: ProductBasicFieldsProps) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
      <div className='space-y-2'>
        <label
          htmlFor='prod-code'
          className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
        >
          Código
        </label>
        <div className='relative group'>
          <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
            <Barcode className='w-5 h-5' />
          </span>
          <Input
            id='prod-code'
            name='code'
            value={form.code}
            readOnly
            className='h-12 pl-12 rounded-2xl bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 cursor-not-allowed font-mono text-sm'
          />
        </div>
        {errors.code && (
          <p role='alert' className='text-red-500 text-xs mt-1 ml-1 font-medium'>
            {errors.code}
          </p>
        )}
      </div>

      <div className='space-y-2'>
        <label
          htmlFor='prod-name'
          className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
        >
          Nombre del Producto
        </label>
        <div className='relative group'>
          <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
            <Package className='w-5 h-5' />
          </span>
          <Input
            id='prod-name'
            name='name'
            value={form.name}
            onChange={handleChange}
            placeholder='Ej: Cerveza Corona 330ml'
            disabled={isLoading}
            className='h-12 pl-12'
          />
        </div>
        {errors.name && (
          <p role='alert' className='text-red-500 text-xs mt-1 ml-1 font-medium'>
            {errors.name}
          </p>
        )}
      </div>
    </div>
  );
}
