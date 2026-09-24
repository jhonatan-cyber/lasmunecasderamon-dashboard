'use client';

import React from 'react';
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
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { Bed, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RoomCard from './RoomCard';
import { Room } from '@/types/room';

interface RoomGridViewProps {
  rooms: Room[];
  localRooms: Room[];
  setLocalRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  reorderRooms: (rooms: Room[]) => void;
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
  onActivate: (room: Room) => void;
  onDeactivate: (room: Room) => void;
  onOccupy: (room: Room) => void;
  isMutating: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canOccupy: boolean;
  canLiberate: boolean;
  onNew: () => void;
}

export function RoomGridView({
  rooms,
  localRooms,
  setLocalRooms,
  reorderRooms,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onOccupy,
  isMutating,
  canEdit,
  canDelete,
  canActivate,
  canDeactivate,
  canOccupy,
  canLiberate,
  onNew
}: RoomGridViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localRooms.findIndex(r => r.id === active.id);
      const newIndex = localRooms.findIndex(r => r.id === over.id);

      const newRooms = arrayMove(localRooms, oldIndex, newIndex);
      setLocalRooms(newRooms);
      reorderRooms(newRooms);
    }
  };

  if (rooms.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-20'>
        <div className='w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4'>
          <Bed className='w-8 h-8 text-gray-400' />
        </div>
        <h3 aria-live='polite' className='text-lg font-medium text-gray-900 mb-2'>
          {localRooms.length === 0 ? 'No hay habitaciones' : 'Sin resultados'}
        </h3>
        <p className='text-gray-500 text-center mb-6 max-w-sm'>
          {localRooms.length === 0
            ? 'Crea tu primera habitación para comenzar'
            : 'Ajusta los filtros para ver más resultados'}
        </p>
        {localRooms.length === 0 && (
          <Button
            onClick={onNew}
            className='bg-black text-white hover:bg-gray-800 rounded-xl px-6 py-2'
          >
            <Plus className='w-4 h-4 mr-2' />
            Nueva habitación
          </Button>
        )}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={rooms.map(r => r.id)} strategy={rectSortingStrategy}>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mt-4 sm:mt-6'>
          {rooms.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              onEdit={onEdit}
              onDelete={onDelete}
              onActivate={onActivate}
              onDeactivate={onDeactivate}
              onOccupy={onOccupy}
              isMutating={isMutating}
              isDraggable={true}
              canEdit={canEdit}
              canDelete={canDelete}
              canActivate={canActivate}
              canDeactivate={canDeactivate}
              canOccupy={canOccupy}
              canLiberate={canLiberate}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
