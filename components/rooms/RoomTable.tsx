'use client';

import React, { useState, useMemo } from "react";
import { Room } from "@/types/room";
import { MoreVertical, Edit, Trash2, Check, Power, Bed, GripVertical } from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
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
import { formatCurrencyCLP } from "@/lib/utils/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
  isMutating: boolean;
  currentPage?: number;
  pageSize?: number;
}

const getStatusBadge = (status: number) => {
  switch (status) {
    case 1:
      return <Badge className='bg-green-100 text-green-700 rounded-full px-3 py-1'>Disponible</Badge>;
    case 2:
      return <Badge className='bg-red-100 text-red-700 rounded-full px-3 py-1'>Ocupada</Badge>;
    default:
      return <Badge className='bg-gray-100 text-gray-700 rounded-full px-3 py-1'>Inactiva</Badge>;
  }
};

interface SortableRowProps {
  room: Room;
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
  absoluteIndex: number;
}

const SortableRow: React.FC<SortableRowProps> = ({
  room,
  absoluteIndex,
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
    <TableRow
      ref={setNodeRef}
      style={style}
      className='border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30'
    >
      <TableCell className='py-3 px-4 text-center'>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing inline-flex items-center justify-center hover:bg-gray-100 rounded p-1"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      </TableCell>
      <TableCell className='py-3 px-4 text-center'>
        <Badge className='bg-purple-100 text-purple-700 rounded-full px-3 py-1'>
          {absoluteIndex}
        </Badge>
      </TableCell>
      <TableCell className='py-3 px-4 text-center font-medium'>
        {room.name}
      </TableCell>
      <TableCell className='py-3 px-4 text-center font-medium'>
        {formatCurrencyCLP(room.price)}
      </TableCell>
      <TableCell className='py-3 px-4 text-center'>
        <span className="text-gray-600">{room.time} min</span>
      </TableCell>
      <TableCell className='py-3 px-4 text-center'>
        {room.comision_anfitriona ? (
          <span className="text-gray-600">{formatCurrencyCLP(room.comision_anfitriona)}</span>
        ) : (
          <span className="text-gray-400 italic text-sm">sin comisión</span>
        )}
      </TableCell>
      <TableCell className='py-3 px-4 text-center'>
        {getStatusBadge(room.status)}
      </TableCell>
      <TableCell className='py-3 px-4 text-center'>
        {(canEdit || canDelete || canActivate || canDeactivate || canOccupy || canLiberate) ? (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='bg-white hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full hover:scale-105 transition-all duration-200'
                  >
                    <MoreVertical className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent><p>Acciones</p></TooltipContent>
            </Tooltip>
            <DropdownMenuContent align='end'>
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem onClick={() => onEdit(room)}>
                      <Edit className='mr-2 h-4 w-4 text-purple-600' /> Editar
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent side='left'><p>Editar habitación</p></TooltipContent>
                </Tooltip>
              )}
              {room.status === 0 && canActivate ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem onClick={() => onActivate(room)}>
                      <Check className='mr-2 h-4 w-4 text-green-600' /> Activar
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent side='left'><p>Activar habitación</p></TooltipContent>
                </Tooltip>
              ) : room.status === 1 ? (
                <>
                  {canOccupy && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem onClick={() => onOccupy(room)}>
                          <Bed className='mr-2 h-4 w-4 text-blue-600' /> Ocupar
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side='left'><p>Ocupar habitación</p></TooltipContent>
                    </Tooltip>
                  )}
                  {canDeactivate && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem onClick={() => onDeactivate(room)}>
                          <Power className='mr-2 h-4 w-4 text-orange-600' /> Desactivar
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side='left'><p>Desactivar habitación</p></TooltipContent>
                    </Tooltip>
                  )}
                </>
              ) : room.status === 2 && canLiberate ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem onClick={() => onActivate(room)}>
                      <Check className='mr-2 h-4 w-4 text-green-600' /> Liberar
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent side='left'><p>Liberar habitación</p></TooltipContent>
                </Tooltip>
              ) : null}
              {canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onClick={() => {
                        setRoomToDelete(room);
                        setConfirmOpen(true);
                      }}
                      className='text-red-600 focus:text-red-600'
                    >
                      <Trash2 className='mr-2 h-4 w-4' /> Eliminar
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent side='left'><p>Eliminar habitación</p></TooltipContent>
                </Tooltip>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className='text-xs text-gray-400'>Sin acciones</span>
        )}
      </TableCell>
    </TableRow>
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
  canLiberate = true,
  isMutating = false,
  currentPage = 1,
  pageSize = 5
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [localRooms, setLocalRooms] = useState(rooms);

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

      if (onReorder) {
        onReorder(newRooms);
      }
    }
  };

  return (
    <TooltipProvider>
      <div className='space-y-4'>
        <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
          <div className='overflow-x-auto'>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                  <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 w-12'></TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>#</TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Nombre</TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Precio</TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Tiempo</TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Comisión</TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Estado</TableHead>
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localRooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className='py-8 text-center text-gray-500 text-sm'>
                        No hay habitaciones disponibles
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext
                      items={localRooms.map(r => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {localRooms.map((room, index) => (
                        <SortableRow
                          key={room.id}
                          room={room}
                          absoluteIndex={(currentPage - 1) * pageSize + index + 1}
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
                </TableBody>
              </Table>
            </DndContext>
          </div>
        </div>
      </div>
      <ConfirmDeleteRoomDialog
        open={confirmOpen}
        room={roomToDelete}
        onOpenChange={setConfirmOpen}
        onConfirm={(room) => onDelete(room)}
        isLoading={isMutating}
      />
    </TooltipProvider>
  );
};

export default RoomTable;