'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
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

  // Al quitar la foto se limpia el input: elegir el mismo archivo otra vez
  // tiene que volver a disparar `change`.
  useEffect(() => {
    if (!value && inputRef.current) inputRef.current.value = '';
  }, [value]);

  const adjuntar = async (file: File | undefined) => {
    if (!file) {
      onChange(null);
      return;
    }
    const resultado = await leerBaucher(file);
    if ('error' in resultado) {
      setError(resultado.error);
      onChange(null);
      return;
    }
    setError(null);
    onChange(resultado.foto);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className='flex flex-wrap items-center gap-3'>
        <Input
          id={id}
          ref={inputRef}
          type='file'
          accept={BAUCHER_MIME_TYPES.join(',')}
          capture='environment'
          onChange={event => void adjuntar(event.target.files?.[0])}
          className='max-w-full sm:max-w-xs'
        />
        {value && (
          <div className='flex items-center gap-2'>
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local del archivo elegido */}
            <img
              src={value}
              alt='Vista previa del baucher'
              className='h-14 w-14 rounded-lg border object-cover'
            />
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='rounded-full'
              onClick={() => {
                onChange(null);
                setError(null);
              }}
            >
              <X className='mr-1 h-4 w-4' aria-hidden='true' />
              Quitar foto
            </Button>
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
    </div>
  );
}
