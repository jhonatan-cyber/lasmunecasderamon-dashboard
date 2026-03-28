/* eslint-disable */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product } from '@/types/product';
import { Barcode, Image, DollarSign, FileText, Package, Upload, Link as LinkIcon } from 'lucide-react';
import { useProductForm } from '@/hooks/personal/useProductForm';

interface ProductFormProps {
  open: boolean;
  onSubmit: (form: FormData) => void;
  onCancel: () => void;
  initialValues?: Product | null;
  categoryId: string | number;
  isLoading: boolean;
  hideButtons?: boolean;
}

export function ProductForm({ open, onSubmit, onCancel, initialValues, categoryId, isLoading, hideButtons = false }: ProductFormProps) {
  const { 
    form, 
    errors, 
    imagePreview, 
    handleChange, 
    handlePriceChange, 
    handleCommissionChange, 
    handleUrlChange, 
    handleFileDrop, 
    handleSubmit 
  } = useProductForm({ open, initialValues, categoryId, onSubmit });

  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileDrop(file);
  };

  return (
    <form id='product-form' onSubmit={handleSubmit} className='space-y-6 py-2'>
      {/* Código y Nombre */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <label htmlFor='prod-code' className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
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
          {errors.code && <p className='text-red-500 text-xs mt-1 ml-1 font-medium'>{errors.code}</p>}
        </div>

        <div className='space-y-2'>
          <label htmlFor='prod-name' className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
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
              className='h-12 pl-12 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 group-focus-within:border-purple-500/50 transition-all'
            />
          </div>
          {errors.name && <p className='text-red-500 text-xs mt-1 ml-1 font-medium'>{errors.name}</p>}
        </div>
      </div>

      {/* Precios y Comisiones */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <label htmlFor='prod-price' className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
            Precio de Venta
          </label>
          <div className='relative group'>
            <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors bg-white dark:bg-slate-950 p-0.5 rounded-full'>
              <DollarSign className='w-4 h-4' />
            </span>
            <Input
              id='prod-price'
              name='price'
              value={form.price}
              type='text'
              onChange={e => handlePriceChange(e.target.value)}
              placeholder='0'
              disabled={isLoading}
              inputMode='numeric'
              className='h-12 pl-12 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800'
            />
          </div>
          {errors.price && <p className='text-red-500 text-xs mt-1 ml-1 font-medium'>{errors.price}</p>}
        </div>

        <div className='space-y-2'>
          <label htmlFor='prod-commission' className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
            Comisión (Opcional)
          </label>
          <div className='relative group'>
            <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
              <DollarSign className='w-4 h-4' />
            </span>
            <Input
              id='prod-commission'
              name='commission'
              type='text'
              value={form.commission}
              onChange={e => handleCommissionChange(e.target.value)}
              placeholder='0 (Sin comisión)'
              disabled={isLoading}
              inputMode='numeric'
              className='h-12 pl-12 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800'
            />
          </div>
          {errors.commission && <p className='text-red-500 text-xs mt-1 ml-1 font-medium'>{errors.commission}</p>}
        </div>
      </div>

      {/* Descripción */}
      <div className='space-y-2'>
        <label htmlFor='prod-desc' className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
          Descripción
        </label>
        <div className='relative group'>
          <span className='absolute left-4 top-4 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
            <FileText className='w-5 h-5' />
          </span>
          <textarea
            id='prod-desc'
            name='description'
            value={form.description}
            onChange={handleChange as any}
            placeholder='Detalles informativos del producto...'
            disabled={isLoading}
            className='w-full min-h-[100px] pl-12 pr-4 py-3 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all text-sm'
          />
        </div>
      </div>

      {/* Imagen Section */}
      <div className='space-y-4'>
        <label className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
          Imagen del Producto
        </label>
        
        <div 
          className={`relative group border-2 border-dashed rounded-3xl p-6 transition-all duration-200 flex flex-col items-center gap-4 ${
            isDragging 
              ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 scale-[1.02]' 
              : 'border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/20 hover:border-gray-300 dark:hover:border-slate-700'
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {/* Preview central */}
          <div className='relative w-40 h-40 rounded-3xl border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden bg-white dark:bg-slate-900 group-hover:scale-105 transition-transform duration-300'>
            {imagePreview ? (
              <img src={imagePreview} alt='Preview' className='w-full h-full object-cover' />
            ) : (
              <div className='w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400'>
                <Image className='w-12 h-12 stroke-1' />
                <span className='text-[10px] font-bold uppercase tracking-wider'>Sin Imagen</span>
              </div>
            )}
          </div>

          <div className='flex flex-col items-center text-center space-y-2'>
            <p className='text-sm font-medium'>
              Arrastrá tu imagen acá <span className='text-gray-400 uppercase text-[10px] mx-1'>o</span> eligí un archivo
            </p>
            
            <div className='flex items-center gap-4 mt-2'>
              <label className='relative overflow-hidden group cursor-pointer'>
                <input
                  type='file'
                  accept='image/*'
                  onChange={handleChange}
                  disabled={isLoading}
                  className='hidden'
                />
                <div className='flex items-center gap-2 px-6 py-2 bg-black text-white dark:bg-white dark:text-black rounded-full hover:scale-105 transition-all font-bold text-xs ring-4 ring-black/5'>
                  <Upload className='w-4 h-4' />
                  Subir Local
                </div>
              </label>
            </div>
            
            <p className='text-[10px] text-gray-400 uppercase tracking-tight mt-2'>
              JPG, PNG, GIF o WEBP • Máximo 5MB
            </p>
          </div>
        </div>

        {/* URL Input */}
        <div className='space-y-2 mt-4'>
           <div className='relative group'>
            <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
              <LinkIcon className='w-4 h-4' />
            </span>
            <Input
              placeholder='O pegá la URL de una imagen externa...'
              value={form.fotoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={isLoading}
              className='h-12 pl-12 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800'
            />
          </div>
        </div>
        {errors.foto && <p className='text-red-500 text-xs font-medium text-center'>{errors.foto}</p>}
      </div>

      {!hideButtons && (
        <div className='flex flex-col sm:flex-row justify-center gap-4 pt-4'>
          <Button
            type='button'
            onClick={onCancel}
            disabled={isLoading}
            variant='outline'
            className='rounded-full px-8 h-12 hover:scale-105 transition-all text-sm font-bold'
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            disabled={isLoading}
            className='bg-black text-white dark:bg-white dark:text-black rounded-full px-8 h-12 hover:scale-105 transition-all font-bold text-sm shadow-xl shadow-black/10 dark:shadow-white/5'
          >
            {initialValues ? 'Actualizar Producto' : 'Guardar Producto'}
          </Button>
        </div>
      )}
    </form>
  );
}
