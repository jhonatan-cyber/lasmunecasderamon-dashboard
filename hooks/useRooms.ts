import { useState, useEffect, useCallback } from "react";
import { Room } from "@/types/room";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";

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
}

export default function useRooms(): UseRooms {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      if (data.success) {
        setRooms(data.data);
      } else {
        setError(data.message || "Error al obtener habitaciones");
      }
    } catch (err) {
      setError("Error de red al obtener habitaciones");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    let filtered = rooms;
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filtered = rooms.filter((room) =>
        room.name.toLowerCase().includes(term)
      );
    }
    setFilteredRooms(filtered);
  }, [rooms, searchTerm]);

  const createRoom = async (room: Omit<Room, "id" | "status" | "fecha_crea" | "fecha_mod" | "fecha_elim">) => {
    setIsLoading(true);
    setError(null);
    try {
     
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(room),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(data.message || "Habitación creada correctamente");
        await fetchRooms();
      } else {
        showErrorToast(data.message || "Error al crear habitación");
        setError(data.message || "Error al crear habitación");
      }
    } catch (err) {
      showErrorToast("Error de red al crear habitación");
      setError("Error de red al crear habitación");
    } finally {
      setIsLoading(false);
    }
  };

  const updateRoom = async (id: number, room: Omit<Room, "id" | "status" | "fecha_crea" | "fecha_mod" | "fecha_elim">) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(room),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(data.message || "Habitación actualizada correctamente");
        await fetchRooms();
      } else {
        showErrorToast(data.message || "Error al actualizar habitación");
        setError(data.message || "Error al actualizar habitación");
      }
    } catch (err) {
      showErrorToast("Error de red al actualizar habitación");
      setError("Error de red al actualizar habitación");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRoom = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(data.message || "Habitación eliminada correctamente");
        await fetchRooms();
      } else {
        showErrorToast(data.message || "Error al eliminar habitación");
        setError(data.message || "Error al eliminar habitación");
      }
    } catch (err) {
      showErrorToast("Error de red al eliminar habitación");
      setError("Error de red al eliminar habitación");
    } finally {
      setIsLoading(false);
    }
  };

  const activateRoom = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms?id=${id}&action=activate`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(data.message || "Habitación activada correctamente");
        await fetchRooms();
      } else {
        showErrorToast(data.message || "Error al activar habitación");
        setError(data.message || "Error al activar habitación");
      }
    } catch (err) {
      showErrorToast("Error de red al activar habitación");
      setError("Error de red al activar habitación");
    } finally {
      setIsLoading(false);
    }
  };

  const deactivateRoom = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms?id=${id}&action=deactivate`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(data.message || "Habitación desactivada correctamente");
        await fetchRooms();
      } else {
        showErrorToast(data.message || "Error al desactivar habitación");
        setError(data.message || "Error al desactivar habitación");
      }
    } catch (err) {
      showErrorToast("Error de red al desactivar habitación");
      setError("Error de red al desactivar habitación");
    } finally {
      setIsLoading(false);
    }
  };

  const occupyRoom = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms?id=${id}&action=occupy`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(data.message || "Habitación ocupada correctamente");
        await fetchRooms();
      } else {
        showErrorToast(data.message || "Error al ocupar habitación");
        setError(data.message || "Error al ocupar habitación");
      }
    } catch (err) {
      showErrorToast("Error de red al ocupar habitación");
      setError("Error de red al ocupar habitación");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    rooms,
    filteredRooms,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    fetchRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    activateRoom,
    deactivateRoom,
    occupyRoom,
  };
} 