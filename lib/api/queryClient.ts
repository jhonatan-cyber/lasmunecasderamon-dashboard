import { QueryClient } from '@tanstack/react-query';

type QueryFilters = Record<string, unknown> | string | number;
type RetryError = {
  status?: number;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tiempo de vida del caché (5 minutos)
      staleTime: 5 * 60 * 1000,
      // Tiempo de caché en memoria (10 minutos)
      gcTime: 10 * 60 * 1000,
      // Reintentos en caso de error
      retry: (failureCount, error: unknown) => {
        // No reintentar en errores 4xx (excepto 408, 429)
        const status = (error as RetryError | undefined)?.status;
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
          return false;
        }
        // Máximo 3 reintentos
        return failureCount < 3;
      },
      // Reintentar con delay exponencial
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch en window focus solo en producción
      refetchOnWindowFocus: process.env.NODE_ENV === 'production',
      // Refetch en reconnect
      refetchOnReconnect: true,
      // Refetch en mount
      refetchOnMount: true
    },
    mutations: {
      // Reintentos para mutaciones
      retry: 1,
      // Retry delay para mutaciones
      retryDelay: 1000
    }
  }
});

// ==========================================
// QUERY KEYS — Centralized for all domains
// ==========================================
export const queryKeys = {
  // Usuarios
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.users.details(), id] as const
  },

  // Ventas
  sales: {
    all: ['sales'] as const,
    lists: () => [...queryKeys.sales.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.sales.lists(), filters] as const,
    details: () => [...queryKeys.sales.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.sales.details(), id] as const,
    stats: () => [...queryKeys.sales.all, 'stats'] as const
  },

  // Productos
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.products.details(), id] as const,
    categories: () => [...queryKeys.products.all, 'categories'] as const
  },

  // Clientes
  clients: {
    all: ['clients'] as const,
    lists: () => [...queryKeys.clients.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.clients.lists(), filters] as const,
    details: () => [...queryKeys.clients.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.clients.details(), id] as const
  },

  // Caja
  cashRegister: {
    all: ['cashRegister'] as const,
    status: () => [...queryKeys.cashRegister.all, 'status'] as const,
    stats: () => [...queryKeys.cashRegister.all, 'stats'] as const,
    transactions: () => [...queryKeys.cashRegister.all, 'transactions'] as const,
    retiros: () => [...queryKeys.cashRegister.all, 'retiros'] as const
  },

  // Reportes
  reports: {
    all: ['reports'] as const,
    sales: () => [...queryKeys.reports.all, 'sales'] as const,
    products: () => [...queryKeys.reports.all, 'products'] as const,
    users: () => [...queryKeys.reports.all, 'users'] as const
  },

  // Cuentas
  cuentas: {
    all: ['cuentas'] as const,
    lists: () => [...queryKeys.cuentas.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.cuentas.lists(), filters] as const,
    details: () => [...queryKeys.cuentas.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.cuentas.details(), id] as const
  },

  // Servicios
  servicios: {
    all: ['servicios'] as const,
    lists: () => [...queryKeys.servicios.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.servicios.lists(), filters] as const,
    details: () => [...queryKeys.servicios.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.servicios.details(), id] as const,
    temporales: () => [...queryKeys.servicios.all, 'temporal'] as const
  },

  // Órdenes / Pedidos
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.orders.lists(), filters] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.orders.details(), id] as const
  },

  // Habitaciones
  rooms: {
    all: ['rooms'] as const,
    lists: () => [...queryKeys.rooms.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.rooms.lists(), filters] as const,
    details: () => [...queryKeys.rooms.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.rooms.details(), id] as const
  },

  // Categorías
  categories: {
    all: ['categories'] as const,
    lists: () => [...queryKeys.categories.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.categories.lists(), filters] as const
  },

  // Roles
  roles: {
    all: ['roles'] as const,
    lists: () => [...queryKeys.roles.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.roles.lists(), filters] as const
  },

  // Propinas
  tips: {
    all: ['tips'] as const,
    resumen: () => [...queryKeys.tips.all, 'resumen'] as const,
    detalle: (usuarioId: string | number) => [...queryKeys.tips.all, 'detalle', usuarioId] as const
  },

  // Comisiones
  commissions: {
    all: ['commissions'] as const,
    lists: () => [...queryKeys.commissions.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.commissions.lists(), filters] as const,
    stats: () => [...queryKeys.commissions.all, 'stats'] as const
  },

  // Asistencias
  attendance: {
    all: ['attendance'] as const,
    lists: () => [...queryKeys.attendance.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.attendance.lists(), filters] as const,
    stats: () => [...queryKeys.attendance.all, 'stats'] as const
  },

  // Horas extras
  overtime: {
    all: ['overtime'] as const,
    lists: () => [...queryKeys.overtime.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.overtime.lists(), filters] as const,
    byUser: (userId: string | number) => [...queryKeys.overtime.all, 'user', userId] as const
  },

  // Anticipos
  advances: {
    all: ['advances'] as const,
    lists: () => [...queryKeys.advances.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.advances.lists(), filters] as const,
    balances: (usuarioId: string | number) =>
      [...queryKeys.advances.all, 'balances', usuarioId] as const
  },

  // Nómina
  payroll: {
    all: ['payroll'] as const,
    summary: () => [...queryKeys.payroll.all, 'summary'] as const,
    list: (filters: QueryFilters) => [...queryKeys.payroll.all, 'list', filters] as const
  },

  // Gratificaciones
  gratifications: {
    all: ['gratifications'] as const,
    lists: () => [...queryKeys.gratifications.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.gratifications.lists(), filters] as const
  },

  // Anfitrionas
  anfitrionas: {
    all: ['anfitrionas'] as const,
    disponibles: () => [...queryKeys.anfitrionas.all, 'disponibles'] as const,
    lists: () => [...queryKeys.anfitrionas.all, 'list'] as const
  },

  // Timers
  timers: {
    all: ['timers'] as const,
    active: () => [...queryKeys.timers.all, 'active'] as const
  },

  // Notificaciones
  notifications: {
    all: ['notifications'] as const,
    sse: () => [...queryKeys.notifications.all, 'sse'] as const
  },

  // Dashboard / Stats
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => [...queryKeys.dashboard.all, 'summary'] as const,
    alerts: () => [...queryKeys.dashboard.all, 'alerts'] as const,
    pendingItems: () => [...queryKeys.dashboard.all, 'pending-items'] as const,
    insights: () => [...queryKeys.dashboard.all, 'insights'] as const,
    recentActivity: () => [...queryKeys.dashboard.all, 'recent-activity'] as const,
    composite: () => [...queryKeys.dashboard.all, 'composite'] as const
  },

  // Devoluciones
  returns: {
    all: ['returns'] as const,
    services: () => [...queryKeys.returns.all, 'services'] as const,
    sales: () => [...queryKeys.returns.all, 'sales'] as const
  },

  // Auth
  auth: {
    all: ['auth'] as const,
    check: () => [...queryKeys.auth.all, 'check'] as const,
    checkUsers: () => [...queryKeys.auth.all, 'check-users'] as const,
    registerFirstUser: () => [...queryKeys.auth.all, 'register-first-user'] as const
  },

  // Calendario
  calendar: {
    all: ['calendar'] as const,
    range: (startDate: string, endDate: string) =>
      [...queryKeys.calendar.all, 'range', startDate, endDate] as const
  },

  // Reviews
  reviews: {
    all: ['reviews'] as const,
    lists: () => [...queryKeys.reviews.all, 'list'] as const
  }
};

// ==========================================
// INVALIDATE HELPERS — One-liners for all domains
// ==========================================
export const invalidateQueries = {
  users: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  sales: () => queryClient.invalidateQueries({ queryKey: queryKeys.sales.all }),
  products: () => queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
  clients: () => queryClient.invalidateQueries({ queryKey: queryKeys.clients.all }),
  cashRegister: () => queryClient.invalidateQueries({ queryKey: queryKeys.cashRegister.all }),
  reports: () => queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
  cuentas: () => queryClient.invalidateQueries({ queryKey: queryKeys.cuentas.all }),
  servicios: () => queryClient.invalidateQueries({ queryKey: queryKeys.servicios.all }),
  orders: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
  rooms: () => queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }),
  categories: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
  roles: () => queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
  tips: () => queryClient.invalidateQueries({ queryKey: queryKeys.tips.all }),
  commissions: () => queryClient.invalidateQueries({ queryKey: queryKeys.commissions.all }),
  attendance: () => queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all }),
  overtime: () => queryClient.invalidateQueries({ queryKey: queryKeys.overtime.all }),
  advances: () => queryClient.invalidateQueries({ queryKey: queryKeys.advances.all }),
  payroll: () => queryClient.invalidateQueries({ queryKey: queryKeys.payroll.all }),
  gratifications: () => queryClient.invalidateQueries({ queryKey: queryKeys.gratifications.all }),
  anfitrionas: () => queryClient.invalidateQueries({ queryKey: queryKeys.anfitrionas.all }),
  timers: () => queryClient.invalidateQueries({ queryKey: queryKeys.timers.all }),
  notifications: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  dashboard: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
  returns: () => queryClient.invalidateQueries({ queryKey: queryKeys.returns.all }),
  auth: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.all }),
  calendar: () => queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all }),
  reviews: () => queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all })
};

export default queryClient;
