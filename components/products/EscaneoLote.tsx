'use client';

import { Bell, BellOff, Clock, Eraser, PackageCheck, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';
import { MOTIVO_ENVASE, type EscaneoEnvase } from '@/hooks/productos/useContainerScan';

interface EscaneoLoteProps {
  aceptados: number;
  rechazados: number;
  /** Escaneos en cola local sin verificar (sin conexión). */
  enCola: number;
  /** Escaneos de la sesión, lo más reciente primero. */
  sesion: EscaneoEnvase[];
  /** true mientras se drena la cola contra el servidor. */
  sincronizando: boolean;
  sonido: boolean;
  onAlternarSonido: () => void;
  onLimpiar: () => void;
  onReintentar: () => void;
  /** Cómo se llama lo aceptado en este paso (Entregado / Recibido). */
  etiquetaAceptado: string;
  /** Título del contador de aceptados. */
  tituloAceptados: string;
}

/**
 * Panel del escaneo continuo: contadores del lote en curso (aceptados,
 * rechazados y los que siguen en cola local sin conexión), lista de repaso con
 * el motivo de cada rechazo y el interruptor del aviso sonoro. Es el mismo en
 * los dos pasos del control (entrega del bar y recepción del almacén); solo
 * cambian los rótulos.
 */
export function EscaneoLote({
  aceptados,
  rechazados,
  enCola,
  sesion,
  sincronizando,
  sonido,
  onAlternarSonido,
  onLimpiar,
  onReintentar,
  etiquetaAceptado,
  tituloAceptados
}: EscaneoLoteProps) {
  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400'>
          Escaneo continuo de esta sesión
        </p>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='rounded-full flex items-center gap-1.5'
            onClick={onAlternarSonido}
            aria-pressed={sonido}
          >
            {sonido ? <Bell className='w-3.5 h-3.5' /> : <BellOff className='w-3.5 h-3.5' />}
            {sonido ? 'Aviso sonoro' : 'Sin aviso'}
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='rounded-full flex items-center gap-1.5'
            onClick={onLimpiar}
            disabled={aceptados + rechazados === 0}
            title='Los escaneos pendientes de sincronizar se conservan.'
          >
            <Eraser className='w-3.5 h-3.5' />
            Limpiar
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-3 gap-3'>
        <div className='p-3 rounded-2xl bg-green-50 border border-green-200'>
          <p className='text-[10px] font-black uppercase tracking-widest text-green-700'>
            {tituloAceptados}
          </p>
          <p className='mt-1 text-2xl font-bold text-green-800'>{aceptados}</p>
        </div>
        <div
          className={cn(
            'p-3 rounded-2xl border',
            rechazados > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-white border-gray-200 dark:bg-slate-900/40 dark:border-gray-800'
          )}
        >
          <p
            className={cn(
              'text-[10px] font-black uppercase tracking-widest',
              rechazados > 0 ? 'text-red-700' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            Rechazados
          </p>
          <p
            className={cn(
              'mt-1 text-2xl font-bold',
              rechazados > 0 ? 'text-red-800' : 'text-gray-900 dark:text-white'
            )}
          >
            {rechazados}
          </p>
        </div>
        <div
          className={cn(
            'p-3 rounded-2xl border',
            enCola > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-white border-gray-200 dark:bg-slate-900/40 dark:border-gray-800'
          )}
        >
          <p
            className={cn(
              'text-[10px] font-black uppercase tracking-widest',
              enCola > 0 ? 'text-amber-700' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            En cola
          </p>
          <div className='mt-1 flex items-center justify-between gap-2'>
            <p
              className={cn(
                'text-2xl font-bold',
                enCola > 0 ? 'text-amber-800' : 'text-gray-900 dark:text-white'
              )}
            >
              {enCola}
            </p>
            {enCola > 0 && (
              <Button
                variant='outline'
                size='sm'
                className='rounded-full flex items-center gap-1.5'
                onClick={onReintentar}
                disabled={sincronizando}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', sincronizando && 'animate-spin')} />
                {sincronizando ? 'Sincronizando' : 'Reintentar'}
              </Button>
            )}
          </div>
          <p className='mt-1 text-[10px] text-amber-700'>
            {sincronizando
              ? 'Verificando contra el servidor...'
              : 'Guardados sin conexión; se verifican al reconectar'}
          </p>
        </div>
      </div>

      {sesion.length === 0 ? (
        <p className='text-xs text-gray-500 dark:text-gray-400 text-center py-2'>
          Todavía no escaneas envases en esta sesión.
        </p>
      ) : (
        <ul
          aria-label='Últimos escaneos de la sesión'
          className='max-h-56 overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900/40 divide-y divide-gray-100 dark:divide-gray-800'
        >
          {sesion.map(escaneo => (
            <li key={escaneo.id} className='flex items-center gap-2 px-3 py-2 text-xs sm:text-sm'>
              {escaneo.ok === null ? (
                <Clock className='w-4 h-4 text-amber-600 shrink-0' />
              ) : escaneo.ok ? (
                <PackageCheck className='w-4 h-4 text-green-600 shrink-0' />
              ) : (
                <XCircle className='w-4 h-4 text-red-600 shrink-0' />
              )}
              <span className='font-mono'>{escaneo.codigo}</span>
              <span
                className={cn(
                  'font-medium',
                  escaneo.ok === null
                    ? 'text-amber-700'
                    : escaneo.ok
                      ? 'text-green-700'
                      : 'text-red-700'
                )}
                title={escaneo.mensaje}
              >
                {escaneo.ok === null
                  ? 'En cola'
                  : escaneo.ok
                    ? etiquetaAceptado
                    : (MOTIVO_ENVASE[escaneo.motivo ?? ''] ?? 'Rechazado')}
              </span>
              <span className='ml-auto text-gray-400 whitespace-nowrap'>{escaneo.hora}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
