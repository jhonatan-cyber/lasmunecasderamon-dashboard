import React, { useState, useMemo } from "react";
import { Room } from "@/types/room";
import { MoreVertical, Edit, Trash2, Check, Power, Bed, GripVertical } from "lucide-react";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDeleteRoomDialog from "@/components/rooms/ConfirmDeleteRoomDialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RoomTableProps {
  rooms: Room[];
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
  onActivate: (room: Room) => void;
  onDeactivate: (room: Room) => void;
  onOccupy: (room: Room) => void;
  onReorder?: (rooms: Room[]) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canActivate?: boolean;
  canDeactivate?: boolean;
  canOccupy?: boolean;
  canLiberate?: boolean;
}

interface SortableRowProps {
  room: Room;
  index: number;
  onEdit: (room: Room) => void;
  onActivate: (room: Room) => void;
  onDeactivate: (room: Room) => void;
  onOccupy: (room: Room) => void;
  setRoomToDelete: (room: Room) => void;
  setConfirmOpen: (open: boolean) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canActivate?: boolean;
  canDeactivate?: boolean;
  canOccupy?: boolean;
  canLiberate?: boolean;
}

const SortableRow: React.FC<SortableRowProps> = ({
  room,
  index,
  onEdit,
  onActivate,
  onDeactivate,
  onOccupy,
  setRoomToDelete,
  setConfirmOpen,
  canEdit = true,
  canDelete = true,
  canActivate = true,
  canDeactivate = true,
  canOccupy = true,
  canLiberate = true
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: room.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className='border-b last:border-b-0 hover:bg-gray-50'>
      <td className='py-3 px-2 sm:px-4 text-center'>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing inline-flex items-center justify-center hover:bg-gray-100 rounded p-1"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      </td>
      <td className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600'>
        {index + 1}
      </td>
      <td className='py-3 px-2 sm:px-4 text-center'>
        <span className='font-medium text-gray-900 text-xs sm:text-sm'>{room.name}</span>
      </td>
      <td className='py-3 px-2 sm:px-4 text-center'>
        <span className='font-medium text-gray-900 text-xs sm:text-sm'>
          ${room.price.toLocaleString('es-CL')}
        </span>
      </td>
      <td className='py-3 px-2 sm:px-4 text-center'>
        <span className='text-gray-600 text-xs sm:text-sm'>{room.time} min</span>
      </td>
      <td className='py-3 px-2 sm:px-4 text-center'>
        <span className='text-gray-600 text-xs sm:text-sm'>
          {room.comision_anfitriona ? `$${room.comision_anfitriona.toLocaleString('es-CL')}` : 'N/A'}
        </span>
      </td>
      <td className='py-3 px-2 sm:px-4 text-center'>
        <Badge
          variant='secondary'
          className={
            room.status === 1
              ? 'bg-green-100 text-green-800 text-xs sm:text-sm'
              : room.status === 2
              ? 'bg-red-100 text-red-800 text-xs sm:text-sm'
              : 'bg-gray-100 text-gray-800 text-xs sm:text-sm'
          }
        >
          {room.status === 1
            ? 'Disponible'
            : room.status === 2
            ? 'Ocupada'
            : 'Inactiva'}
        </Badge>
      </td>
      <td className='py-3 px-2 sm:px-4 text-center'>
        {/* Solo mostrar el menú si tiene al menos un permiso */}
        {(canEdit || canDelete || canActivate || canDeactivate || canOccupy || canLiberate) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='bg-white hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full hover:scale-105 transition-all duration-200'
              >
                <MoreVertical className='h-3 w-3 sm:h-4 sm:w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
            {canEdit && (
              <DropdownMenuItem onClick={() => onEdit(room)}>
                <Edit className='mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                Editar
              </DropdownMenuItem>
            )}
            {room.status === 0 && canActivate ? (
              <DropdownMenuItem onClick={() => onActivate(room)}>
                <Check className='mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                Activar
              </DropdownMenuItem>
            ) : room.status === 1 ? (
              <>
                {canOccupy && (
                  <DropdownMenuItem onClick={() => onOccupy(room)}>
                    <Bed className='mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                    Ocupar
                  </DropdownMenuItem>
                )}
                {canDeactivate && (
                  <DropdownMenuItem onClick={() => onDeactivate(room)}>
                    <Power className='mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                    Desactivar
                  </DropdownMenuItem>
                )}
              </>
            ) : room.status === 2 && canLiberate ? (
              <DropdownMenuItem onClick={() => onActivate(room)}>
                <Check className='mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                Liberar
              </DropdownMenuItem>
            ) : null}
            {canDelete && (
              <DropdownMenuItem
                onClick={() => {
                  setRoomToDelete(room);
                  setConfirmOpen(true);
                }}
                className='text-red-600 focus:text-red-600'
              >
                <Trash2 className='mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        ) : (
          <span className='text-xs text-gray-400'>Sin acciones</span>
        )}
      </td>
    </tr>
  );
};

const RoomTable: React.FC<RoomTableProps> = ({
  rooms,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onOccupy,
  onReorder,
  canEdit = true,
  canDelete = true,
  canActivate = true,
  canDeactivate = true,
  canOccupy = true,
  canLiberate = true
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [localRooms, setLocalRooms] = useState(rooms);

  // Actualizar localRooms cuando rooms cambia
  React.useEffect(() => {
    setLocalRooms(rooms);
  }, [rooms]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localRooms.findIndex((r) => r.id === active.id);
      const newIndex = localRooms.findIndex((r) => r.id === over.id);

      const newRooms = arrayMove(localRooms, oldIndex, newIndex);
      setLocalRooms(newRooms);

      // Llamar al callback de reordenamiento si está disponible
      if (onReorder) {
        onReorder(newRooms);
      }
    }
  };

  return (
    <TooltipProvider>
      <div className='rounded-xl border bg-white overflow-hidden shadow-md'>
        <div className='overflow-x-auto'>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className='min-w-full text-base bg-white rounded-xl overflow-hidden text-center'>
              <thead className='border-b last:border-b-0 bg-white group'>
                <tr>
                  <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400 w-12'></th>
                  <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>#</th>
                  <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                    Nombre
                  </th>
                  <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                    Precio
                  </th>
                  <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                    Tiempo
                  </th>
                  <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                    Comisión
                  </th>
                  <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                    Estado
                  </th>
                  <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {localRooms.length === 0 ? (
                  <tr>
                    <td colSpan={8} className='py-8 text-center text-gray-500 text-sm sm:text-base'>
                      No hay habitaciones disponibles
                    </td>
                  </tr>
                ) : (
                  <SortableContext
                    items={localRooms.map(r => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localRooms.map((room, index) => (
                      <SortableRow
                        key={room.id}
                        room={room}
                        index={index}
                        onEdit={onEdit}
                        onActivate={onActivate}
                        onDeactivate={onDeactivate}
                        onOccupy={onOccupy}
                        setRoomToDelete={setRoomToDelete}
                        setConfirmOpen={setConfirmOpen}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        canActivate={canActivate}
                        canDeactivate={canDeactivate}
                        canOccupy={canOccupy}
                        canLiberate={canLiberate}
                      />
                    ))}
                  </SortableContext>
                )}
              </tbody>
            </table>
          </DndContext>
        </div>
      </div>
      <ConfirmDeleteRoomDialog
        open={confirmOpen}
        room={roomToDelete}
        onOpenChange={setConfirmOpen}
        onConfirm={(room) => onDelete(room)}
      />
    </TooltipProvider>
  );
};

export default RoomTable;
