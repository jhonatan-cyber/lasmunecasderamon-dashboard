'use client';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Boxes, Ruler } from 'lucide-react';

export const PRESENTACION_UNIDADES = [
  { value: 'ml', label: 'Mililitros' },
  { value: 'cc', label: 'Centímetros cúbicos' },
  { value: 'oz', label: 'Onzas' },
  { value: 'un', label: 'Unidades' }
] as const;

export type PresentacionUnidad = (typeof PRESENTACION_UNIDADES)[number]['value'];

export const esUnidad = (v: string): v is PresentacionUnidad =>
  PRESENTACION_UNIDADES.some(u => u.value === v);

/** "750 ml" → { valor: '750', unidad: 'ml' }. Cualquier otra forma → valor vacío. */
export function splitNombre(nombre: string): { valor: string; unidad: PresentacionUnidad | null } {
  const match = /^(\d+)\s*(\S*)$/.exec((nombre || '').trim());
  if (!match) return { valor: '', unidad: null };
  const unidad = esUnidad(match[2]) ? match[2] : null;
  return { valor: match[1], unidad };
}

interface PresentacionNombreInputProps {
  /** El string completo, ej. "750 ml" */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

export function PresentacionNombreInput({
  value,
  onChange,
  disabled,
  id
}: PresentacionNombreInputProps) {
  const parsed = splitNombre(value);
  const [unidad, setUnidad] = useState<PresentacionUnidad>(parsed.unidad ?? 'ml');

  // Sincroniza la unidad local si el valor externo la cambia (ej. restore desde fuera).
  useEffect(() => {
    if (parsed.unidad) setUnidad(parsed.unidad);
  }, [parsed.unidad]);

  const emitNombre = (valor: string, u: PresentacionUnidad) =>
    onChange(valor ? `${valor} ${u}` : '');

  return (
    <div className='flex h-11 items-stretch overflow-hidden rounded-full border border-gray-300 bg-gray-100 transition-colors hover:border-gray-400 focus-within:border-black dark:border-gray-700 dark:bg-slate-900/50 dark:hover:border-gray-500 dark:focus-within:border-white'>
      <div className='relative group flex-1 min-w-0'>
        <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
          <Boxes className='w-4 h-4' />
        </span>
        <Input
          id={id}
          value={parsed.valor}
          onChange={e => emitNombre(e.target.value.replace(/\D/g, ''), unidad)}
          placeholder='Ej: 750'
          inputMode='numeric'
          aria-label='Cantidad de la presentación'
          disabled={disabled}
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
          disabled={disabled}
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
  );
}
