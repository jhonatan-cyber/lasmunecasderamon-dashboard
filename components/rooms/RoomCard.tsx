'use client';

import React, { useState } from 'react';
import { Room } from '@/types/room';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  DollarSign,
  Percent,
  MoreVertical,
  Edit,
  Trash2,
  Check,
  Power,
  Users,
  GripVertical,
  Home,
  CalendarDays,
  AlertTriangle
} from 'lucide-react';
import ConfirmDeleteRoomDialog from '@/components/rooms/ConfirmDeleteRoomDialog';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatShortDmyDateEs } from '@/lib/utils/calendarUtils';
import { esHabitacionSoloVentas } from '@/lib/business/habitaciones';

const RoomCard: React.FC<{
  room: Room;
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
  onActivate: (room: Room) => void;
  onDeactivate: (room: Room) => void;
  onOccupy: (room: Room) => void;
  isDraggable?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canActivate?: boolean;
  canDeactivate?: boolean;
  canOccupy?: boolean;
  canLiberate?: boolean;
  isMutating?: boolean;
}> = ({
  room,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onOccupy,
  isDraggable = false,
  canEdit = true,
  canDelete = true,
  canActivate = true,
  canDeactivate = true,
  canOccupy = true,
  canLiberate = true,
  isMutating = false
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Habitación sin precio, comisión ni duración: solo se usa en ventas con
  // habitación, así que no se ofrece para ocupar.
  const soloVentas = esHabitacionSoloVentas(room);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: room.id,
    disabled: !isDraggable
  });

  const style = isDraggable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
      }
    : {};

  const getStatusColor = () => {
    switch (room.status) {
      case 1:
        return 'bg-emerald-500';
      case 2:
        return 'bg-amber-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (room.status) {
      case 1:
        return 'Disponible';
      case 2:
        return 'Ocupada';
      default:
        return 'Inactiva';
    }
  };

  return (
    <div className='group' ref={isDraggable ? setNodeRef : undefined} style={style}>
      {/* isolate: crea el stacking context que permite el watermark tras el contenido. */}
      <div className='border border-gray-200 bg-white rounded-2xl p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden isolate dark:border-slate-800 dark:bg-slate-900'>
        {/* Barra de estado superior */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor()}`} />

        {/* Watermark decorativo: casa detrás del contenido del card. */}
        <Home
          aria-hidden
          strokeWidth={1.25}
          className='pointer-events-none absolute -right-8 -bottom-10 -z-10 h-36 w-36 text-gray-100/80 dark:text-slate-800/60'
        />

        <div className='flex items-start justify-between gap-2 mb-4'>
          <div className='flex items-center gap-3 min-w-0'>
            {isDraggable && (
              <Button
                type='button'
                {...attributes}
                {...listeners}
                aria-label='Reordenar habitación'
                variant='ghost'
                size='icon'
                className='w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 shrink-0 cursor-grab active:cursor-grabbing transition-colors'
              >
                <GripVertical className='w-4 h-4 text-gray-500 dark:text-slate-400' />
              </Button>
            )}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                room.status === 1
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : room.status === 2
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Home className='w-4 h-4' />
            </div>
            <div className='min-w-0'>
              <h3 className='font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate leading-tight'>
                {room.name}
              </h3>
              <span
                className={`mt-1 inline-flex items-center gap-1.5 text-xs font-medium ${
                  room.status === 1
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : room.status === 2
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-gray-500 dark:text-slate-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
                {getStatusText()}
              </span>
            </div>
          </div>

          {}
          {(canEdit || canDelete || canActivate || canDeactivate || canOccupy || canLiberate) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label='Más acciones'
                  className={`transition-opacity h-7 w-7 rounded-lg shrink-0 ${isDraggable ? 'opacity-0 group-hover:opacity-100' : ''}`}
                >
                  <MoreVertical className='h-3 w-3' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-36'>
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(room)} className='text-xs'>
                    <Edit className='mr-2 h-3 w-3' />
                    Editar
                  </DropdownMenuItem>
                )}

                {room.status === 1 && canOccupy && !soloVentas && (
                  <DropdownMenuItem onClick={() => onOccupy(room)} className='text-xs'>
                    <Users className='mr-2 h-3 w-3' />
                    Ocupar
                  </DropdownMenuItem>
                )}

                {room.status === 1 && canDeactivate ? (
                  <DropdownMenuItem onClick={() => onDeactivate(room)} className='text-xs'>
                    <Power className='mr-2 h-3 w-3' />
                    Desactivar
                  </DropdownMenuItem>
                ) : (room.status === 0 && canActivate) || (room.status === 2 && canLiberate) ? (
                  <DropdownMenuItem onClick={() => onActivate(room)} className='text-xs'>
                    <Check className='mr-2 h-3 w-3' />
                    {room.status === 2 ? 'Liberar' : 'Activar'}
                  </DropdownMenuItem>
                ) : null}

                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => setConfirmOpen(true)}
                    className='text-red-600 focus:text-red-600 text-xs'
                  >
                    <Trash2 className='mr-2 h-3 w-3' />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <dl className='grid grid-cols-3 divide-x divide-gray-100 dark:divide-slate-800 mb-4'>
          <div className='min-w-0 pr-2 sm:pr-3'>
            <dt className='flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500'>
              <DollarSign className='w-3 h-3 shrink-0' />
              Precio
            </dt>
            <dd
              className={`mt-1 text-sm font-bold truncate ${
                room.price > 0
                  ? 'text-gray-900 dark:text-gray-100'
                  : 'text-gray-400 dark:text-slate-500'
              }`}
            >
              {room.price > 0 ? formatCurrencyCLP(room.price) : '—'}
            </dd>
          </div>
          <div className='min-w-0 px-2 sm:px-3'>
            <dt className='flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500'>
              <Percent className='w-3 h-3 shrink-0' />
              Comisión
            </dt>
            <dd
              className={`mt-1 text-sm font-bold truncate ${
                room.comision_anfitriona
                  ? 'text-gray-900 dark:text-gray-100'
                  : 'text-gray-400 dark:text-slate-500'
              }`}
            >
              {room.comision_anfitriona ? formatCurrencyCLP(room.comision_anfitriona) : 'Sin'}
            </dd>
          </div>
          <div className='min-w-0 pl-2 sm:pl-3'>
            <dt className='flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500'>
              <Clock className='w-3 h-3 shrink-0' />
              Duración
            </dt>
            <dd
              className={`mt-1 text-sm font-bold truncate ${
                room.time > 0
                  ? 'text-gray-900 dark:text-gray-100'
                  : 'text-gray-400 dark:text-slate-500'
              }`}
            >
              {room.time > 0 ? `${room.time} min` : '—'}
            </dd>
          </div>
        </dl>

        {/* Pie: aviso de habitación solo para ventas + fecha de alta */}
        <div className='pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2 min-h-[2rem]'>
          {soloVentas ? (
            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wide'>
              <AlertTriangle className='w-3 h-3' />
              Solo ventas
            </span>
          ) : (
            <span />
          )}
          {room.fecha_crea && (
            <span className='inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 shrink-0'>
              <CalendarDays className='w-3 h-3' />
              {formatShortDmyDateEs(room.fecha_crea)}
            </span>
          )}
        </div>
      </div>

      <ConfirmDeleteRoomDialog
        open={confirmOpen}
        room={room}
        onOpenChange={setConfirmOpen}
        onConfirm={r => onDelete(r)}
        isLoading={isMutating}
      />
    </div>
  );
};

export default RoomCard;
