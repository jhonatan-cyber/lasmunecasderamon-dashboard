import { queryKeys } from '@/lib/api/queryClient';
import { useGenericFetch } from './useGenericFetch';

type AnyRecord = Record<string, any>;

interface NormalizedClient {
  id: string | number;
  run?: string;
  name?: string;
  lastName?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  status?: number;
  saldo?: number;
  [key: string]: any;
}

interface NormalizedRoom {
  id: string | number;
  id_habitacion?: string | number;
  name?: string;
  nombre?: string;
  numero?: string | number;
  precio?: number;
  price?: number;
  tiempo?: number;
  time?: number;
  comision_anfitriona?: number;
  estado?: number;
  status?: number;
  [key: string]: any;
}

interface NormalizedAnfitriona {
  id: string | number;
  id_usuario?: string | number;
  name?: string;
  nombre?: string;
  lastName?: string;
  apellido?: string;
  nick?: string;
  estado?: number;
  status?: number;
  role?: string;
  [key: string]: any;
}

interface NormalizedCategory {
  id: string | number;
  id_categoria?: string | number;
  name?: string;
  nombre?: string;
  description?: string;
  descripcion?: string;
  estado?: number;
  status?: number;
  total_products?: number;
  productCount?: number;
  [key: string]: any;
}

const EMPTY_ARRAY: any[] = [];

const asArray = (result: any): AnyRecord[] => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.results)) return result.results;
  return EMPTY_ARRAY;
};

const normalizeClient = (client: AnyRecord): NormalizedClient => ({
  ...client,
  id: client.id ?? client.id_cliente,
  name: client.name ?? client.nombre,
  lastName: client.lastName ?? client.apellido,
  status: client.status ?? client.estado
});

const normalizeRoom = (room: AnyRecord): NormalizedRoom => ({
  ...room,
  id: room.id ?? room.id_habitacion,
  id_habitacion: room.id_habitacion ?? room.id,
  name: room.name ?? room.nombre,
  nombre: room.nombre ?? room.name,
  precio: room.precio ?? room.price,
  price: room.price ?? room.precio,
  tiempo: room.tiempo ?? room.time,
  time: room.time ?? room.tiempo,
  comision_anfitriona: room.comision_anfitriona ?? room.comisionAnfitriona ?? 0,
  estado: room.estado ?? room.status,
  status: room.status ?? room.estado
});

const normalizeAnfitriona = (user: AnyRecord): NormalizedAnfitriona => ({
  ...user,
  id: user.id ?? user.id_usuario,
  id_usuario: user.id_usuario ?? user.id,
  name: user.name ?? user.nombre,
  nombre: user.nombre ?? user.name,
  lastName: user.lastName ?? user.apellido,
  apellido: user.apellido ?? user.lastName,
  estado: user.estado ?? user.status,
  status: user.status ?? user.estado
});

const normalizeCategory = (category: AnyRecord): NormalizedCategory => ({
  ...category,
  id: category.id ?? category.id_categoria,
  id_categoria: category.id_categoria ?? category.id,
  name: category.name ?? category.nombre,
  nombre: category.nombre ?? category.name,
  description: category.description ?? category.descripcion,
  descripcion: category.descripcion ?? category.description,
  estado: category.estado ?? category.status,
  status: category.status ?? category.estado,
  total_products: category.total_products ?? category.productCount ?? 0,
  productCount: category.productCount ?? category.total_products ?? 0
});

export function useMasterData({
  soloAnfitrionasEnLocal = false
}: { soloAnfitrionasEnLocal?: boolean } = {}) {
  const clientsQuery = useGenericFetch<NormalizedClient>('/api/clients', {
    queryKey: queryKeys.clients.all,
    transform: result => asArray(result).map(normalizeClient)
  });

  const roomsQuery = useGenericFetch<NormalizedRoom>('/api/rooms', {
    queryKey: queryKeys.rooms.all,
    transform: result => asArray(result).map(normalizeRoom)
  });

  // Todas las anfitrionas activas: la presencia (login/en local) no puede
  // dejar la venta sin opciones para asignar comisión.
  const anfitrionasQuery = useGenericFetch<NormalizedAnfitriona>(
    `/api/users?anfitrionas=1&status=active${soloAnfitrionasEnLocal ? '&loggedIn=true&enLocal=true' : ''}`,
    {
      queryKey: soloAnfitrionasEnLocal
        ? [...queryKeys.anfitrionas.all, 'en-local']
        : queryKeys.anfitrionas.all,
      transform: result => asArray(result).map(normalizeAnfitriona)
    }
  );

  const categoriesQuery = useGenericFetch<NormalizedCategory>('/api/categories', {
    queryKey: queryKeys.categories.all,
    transform: result => asArray(result).map(normalizeCategory)
  });

  const refreshAll = async () => {
    await Promise.all([
      clientsQuery.refetch(),
      roomsQuery.refetch(),
      anfitrionasQuery.refetch(),
      categoriesQuery.refetch()
    ]);
  };

  return {
    clients: clientsQuery.data as any[],
    rooms: roomsQuery.data as any[],
    anfitrionas: anfitrionasQuery.data as any[],
    categories: categoriesQuery.data as any[],
    isLoading:
      clientsQuery.isLoading ||
      roomsQuery.isLoading ||
      anfitrionasQuery.isLoading ||
      categoriesQuery.isLoading,
    error:
      clientsQuery.error || roomsQuery.error || anfitrionasQuery.error || categoriesQuery.error,
    refreshAll,
    refetchClients: clientsQuery.refetch,
    refetchRooms: roomsQuery.refetch,
    refetchAnfitrionas: anfitrionasQuery.refetch,
    refetchCategories: categoriesQuery.refetch
  };
}
