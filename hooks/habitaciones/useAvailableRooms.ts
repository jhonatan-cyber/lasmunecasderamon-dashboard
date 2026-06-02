import { useGenericFetch } from '../shared/useGenericFetch';
import { queryKeys } from '@/lib/api/queryClient';

interface AvailableRoom {
  id_habitacion?: number;
  id?: number;
  nombre?: string;
  name?: string;
  precio?: number;
  price?: number;
  tiempo?: number;
  time?: number;
  comision_anfitriona?: number;
  estado?: number;
  status?: number;
  [key: string]: any;
}

export function useAvailableRooms() {
  const {
    data: rooms,
    isLoading,
    error,
    refetch
  } = useGenericFetch<AvailableRoom>('/api/rooms?status=1', {
    queryKey: queryKeys.rooms.lists(),
    transform: result => (result.success ? result.data : [])
  });

  return {
    rooms: rooms || [],
    isLoading,
    error,
    refetchRooms: refetch
  };
}
