'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Home, User, CreditCard, Edit2, Save, X, Square } from 'lucide-react';
import { formatCurrencyNoDecimals, formatNumberInput, parseNumberInput, formatSoloFecha, formatSoloHora } from '@/lib/utils/formatters';
import { getServicioEstadoBadge } from './servicioCardUtils';

type DisplayData = {
  habitacion_numero?: string;
  codigo?: string;
  anfitrionas_nombres?: string;
  cliente_nombre?: string;
  creator_name?: string;
  precio_servicio?: number;
  precio_habitacion?: number;
  habitacion_comision?: number;
  iva?: number;
  total?: number;
  metodo_pago?: string;
  tiempo?: number;
  es_temporal?: boolean;
};

export function ServicioCardHeader({
  habitacionNumero,
  codigo,
  estado,
  isTemporaryActive,
  onEditClick,
  showEditButton
}: {
  habitacionNumero?: string;
  codigo?: string;
  estado: number;
  isTemporaryActive: boolean;
  onEditClick: () => void;
  showEditButton: boolean;
}) {
  return (
    <div className='flex flex-wrap items-start justify-between gap-3'>
      <div className='min-w-0 flex-1 space-y-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex items-center gap-2 rounded-full border border-zinc-200/70 bg-zinc-50/90 px-3 py-1.5 shadow-xs backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/70'>
            <Home className='h-4 w-4 text-zinc-500 dark:text-zinc-400' />
            <span className='text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50'>
              {habitacionNumero}
            </span>
          </div>
          {isTemporaryActive ? (
            <Badge className='rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 shadow-none dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'>
              Temporal
            </Badge>
          ) : (
            getServicioEstadoBadge(estado)
          )}
        </div>
        <div className='flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400'>
          <span className='rounded-full border border-dashed border-zinc-300/80 bg-white/70 px-2 py-1 font-mono text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300'>
            #{codigo}
          </span>
        </div>
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        {showEditButton && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onEditClick}
            className='h-9 w-9 rounded-full border border-zinc-200/70 p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50'
            title='Editar servicio'
          >
            <Edit2 className='h-3.5 w-3.5' />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ServicioCardTimerSection({
  isAdminOrCajero,
  isEditing,
  isTemporaryActive,
  displayTimer,
  isLowTime,
  editTiempo,
  setEditTiempo,
  isSaving,
  showAllServices,
  formatTime,
  remainingTime
}: {
  isAdminOrCajero: boolean;
  isEditing: boolean;
  isTemporaryActive: boolean;
  displayTimer: any;
  isLowTime: boolean;
  editTiempo: number;
  setEditTiempo: (v: number) => void;
  isSaving: boolean;
  showAllServices: boolean;
  formatTime: (v: number) => string;
  remainingTime: number;
}) {
  if (!isAdminOrCajero) return null;

  return (
    <div className='rounded-2xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-3 shadow-xs backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Clock
            className={`h-4 w-4 ${isLowTime ? 'text-red-500' : displayTimer?.isPaused ? 'text-amber-500' : isTemporaryActive ? 'text-sky-500' : 'text-zinc-500 dark:text-zinc-400'}`}
          />
          <span className='text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
            {isEditing
              ? 'Editando tiempo'
              : isTemporaryActive
                ? 'Timer temporal'
                : displayTimer?.isPaused
                  ? 'Pausado'
                  : 'Tiempo restante'}
          </span>
        </div>
        <div className='text-right'>
          {isEditing ? (
            <div className='flex items-center gap-2'>
              <Input
                type='number'
                value={editTiempo}
                onChange={e => setEditTiempo(Number(e.target.value))}
                className='h-9 w-20 rounded-full border-zinc-300/80 bg-white text-center text-sm shadow-xs dark:border-zinc-700 dark:bg-zinc-900'
                min={1}
                disabled={isSaving}
              />
              <span className='text-xs text-zinc-500 dark:text-zinc-400'>min</span>
            </div>
          ) : (
            <div className='flex items-center gap-2'>
              <span
                className={`font-mono text-2xl font-semibold leading-none tracking-tight ${isLowTime ? 'text-red-600 dark:text-red-400' : displayTimer?.isPaused ? 'text-amber-600 dark:text-amber-400' : isTemporaryActive ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-950 dark:text-zinc-50'}`}
              >
                {showAllServices
                  ? `${displayTimer?.duration ?? remainingTime}:00`
                  : displayTimer
                    ? formatTime(remainingTime)
                    : '00:00'}
              </span>

              {displayTimer?.isPaused && !isTemporaryActive && (
                <span className='rounded-full border border-amber-200 bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300'>
                  Pausado
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ServicioCardTemporaryTime({
  isTemporaryActive,
  isTemporal,
  mainFrozenRemainingTime,
  mainRemainingTime,
  formatTime
}: {
  isTemporaryActive: boolean;
  isTemporal: boolean;
  mainFrozenRemainingTime?: number;
  mainRemainingTime: number;
  formatTime: (v: number) => string;
}) {
  if (!isTemporaryActive || !isTemporal) return null;
  return (
    <div className='flex items-center justify-between rounded-2xl border border-sky-200/60 bg-sky-50/60 px-4 py-2 dark:border-sky-900/50 dark:bg-sky-950/20'>
      <span className='text-xs font-medium text-sky-700 dark:text-sky-300'>
        Tiempo congelado del principal
      </span>
      <span className='font-mono text-xs text-sky-600 dark:text-sky-200'>
        {formatTime(mainFrozenRemainingTime ?? mainRemainingTime)}
      </span>
    </div>
  );
}

export function ServicioCardInfo({
  clienteNombre,
  anfitrionas,
  creatorName,
  isTemporaryActive
}: {
  clienteNombre?: string;
  anfitrionas?: string | null;
  creatorName?: string;
  isTemporaryActive: boolean;
}) {
  return (
    <div className='grid grid-cols-1 gap-3 text-sm sm:grid-cols-2'>
      <div className='min-w-0'>
        <span className='block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
          Cliente
        </span>
        <span className='mt-1 block truncate font-medium text-zinc-900 dark:text-zinc-50'>
          {clienteNombre || 'Sin registrar'}
        </span>
      </div>

      <div className='min-w-0'>
        <span className='block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
          Anfitrionas
        </span>
        {anfitrionas ? (
          <div className='mt-1 flex flex-wrap gap-1.5'>
            {anfitrionas.split(', ').map((nick: string, index: number) => (
              <span
                key={index}
                className='inline-flex items-center rounded-full border border-zinc-200/70 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
              >
                {nick.trim()}
              </span>
            ))}
          </div>
        ) : (
          <span className='mt-1 block text-xs italic text-zinc-500 dark:text-zinc-400'>
            Sin asignar
          </span>
        )}
      </div>

      {creatorName && (
        <div className='sm:col-span-2 flex items-center gap-2 rounded-full border border-zinc-200/70 bg-zinc-50/80 px-3 py-2 text-sm text-zinc-700 shadow-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300'>
          <User className='h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500' />
          <span className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
            Creado por
          </span>
          <span className='min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-50'>
            {creatorName}
          </span>
        </div>
      )}
    </div>
  );
}

export function ServicioCardFinancial({
  isTemporaryActive,
  isEditing,
  editPrecio,
  setEditPrecio,
  isSaving,
  finalDisplayData
}: {
  isTemporaryActive: boolean;
  isEditing: boolean;
  editPrecio: number;
  setEditPrecio: (v: number) => void;
  isSaving: boolean;
  finalDisplayData: DisplayData;
}) {
  return (
    <div className='rounded-2xl border border-zinc-200/70 bg-zinc-50/70 px-4 py-3 shadow-none dark:border-zinc-800 dark:bg-zinc-900/45'>
      <div className='grid grid-cols-2 gap-x-4 gap-y-3 text-xs md:grid-cols-4'>
        <div className='min-w-0 space-y-1'>
          <span className='block text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
            Servicio
          </span>
          {isEditing ? (
            <Input
              type='text'
              inputMode='numeric'
              value={editPrecio ? formatNumberInput(editPrecio) : ''}
              onChange={e => setEditPrecio(parseNumberInput(e.target.value))}
              className='h-8 w-full rounded-full text-xs'
              disabled={isSaving}
            />
          ) : (
            <span className={`block font-semibold leading-tight ${isTemporaryActive ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-950 dark:text-zinc-50'}`}>
              {formatCurrencyNoDecimals(finalDisplayData.precio_servicio || 0)}
              {isTemporaryActive && <span className='ml-1 text-sky-500'>*</span>}
            </span>
          )}
        </div>
        <div className='min-w-0 space-y-1'>
          <span className='block text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
            Habitación
          </span>
          <span className={`block font-semibold leading-tight ${isTemporaryActive ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-950 dark:text-zinc-50'}`}>
            {formatCurrencyNoDecimals(finalDisplayData.precio_habitacion || 0)}
            {isTemporaryActive && <span className='ml-1 text-sky-500'>*</span>}
          </span>
        </div>
        <div className='min-w-0 space-y-1'>
          <span className='block text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
            Comisión
          </span>
          <span className={`block font-semibold leading-tight ${isTemporaryActive ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
            {finalDisplayData.habitacion_comision && finalDisplayData.habitacion_comision > 0
              ? formatCurrencyNoDecimals(finalDisplayData.habitacion_comision)
              : '$0'}
          </span>
        </div>
        <div className='min-w-0 space-y-1'>
          <span className='block text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
            IVA
          </span>
          <span className={`block font-semibold leading-tight text-zinc-700 dark:text-zinc-300 ${isTemporaryActive ? 'text-sky-600 dark:text-sky-400' : ''}`}>
            {finalDisplayData.iva && finalDisplayData.iva > 0
              ? formatCurrencyNoDecimals(finalDisplayData.iva)
              : '$0'}
            {isTemporaryActive && <span className='ml-1 text-sky-500'>*</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ServicioCardSummary({
  isTemporaryActive,
  finalDisplayData,
  fechaCreacion
}: {
  isTemporaryActive: boolean;
  finalDisplayData: DisplayData;
  fechaCreacion?: string;
}) {
  return (
    <div className='flex items-end justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50'>
      <div className='text-xs text-zinc-500 dark:text-zinc-400'>
        <div>{formatSoloFecha(fechaCreacion || '')}</div>
        <div>{formatSoloHora(fechaCreacion || '')}</div>
      </div>
      <div className='text-right'>
        <div className={`text-xl font-bold leading-none ${isTemporaryActive ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-950 dark:text-zinc-50'}`}>
          {formatCurrencyNoDecimals(finalDisplayData.total || 0)}
          {isTemporaryActive && <span className='ml-1 text-sky-500'>*</span>}
        </div>
        <div className='mt-1 flex items-center justify-end gap-1 text-xs text-zinc-500 dark:text-zinc-400'>
          <CreditCard className='h-3 w-3' />
          <span className='capitalize'>{finalDisplayData.metodo_pago || 'efectivo'}</span>
        </div>
      </div>
    </div>
  );
}

export function ServicioCardActions({
  isEditing,
  isSaving,
  onCancelEdit,
  onSaveEdit,
  canStop,
  onStopTimer
}: {
  isEditing: boolean;
  isSaving: boolean;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  canStop: boolean;
  onStopTimer: () => void;
}) {
  return (
    <div className='flex items-center justify-end gap-2 pt-1'>
      {isEditing && (
        <>
          <Button
            size='sm'
            variant='ghost'
            onClick={onCancelEdit}
            disabled={isSaving}
            className='rounded-full border border-zinc-200/80 bg-white/70 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/80'
          >
            <X className='h-3 w-3 text-zinc-600 dark:text-zinc-400' />
          </Button>
          <Button size='sm' onClick={onSaveEdit} disabled={isSaving} className='rounded-full'>
            <Save className='mr-1 h-3 w-3' />
            Guardar
          </Button>
        </>
      )}
      {canStop && (
        <Button
          size='sm'
          variant='outline'
          onClick={onStopTimer}
          className='rounded-full border-red-200/80 px-4 text-red-600 shadow-xs hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/20'
        >
          <Square className='mr-1 h-3 w-3' />
          Finalizar
        </Button>
      )}
    </div>
  );
}
