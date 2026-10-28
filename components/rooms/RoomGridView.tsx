'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import React, { useRef, useState } from 'react';
import { dragModifiers } from '@/components/shared/dragBounds';
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
  reorderRooms: (rooms: Room[]) => Promise<void>;
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

  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const handleDragEnd = async (event: DragEndEvent) => {
    if (!canEdit || isMutating || busy.current) return;
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localRooms.findIndex(r => r.id === active.id);
      const newIndex = localRooms.findIndex(r => r.id === over.id);

      if (oldIndex < 0 || newIndex < 0) return;
      const newRooms = arrayMove(localRooms, oldIndex, newIndex).map((room, index) => ({
        ...room,
        display_order: index + 1
      }));
      setLocalRooms(newRooms);
      busy.current = true;
      setSaving(true);
      try {
        await reorderRooms(newRooms);
      } finally {
        busy.current = false;
        setSaving(false);
      }
    }
  };

  if (rooms.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-20'>
        <EmptyState
          icon={Bed}
          title={localRooms.length === 0 ? 'No hay habitaciones' : 'Sin resultados'}
          description={
            localRooms.length === 0
              ? 'Crea tu primera habitación para comenzar'
              : 'Ajusta los filtros para ver más resultados'
          }
          action={
            localRooms.length === 0 && (
              <Button
                onClick={onNew}
                className='bg-black text-white hover:bg-gray-800 rounded-xl px-6 py-2'
              >
                <Plus className='w-4 h-4 mr-2' />
                Nueva habitación
              </Button>
            )
          }
        />
      </div>
    );
  }

  return (
    <DndContext
      modifiers={dragModifiers}
      autoScroll={false}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
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
              isDraggable={canEdit && !saving && !isMutating}
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
