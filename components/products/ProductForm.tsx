/* eslint-disable */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product } from '@/types/product';
import { Barcode, Image, DollarSign, FileText, Package } from 'lucide-react';
import { useProductForm } from '@/hooks/personal/useProductForm';

interface ProductFormProps {
  open: boolean;
  onSubmit: (form: FormData) => void;
  onCancel: () => void;
  initialValues?: Product | null;
  categoryId: number;
  isLoading: boolean;
  hideButtons?: boolean;
}

export function ProductForm({ open, onSubmit, onCancel, initialValues, categoryId, isLoading, hideButtons = false }: ProductFormProps) {
  const { form, errors, imagePreview, handleChange, handlePriceChange, handleCommissionChange, handleSubmit } =
    useProductForm({ open, initialValues, categoryId, onSubmit });

  return (
    <form id='product-form' onSubmit={handleSubmit} className='space-y-4'>
      <div>
        <label htmlFor='prod-code' className='block text-sm font-medium mb-1'>Codigo</label>
        <div className='relative'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600'><Barcode className='w-4 h-4' /></span>
          <Input id='prod-code' name='code' value={form.code} readOnly className='bg-gray-100 cursor-not-allowed pl-10 sm:pl-12' />
        </div>
        {errors.code && <span className='text-red-500 text-xs mt-1 block'>{errors.code}</span>}
      </div>
      <div>
        <label htmlFor='prod-name' className='block text-sm font-medium mb-1'>Nombre</label>
        <div className='relative'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600'><Package className='w-4 h-4' /></span>
          <Input id='prod-name' name='name' value={form.name} onChange={handleChange}
            placeholder='Nombre del producto' disabled={isLoading} autoFocus className='pl-10 sm:pl-12' />
        </div>
        {errors.name && <span className='text-red-500 text-xs mt-1 block'>{errors.name}</span>}
      </div>
      <div className='grid grid-cols-2 gap-4'>
        <div>
          <label htmlFor='prod-price' className='block text-sm font-medium mb-1'>Precio</label>
          <div className='relative'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm'><DollarSign /></span>
            <Input id='prod-price' name='price' value={form.price} type='text'
              onChange={e => handlePriceChange(e.target.value)}
              placeholder='0' disabled={isLoading} inputMode='numeric' className='pl-8' />
          </div>
          {errors.price && <span className='text-red-500 text-xs mt-1 block'>{errors.price}</span>}
        </div>
        <div>
          <label htmlFor='prod-commission' className='block text-sm font-medium mb-1'>Comision (opcional)</label>
          <div className='relative'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm'><DollarSign /></span>
            <Input id='prod-commission' name='commission' type='text' value={form.commission}
              onChange={e => handleCommissionChange(e.target.value)}
              placeholder='0 (por defecto)' disabled={isLoading} inputMode='numeric' className='pl-8' />
          </div>
          {errors.commission && <span className='text-red-500 text-xs mt-1 block'>{errors.commission}</span>}
        </div>
      </div>
      <div>
        <label htmlFor='prod-desc' className='block text-sm font-medium mb-1'>Descripcion (opcional)</label>
        <div className='relative'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600'><FileText className='w-4 h-4' /></span>
          <Input id='prod-desc' name='description' value={form.description} onChange={handleChange}
            placeholder='Descripcion del producto' disabled={isLoading} className='pl-10 sm:pl-12' />
        </div>
      </div>
      <div>
        <label htmlFor='prod-foto' className='block text-sm font-medium mb-1'>Imagen</label>
        <div className='relative'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600'><Image className='w-4 h-4' /></span>
          <Input id='prod-foto' name='foto' type='file' accept='image/jpeg,image/jpg,image/png,image/gif'
            onChange={handleChange} disabled={isLoading} className='pl-10 sm:pl-12' />
        </div>
        {errors.foto && <span className='text-red-500 text-xs mt-1 block'>{errors.foto}</span>}
        <div className='text-xs text-gray-500 mt-1'>Formatos permitidos: JPG, PNG, GIF. Tamano maximo: 5MB</div>
        {imagePreview && <img src={imagePreview} alt='Vista previa' className='mt-2 max-h-32 max-w-32 rounded border object-cover' />}
      </div>
      {!hideButtons && (
        <div className='flex flex-row justify-center gap-2 w-full'>
          <Button type='button' onClick={onCancel} disabled={isLoading} size='sm' variant='outline'
            className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white'>
            Cancelar
          </Button>
          <Button type='submit' disabled={isLoading} size='sm' variant='outline'
            className='flex items-center bg-black text-white gap-2 rounded-full hover:scale-105 transition-all duration-200'>
            {initialValues ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      )}
    </form>
  );
}
