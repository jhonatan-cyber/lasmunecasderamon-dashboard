/* eslint-disable */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product } from '@/types/product';
import { Barcode, Image, DollarSign, FileText, Package, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useProductForm } from '@/hooks/personal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Product | null;
  categoryId: string | number;
  isLoading: boolean;
  isMutating: boolean;
  onSubmit?: (form: FormData) => void | Promise<void>;
}

export function ProductFormModal({
  open,
  onOpenChange,
  initialValues,
  categoryId,
  isLoading,
  isMutating,
  onSubmit
}: ProductFormModalProps) {
  const [hideButtons] = useState(true);

  const handleSubmit = async (form: FormData) => {
    if (onSubmit) {
      await onSubmit(form);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='p-6 pb-2 border-b'>
          <DialogTitle className='text-xl font-bold'>
            {initialValues ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Formulario para crear o editar productos
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto p-6'>
          <ProductForm
            open={open}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleSubmit}
            initialValues={initialValues}
            categoryId={categoryId}
            isLoading={isLoading || isMutating}
            hideButtons={hideButtons}
          />
        </div>

        <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
            disabled={isMutating}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            form='product-form'
            className='bg-black text-white dark:bg-black dark:text-white  dark:hover:!bg-white dark:hover:!text-black rounded-full px-8 hover:!bg-white hover:!text-black transition-all hover:scale-105 border-2'
            disabled={isMutating}
          >
            {isMutating ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>{initialValues ? 'Actualizando...' : 'Guardando...'}</span>
              </div>
            ) : (
              <span>{initialValues ? 'Actualizar' : 'Guardar'}</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ProductFormProps {
  open: boolean;
  onSubmit: (form: FormData) => void;
  onCancel: () => void;
  initialValues?: Product | null;
  categoryId: string | number;
  isLoading: boolean;
  hideButtons?: boolean;
}

export function ProductForm({ open, onSubmit, initialValues, categoryId, isLoading, hideButtons = false }: ProductFormProps) {
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
      {}
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
              className='h-12 pl-12'
            />
          </div>
          {errors.name && <p className='text-red-500 text-xs mt-1 ml-1 font-medium'>{errors.name}</p>}
        </div>
      </div>

      {}
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
              className='h-12 pl-12'
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
              className='h-12 pl-12'
            />
          </div>
          {errors.commission && <p className='text-red-500 text-xs mt-1 ml-1 font-medium'>{errors.commission}</p>}
        </div>
      </div>

      {}
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
            className='w-full min-h-[100px] pl-12 pr-4 py-3 rounded-2xl'
          />
        </div>
      </div>

      {}
      <div className='space-y-3'>
        <label className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
          Imagen del Producto
        </label>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          {}
          <div
            className={`relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden ${
              isDragging
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className='p-4 flex flex-col items-center gap-3'>
              {}
              <div className='relative w-28 h-28 rounded-xl border-2 border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden bg-gray-50 dark:bg-slate-800'>
                {imagePreview ? (
                  <img src={imagePreview} alt='Preview' className='w-full h-full object-cover' />
                ) : (
                  <div className='w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400'>
                    <Image className='w-10 h-10 stroke-1' />
                    <span className='text-[9px] font-semibold uppercase tracking-wide'>Sin imagen</span>
                  </div>
                )}
              </div>

              {}
              <div className='flex flex-col items-center gap-2 w-full'>
                <p className='text-xs text-gray-500 dark:text-gray-400 text-center'>
                  Arrastrá una imagen o
                </p>
                <label className='cursor-pointer'>
                  <input
                    type='file'
                    accept='image/*'
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const fakeEvent = {
                          target: {
                            name: 'foto',
                            type: 'file',
                            files: [file]
                          }
                        } as any;
                        handleChange(fakeEvent);
                      }
                    }}
                    disabled={isLoading}
                    className='hidden'
                  />
                  <div className='flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-full hover:scale-105 transition-all font-semibold text-xs shadow-md'>
                    <Upload className='w-4 h-4' />
                    Elegir archivo
                  </div>
                </label>
                <p className='text-[10px] text-gray-400'>
                  JPG, PNG • Máx 5MB
                </p>
              </div>
            </div>
          </div>

          {}
          <div className='flex flex-col justify-center'>
            <label className='block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 ml-1'>
              URL de imagen
            </label>
            <div className='relative'>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10'>
                <LinkIcon className='w-4 h-4' />
              </span>
              <Input
                placeholder='https://ejemplo.com/imagen.jpg'
                value={form.fotoUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                disabled={isLoading}
                className='h-11 pl-10 rounded-xl bg-white dark:bg-slate-800'
              />
            </div>
            <p className='text-[10px] text-gray-400 mt-1.5 ml-1'>
              Pegá el enlace de una imagen externa
            </p>
          </div>
        </div>
        {errors.foto && <p className='text-red-500 text-xs font-medium text-center'>{errors.foto}</p>}
      </div>

    </form>
  );
}

