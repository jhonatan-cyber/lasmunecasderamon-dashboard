import { useState, useCallback, useMemo } from "react";
import { Room } from "@/types/room";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";
import { useGenericFetch } from "../shared/useGenericFetch";
import { useGenericMutations } from "../shared/useGenericMutations";

interface UseRooms {
  rooms: Room[];
  filteredRooms: Room[];
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fetchRooms: () => Promise<void>;
  createRoom: (room: Omit<Room, "id" | "status" | "fecha_crea" | "fecha_mod" | "fecha_elim">) => Promise<void>;
  updateRoom: (id: number, room: Omit<Room, "id" | "status" | "fecha_crea" | "fecha_mod" | "fecha_elim">) => Promise<void>;
  deleteRoom: (id: number) => Promise<void>;
  activateRoom: (id: number) => Promise<void>;
  deactivateRoom: (id: number) => Promise<void>;
  occupyRoom: (id: number) => Promise<void>;
  reorderRooms: (reorderedRooms: Room[]) => Promise<void>;
}

export default function useRooms(): UseRooms {
  // Fetch de datos con transformación
  const { data: rooms, isLoading, error, refetch } = useGenericFetch<Room>(
    "/api/rooms",
    {
      transform: (result) => result.success ? result.data : []
    }
  );

  // Búsqueda local
  const [searchTerm, setSearchTerm] = useState("");

  // Mutaciones CRUD con toasts habilitados
  const { create, update, remove } = useGenericMutations<Room>("/api/rooms", {
    onSuccess: refetch,
    showToasts: true,
    entityName: "Habitación"
  });

  // Filtrado local
  const filteredRooms = useMemo(() => {
    if (!rooms || rooms.length === 0) return [];
    if (!searchTerm.trim()) return rooms;
    
    const term = searchTerm.toLowerCase();
    return rooms.filter((room) => room.name.toLowerCase().includes(term));
  }, [searchTerm, rooms]);

  // Wrapper para createRoom con tipo específico
  const createRoom = useCallback(async (room: Omit<Room, "id" | "status" | "fecha_crea" | "fecha_mod" | "fecha_elim">) => {
    await create(room);
  }, [create]);

  // Wrapper para updateRoom con tipo específico
  const updateRoom = useCallback(async (id: number, room: Omit<Room, "id" | "status" | "fecha_crea" | "fecha_mod" | "fecha_elim">) => {
    await update({ id, ...room });
  }, [update]);

  // Wrapper para deleteRoom
  const deleteRoom = useCallback(async (id: number) => {
    await remove(id);
  }, [remove]);

  // Funciones especiales
  const activateRoom = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/rooms?id=${id}&action=activate`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(data.message || "Habitación activada correctamente");
        await refetch();
      } else {
        showErrorToast(data.message || "Error al activar habitación");
      }
    } catch (err) {
      showErrorToast("Error de red al activar habitación");
    }
  }, [refetch]);

  const deactivateRoom = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/rooms?id=${id}&action=deactivate`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(data.message || "Habitación desactivada correctamente");
        await refetch();
      } else {
        showErrorToast(data.message || "Error al desactivar habitación");
      }
    } catch (err) {
      showErrorToast("Error de red al desactivar habitación");
    }
  }, [refetch]);

  const occupyRoom = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/rooms?id=${id}&action=occupy`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(data.message || "Habitación ocupada correctamente");
        await refetch();
      } else {
        showErrorToast(data.message || "Error al ocupar habitación");
      }
    } catch (err) {
      showErrorToast("Error de red al ocupar habitación");
    }
  }, [refetch]);

  const reorderRooms = useCallback(async (reorderedRooms: Room[]) => {
    try {
      const room_orders = reorderedRooms.map((room, index) => ({
        id: room.id,
        display_order: index + 1
      }));

      const res = await fetch("/api/rooms/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_orders }),
      });

      const data = await res.json();
      if (data.success) {
        showSuccessToast("Orden actualizado correctamente");
        await refetch();
      } else {
        showErrorToast(data.message || "Error al actualizar el orden");
        await refetch();
      }
    } catch (err) {
      showErrorToast("Error de red al actualizar el orden");
      await refetch();
    }
  }, [refetch]);

  return {
    rooms: rooms || [],
    filteredRooms,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    fetchRooms: refetch,
    createRoom,
    updateRoom,
    deleteRoom,
    activateRoom,
    deactivateRoom,
    occupyRoom,
    reorderRooms,
  };
} 