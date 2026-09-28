'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import {
  Barcode,
  Image,
  DollarSign,
  Package,
  Link as LinkIcon,
  X,
  Boxes,
  Ruler
} from 'lucide-react';
import type { PresentacionFormItem } from '@/hooks/personal/useProductForm';

const PRESENTACION_UNIDADES = [
  { value: 'ml', label: 'Mililitros' },
  { value: 'cl', label: 'Centilitros' },
  { value: 'l', label: 'Litros' },
  { value: 'cm3', label: 'Centímetros cúbicos' },
  { value: 'oz', label: 'Onzas' },
  { value: 'g', label: 'Gramos' },
  { value: 'kg', label: 'Kilogramos' },
  { value: 'lb', label: 'Libras' },
  { value: 'und', label: 'Unidad' },
  { value: 'doc', label: 'Docena' },
  { value: 'cx', label: 'Caja' },
  { value: '%', label: 'Porcentaje' }
] as const;
type PresentacionUnidad = (typeof PRESENTACION_UNIDADES)[number]['value'];

const esUnidad = (v: string): v is PresentacionUnidad =>
  PRESENTACION_UNIDADES.some(u => u.value === v);

/** "750 ml" → { valor: '750', unidad: 'ml' }. Cualquier otra forma → valor vacío. */
function splitNombre(nombre: string): { valor: string; unidad: PresentacionUnidad | null } {
  const match = /^(\d+)\s*(\S*)$/.exec((nombre || '').trim());
  if (!match) return { valor: '', unidad: null };
  const unidad = esUnidad(match[2]) ? match[2] : null;
  return { valor: match[1], unidad };
}

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
  const parsed = splitNombre(p.nombre);
  const [unidad, setUnidad] = useState<PresentacionUnidad>(parsed.unidad ?? 'ml');

  // Si el nombre viene armado desde fuera (ej. restore), adopta su unidad.
  useEffect(() => {
    if (parsed.unidad) setUnidad(parsed.unidad);
  }, [parsed.unidad]);

  const emitNombre = (valor: string, u: PresentacionUnidad) =>
    onUpdate('nombre', valor ? `${valor} ${u}` : '');

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
        <div className='flex h-11 items-stretch overflow-hidden rounded-full border border-gray-300 bg-gray-100 transition-colors hover:border-gray-400 focus-within:border-black dark:border-gray-700 dark:bg-slate-900/50 dark:hover:border-gray-500 dark:focus-within:border-white'>
          <div className='relative group flex-1 min-w-0'>
            <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
              <Boxes className='w-4 h-4' />
            </span>
            <Input
              value={parsed.valor}
              onChange={e => emitNombre(e.target.value.replace(/\D/g, ''), unidad)}
              placeholder='Ej: 750'
              inputMode='numeric'
              aria-label='Cantidad de la presentación'
              disabled={isLoading}
              className='h-full rounded-none border-0 bg-transparent pl-11 pr-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0'
            />
          </div>
          <div aria-hidden='true' className='w-px shrink-0 bg-gray-300 dark:bg-gray-700' />
          <Select
            value={unidad}
            onValueChange={(v: string) => {
              if (!esUnidad(v)) return;
              setUnidad(v);
              emitNombre(parsed.valor, v);
            }}
          >
            <SelectTrigger
              className='h-full w-28 shrink-0 rounded-none border-0 bg-transparent px-3 shadow-none focus:border-0 focus-visible:ring-0 hover:bg-gray-200/60 dark:bg-transparent dark:hover:bg-white/5'
              aria-label='Unidad de la presentación'
              disabled={isLoading}
            >
              <span className='flex items-center gap-1.5 font-medium'>
                <Ruler className='w-3.5 h-3.5 shrink-0 text-gray-400' aria-hidden='true' />
                {unidad}
              </span>
            </SelectTrigger>
            <SelectContent>
              {PRESENTACION_UNIDADES.map(u => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label} <span className='text-gray-400 dark:text-gray-500'>({u.value})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
