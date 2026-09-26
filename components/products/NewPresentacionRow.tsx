'use client';

import { Input } from '@/components/ui/input';
import { Barcode, Image, DollarSign, Package, Link as LinkIcon, X, Boxes } from 'lucide-react';
import type { PresentacionFormItem } from '@/hooks/personal/useProductForm';

interface NewPresentacionRowProps {
  presentacion: PresentacionFormItem;
  index: number;
  isLoading: boolean;
  dragRow: number | null;
  onDragRowChange: (row: number | null) => void;
  onUpdate: (field: keyof PresentacionFormItem, value: string) => void;
  onRemove: () => void;
  onFotoFile: (file: File) => void;
  onFotoUrl: (url: string) => void;
}

export function NewPresentacionRow({
  presentacion: p,
  index: i,
  isLoading,
  dragRow,
  onDragRowChange,
  onUpdate,
  onRemove,
  onFotoFile,
  onFotoUrl
}: NewPresentacionRowProps) {
  return (
    <div className='p-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-2'>
      <div className='flex items-center gap-2'>
        <div
          onDragOver={e => {
            e.preventDefault();
            onDragRowChange(i);
          }}
          onDragLeave={() => onDragRowChange(null)}
          onDrop={e => {
            e.preventDefault();
            onDragRowChange(null);
            const file = e.dataTransfer.files?.[0];
            if (file) onFotoFile(file);
          }}
          className={`relative w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
            dragRow === i
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800'
          }`}
        >
          {p.fotoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview local temporal
            <img
              data-themed-photo
              src={p.fotoPreview}
              alt={`Presentación ${i + 1}`}
              className='w-full h-full object-cover'
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center text-gray-300'>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative lucide icon */}
              <Image className='w-5 h-5' aria-hidden='true' />
            </div>
          )}
          <label
            htmlFor={`pres-foto-new-${i}`}
            className='absolute inset-0 cursor-pointer'
            title='Arrastrar o elegir imagen'
          >
            <input
              id={`pres-foto-new-${i}`}
              type='file'
              accept='image/*'
              disabled={isLoading}
              className='hidden'
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) onFotoFile(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-xs font-bold uppercase tracking-wider text-gray-400'>
            Presentación {i + 1}
          </p>
          <p className='text-[11px] text-gray-400'>Arrastra o toca la imagen</p>
        </div>
        <button
          type='button'
          onClick={onRemove}
          disabled={isLoading}
          title='Quitar presentación'
          className='p-2.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 shrink-0'
        >
          <X className='w-4 h-4' />
        </button>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
        <div className='relative group'>
          <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
            <Boxes className='w-4 h-4' />
          </span>
          <Input
            value={p.nombre}
            onChange={e => onUpdate('nombre', e.target.value)}
            placeholder='Ej: 750 ml'
            disabled={isLoading}
            className='h-11 pl-11'
          />
        </div>
        <div className='relative group'>
          <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
            <Barcode className='w-4 h-4' />
          </span>
          <Input
            value={p.codigo_barras}
            onChange={e => onUpdate('codigo_barras', e.target.value)}
            placeholder='Código de barras (opcional)'
            disabled={isLoading}
            className='h-11 pl-11 font-mono text-sm'
          />
        </div>
      </div>
      <div className='grid grid-cols-2 gap-2 items-center'>
        <div className='relative group'>
          <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
            <DollarSign className='w-4 h-4' />
          </span>
          <Input
            value={p.precio_compra}
            onChange={e => onUpdate('precio_compra', e.target.value)}
            placeholder='Precio compra'
            disabled={isLoading}
            inputMode='numeric'
            className='h-11 pl-11'
          />
        </div>
        <div className='relative group'>
          <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
            <Package className='w-4 h-4' />
          </span>
          <Input
            value={p.stock}
            onChange={e => onUpdate('stock', e.target.value)}
            placeholder='Stock'
            disabled={isLoading}
            inputMode='numeric'
            className='h-11 pl-11'
          />
        </div>
      </div>
      <div className='relative group'>
        <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10'>
          <LinkIcon className='w-4 h-4' />
        </span>
        <Input
          value={p.fotoUrl}
          onChange={e => onFotoUrl(e.target.value)}
          placeholder='URL de imagen (opcional)'
          disabled={isLoading || !!p.foto}
          className='h-10 pl-10 text-sm'
        />
      </div>
    </div>
  );
}
