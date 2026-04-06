import { useState, useCallback, useMemo } from 'react';
import { Room } from '@/types/room';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';
import { useGenericFetch } from '../shared/useGenericFetch';
import { useGenericMutations } from '../shared/useGenericMutations';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';

interface UseRooms {
  rooms: Room[];
  filteredRooms: Room[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fetchRooms: () => Promise<void>;
  createRoom: (
    room: Omit<Room, 'id' | 'status' | 'fecha_crea' | 'fecha_mod' | 'fecha_elim'>
  ) => Promise<void>;
  updateRoom: (
    id: string | number,
    room: Omit<Room, 'id' | 'status' | 'fecha_crea' | 'fecha_mod' | 'fecha_elim'>
  ) => Promise<void>;
  deleteRoom: (id: string | number) => Promise<void>;
  activateRoom: (id: string | number, subAction?: 'activate' | 'liberate') => Promise<void>;
  deactivateRoom: (id: string | number) => Promise<void>;
  occupyRoom: (id: string | number) => Promise<void>;
  reorderRooms: (reorderedRooms: Room[]) => Promise<void>;
}

const EMPTY_ARRAY: any[] = [];

export default function useRooms(): UseRooms {
  const {
    data: rooms,
    isLoading,
    error,
    refetch
  } = useGenericFetch<Room>('/api/rooms', {
    transform: result => (result.success ? result.data : EMPTY_ARRAY)
  });

  const [searchTerm, setSearchTerm] = useState('');
  const {
    create,
    update,
    remove,
    isLoading: crudMutating
  } = useGenericMutations<Room>('/api/rooms', {
    onSuccess: () => {
      refetch();
    },
    showToasts: true,
    entityName: 'Habitación'
  });

  const filteredRooms = useMemo(() => {
    if (!rooms || rooms.length === 0) return EMPTY_ARRAY as Room[];
    if (!searchTerm.trim()) return rooms;

    const term = searchTerm.toLowerCase();
    return rooms.filter((room: Room) => room.name.toLowerCase().includes(term));
  }, [searchTerm, rooms]);

  const createRoom = useCallback(
    async (room: Omit<Room, 'id' | 'status' | 'fecha_crea' | 'fecha_mod' | 'fecha_elim'>) => {
      await create(room);
    },
    [create]
  );

  const updateRoom = useCallback(
    async (
      id: string | number,
      room: Omit<Room, 'id' | 'status' | 'fecha_crea' | 'fecha_mod' | 'fecha_elim'>
    ) => {
      await update({ id, ...room });
    },
    [update]
  );

  const deleteRoom = useCallback(
    async (id: string | number) => {
      await remove(id);
    },
    [remove]
  );

  const queryClient = useQueryClient();
  const roomsQueryKey = queryKeys.rooms.all;

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      action
    }: {
      id: string | number;
      action: string;
      subAction?: string;
    }) => {
      const res = await fetch(`/api/rooms?id=${id}&action=${action}`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error en la operación');
      return data;
    },
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: roomsQueryKey });
      const previousRooms = queryClient.getQueryData<Room[]>(roomsQueryKey);

      if (previousRooms) {
        queryClient.setQueryData(roomsQueryKey, (old: Room[] | undefined) =>
          (old || []).map(room => {
            if (String(room.id) === String(id)) {
              let newStatus = room.status;
              if (action === 'occupy') newStatus = 2; // Ocupada
              if (action === 'activate') newStatus = 1; // Activa/Disponible
              if (action === 'deactivate') newStatus = 0; // Inactiva
              return { ...room, status: newStatus };
            }
            return room;
          })
        );
      }

      return { previousRooms };
    },
    onError: (err, variables, context) => {
      if (context?.previousRooms) {
        queryClient.setQueryData(roomsQueryKey, context.previousRooms);
      }
      showErrorToast(err.message || 'Error al actualizar el estado de la habitación');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: roomsQueryKey });
    },
    onSuccess: (_, variables) => {
      const { action, subAction } = variables;
      let message = 'Estado de habitación actualizado';

      if (subAction === 'liberate') message = 'Habitación liberada correctamente';
      else if (action === 'activate') message = 'Habitación activada correctamente';
      else if (action === 'deactivate') message = 'Habitación desactivada correctamente';
      else if (action === 'occupy') message = 'Habitación marcada como ocupada';

      showSuccessToast(message);
    }
  });

  const activateRoom = useCallback(
    async (id: string | number, subAction?: 'activate' | 'liberate') => {
      await statusMutation.mutateAsync({ id, action: 'activate', subAction });
    },
    [statusMutation]
  );

  const deactivateRoom = useCallback(
    async (id: string | number) => {
      await statusMutation.mutateAsync({ id, action: 'deactivate' });
    },
    [statusMutation]
  );

  const occupyRoom = useCallback(
    async (id: string | number) => {
      await statusMutation.mutateAsync({ id, action: 'occupy' });
    },
    [statusMutation]
  );

  const reorderRooms = useCallback(
    async (reorderedRooms: Room[]) => {
      try {
        const room_orders = reorderedRooms.map((room, index) => ({
          id: room.id,
          display_order: index + 1
        }));

        const res = await fetch('/api/rooms/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_orders })
        });

        const data = await res.json();
        if (data.success) {
          showSuccessToast('Orden actualizado correctamente');
          await refetch();
        } else {
          showErrorToast(data.message || 'Error al actualizar el orden');
          await refetch();
        }
      } catch (err) {
        showErrorToast('Error de red al actualizar el orden');
        await refetch();
      }
    },
    [refetch]
  );

  return {
    rooms: rooms || (EMPTY_ARRAY as Room[]),
    filteredRooms,
    isLoading,
    isMutating: crudMutating || statusMutation.isPending,
    error,
    searchTerm,
    setSearchTerm,
    fetchRooms: async () => {
      await refetch();
    },
    createRoom,
    updateRoom,
    deleteRoom,
    activateRoom,
    deactivateRoom,
    occupyRoom,
    reorderRooms
  };
}
