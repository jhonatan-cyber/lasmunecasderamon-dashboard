'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, LoaderCircle, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BAUCHER_ARCHIVO_MAX_BYTES,
  BAUCHER_MIME_TYPES,
  esBaucherDataUrlValido
} from '@/lib/business/baucher';
import { cn } from '@/lib/utils/utils';

interface BaucherFileInputProps {
  /** `id` del input y del `<label>` que lo acompaña. */
  id: string;
  /** Foto elegida como data URL, o `null` si todavía no hay. */
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  /** Texto de ayuda bajo el control (se reemplaza por el error si lo hay). */
  hint?: string;
  className?: string;
}

/** Convierte el archivo elegido en la data URL que viaja en el payload. */
function leerArchivoComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

/**
 * Valida el archivo con el mismo contrato que el servidor antes de leerlo: un
 * archivo que no pase acá lo rechazaría la ruta con un 400.
 */
async function leerBaucher(file: File): Promise<{ foto: string } | { error: string }> {
  if (!BAUCHER_MIME_TYPES.includes(file.type as (typeof BAUCHER_MIME_TYPES)[number]))
    return { error: 'El baucher debe ser una foto JPG, PNG o WebP' };
  // El mismo tope que valida el servidor (≈3 MB de imagen → 4M de base64).
  if (file.size > BAUCHER_ARCHIVO_MAX_BYTES)
    return { error: 'La foto del baucher pesa demasiado: vuelve a tomarla' };
  try {
    const dataUrl = await leerArchivoComoDataUrl(file);
    if (!esBaucherDataUrlValido(dataUrl))
      return { error: 'La foto del baucher no es una imagen válida' };
    return { foto: dataUrl };
  } catch {
    return { error: 'No se pudo leer la foto del baucher' };
  }
}

/**
 * Foto del baucher de un pago con transferencia.
 *
 * En el teléfono `capture` abre la cámara directamente; en el escritorio deja
 * elegir un archivo. El componente sólo entrega la data URL al formulario: la
 * regla de exigirla cuando el pago es transferencia vive en cada pantalla.
 */
export function BaucherFileInput({
  id,
  value,
  onChange,
  label = 'Foto del baucher',
  hint,
  className
}: BaucherFileInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);

  // Al quitar la foto se limpia el input: elegir el mismo archivo otra vez
  // tiene que volver a disparar `change`.
  useEffect(() => {
    if (!value && inputRef.current) inputRef.current.value = '';
  }, [value]);

  const adjuntar = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setIsReading(true);
    try {
      const resultado = await leerBaucher(file);
      if ('error' in resultado) {
        setError(resultado.error);
        onChange(null);
        return;
      }
      onChange(resultado.foto);
    } finally {
      setIsReading(false);
    }
  };

  return (
    <div className={cn('space-y-2.5', className)}>
      <Label htmlFor={id} className='text-sm font-semibold'>
        {label}
      </Label>
      <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch'>
        <div
          role='button'
          tabIndex={0}
          aria-label={`Seleccionar ${label.toLocaleLowerCase()}`}
          onClick={() => inputRef.current?.click()}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={event => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={event => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={event => {
            event.preventDefault();
            setIsDragging(false);
            void adjuntar(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            'group relative flex min-h-28 cursor-pointer items-center gap-4 rounded-xl border border-dashed px-4 py-4 transition-colors',
            'border-neutral-300 bg-white hover:border-primary/60 hover:bg-primary/[0.03] dark:border-neutral-700 dark:bg-neutral-950 dark:hover:bg-primary/[0.06]',
            'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isDragging && 'border-primary bg-primary/[0.06] dark:bg-primary/[0.1]',
            isReading && 'pointer-events-none opacity-70'
          )}
        >
          <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            {isReading ? (
              <LoaderCircle className='h-5 w-5 animate-spin' aria-hidden='true' />
            ) : value ? (
              <Check className='h-5 w-5' aria-hidden='true' />
            ) : (
              <ImagePlus className='h-5 w-5' aria-hidden='true' />
            )}
          </span>
          <span className='min-w-0 flex-1'>
            <span className='block text-sm font-medium text-foreground'>
              {isReading ? 'Cargando imagen…' : value ? 'Imagen lista' : 'Sube el comprobante'}
            </span>
            <span className='mt-1 block text-xs leading-relaxed text-muted-foreground'>
              {value
                ? 'Puedes elegir otra imagen o arrastrarla aquí.'
                : 'Arrastra una imagen hasta aquí o selecciónala desde tu dispositivo.'}
            </span>
            <span className='mt-1.5 block text-[11px] text-muted-foreground'>
              JPG, PNG o WebP · máximo 3 MB
            </span>
          </span>
        </div>
        <Input
          id={id}
          ref={inputRef}
          type='file'
          accept={BAUCHER_MIME_TYPES.join(',')}
          capture='environment'
          onChange={event => void adjuntar(event.target.files?.[0])}
          className='sr-only'
        />
        {value && (
          <div className='flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2.5 sm:min-w-48 sm:flex-col sm:items-stretch'>
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local del archivo elegido */}
            <img
              src={value}
              alt='Vista previa del baucher'
              className='h-16 w-16 shrink-0 rounded-lg border bg-background object-cover sm:h-24 sm:w-full'
            />
            <div className='flex flex-wrap gap-2 sm:flex-nowrap'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 flex-1 rounded-lg px-2 text-xs'
                onClick={() => inputRef.current?.click()}
              >
                <Upload className='mr-1 h-3.5 w-3.5' aria-hidden='true' />
                Cambiar
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-destructive'
                onClick={() => {
                  onChange(null);
                  setError(null);
                }}
              >
                <X className='mr-1 h-3.5 w-3.5' aria-hidden='true' />
                Quitar foto
              </Button>
            </div>
          </div>
        )}
      </div>
      {error ? (
        <p role='alert' className='text-xs text-red-500'>
          {error}
        </p>
      ) : hint ? (
        <p className='text-xs text-muted-foreground'>{hint}</p>
      ) : null}
      {!value && !error && !hint && (
        <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
          <Camera className='h-3.5 w-3.5' aria-hidden='true' />
          En el teléfono puedes tomar la foto directamente.
        </p>
      )}
    </div>
  );
}
