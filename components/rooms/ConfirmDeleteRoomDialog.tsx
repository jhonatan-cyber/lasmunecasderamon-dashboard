'use client';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import type { Room } from '@/types/room';
interface ConfirmDeleteRoomDialogProps {
  open: boolean;
  room: Room | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (room: Room) => void;
  isLoading?: boolean;
}
export default function ConfirmDeleteRoomDialog({
  open,
  room,
  onOpenChange,
  onConfirm,
  isLoading = false
}: ConfirmDeleteRoomDialogProps) {
  if (!room) return null;
  return (
    <DeleteConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={() => onConfirm(room)}
      entityLabel='habitación'
      entityValue={room.name}
      fieldName='Habitación'
      isLoading={isLoading}
      closeOnConfirm={false}
      confirmationMessage='¿Estás seguro de que quieres eliminar la habitación?'
    />
  );
}
