'use client';

import { Input } from '@/components/ui/input';

/**
 * Ml de la colación de una botella. Lo comparten la ficha de Configuración y el
 * modal de transferencia: cuando el corto de anfitriona ya define bebida y
 * acompañamiento se muestran esos ml, y si no se piden a mano (vacío = capacidad
 * de la botella).
 */
export interface ColacionFieldsProps {
  /** Prefijo de los ids para no chocar con otros formularios abiertos. */
  idPrefix: 'settings' | 'transfer';
  mlColacion: string;
  onMlColacionChange: (value: string) => void;
  /** Ml heredados del corto de anfitriona; null = no hay herencia. */
  mlColacionSugerido: number | null;
  /** Analcohólicas y cigarrillos solo venden botella: sin acompañamiento. */
  mostrarAcompanamiento: boolean;
  mlAcompanamiento: string;
  onMlAcompanamientoChange: (value: string) => void;
  mlAcompanamientoSugerido: number | null;
  /** Capacidad de la botella, solo para el placeholder sin herencia. */
  mlBotellaSugerida?: number | null;
  saving: boolean;
}

export function ColacionFields({
  idPrefix,
  mlColacion,
  onMlColacionChange,
  mlColacionSugerido,
  mostrarAcompanamiento,
  mlAcompanamiento,
  onMlAcompanamientoChange,
  mlAcompanamientoSugerido,
  mlBotellaSugerida,
  saving
}: ColacionFieldsProps) {
  const heredada =
    mostrarAcompanamiento && mlColacionSugerido !== null && mlAcompanamientoSugerido !== null;
  const soloDigitos = (value: string) => value.replace(/\D/g, '');
  const capacidad = Number(mlBotellaSugerida ?? 0);
  const placeholderBotella = capacidad > 0 ? String(capacidad) : 'Ej. 350';

  return (
    <section aria-label='Colación' className='mt-5 space-y-4'>
      {heredada ? (
        <dl
          aria-label='Colación configurada en el corto'
          className='flex flex-wrap gap-x-8 gap-y-3 text-sm'
        >
          <div>
            <dt className='text-xs text-muted-foreground'>Bebida</dt>
            <dd className='font-semibold tabular-nums'>{mlColacionSugerido} ml</dd>
          </div>
          <div>
            <dt className='text-xs text-muted-foreground'>Acompañamiento</dt>
            <dd className='font-semibold tabular-nums'>{mlAcompanamientoSugerido} ml</dd>
          </div>
        </dl>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-2'>
            <label htmlFor={`${idPrefix}-ml-colacion`} className='text-sm font-medium'>
              Ml de la colación
            </label>
            <Input
              id={`${idPrefix}-ml-colacion`}
              value={mlColacion}
              onChange={event => onMlColacionChange(soloDigitos(event.target.value))}
              placeholder={
                mlColacionSugerido !== null ? String(mlColacionSugerido) : placeholderBotella
              }
              inputMode='numeric'
              disabled={saving}
              className='h-12 tabular-nums'
            />
            <p className='text-xs text-muted-foreground'>
              {mlColacionSugerido !== null
                ? `Vacío = ${mlColacionSugerido} ml del corto de anfitriona.`
                : 'Vacío = capacidad de la botella.'}
            </p>
          </div>
          {mostrarAcompanamiento && (
            <div className='space-y-2'>
              <label
                htmlFor={`${idPrefix}-ml-acompanamiento-colacion`}
                className='text-sm font-medium'
              >
                Ml de acompañamiento
              </label>
              <Input
                id={`${idPrefix}-ml-acompanamiento-colacion`}
                value={mlAcompanamiento}
                onChange={event => onMlAcompanamientoChange(soloDigitos(event.target.value))}
                placeholder={
                  mlAcompanamientoSugerido !== null
                    ? String(mlAcompanamientoSugerido)
                    : 'Sin acompañamiento'
                }
                inputMode='numeric'
                disabled={saving}
                className='h-12 tabular-nums'
              />
              <p className='text-xs text-muted-foreground'>
                {mlAcompanamientoSugerido !== null
                  ? `Vacío = ${mlAcompanamientoSugerido} ml del corto de anfitriona.`
                  : 'Ml de bebida analcohólica por colación. Vacío = sin acompañamiento.'}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
