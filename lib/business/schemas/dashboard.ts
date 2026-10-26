import { z } from 'zod';
import { RoomSchema } from './room';

/**
 * Contrato de `GET /api/dashboard/composite`.
 *
 * Describe lo que el servidor emite de verdad: alias del SQL en
 * `modules/reportes/dashboard/consultas.ts`, agregados de `builders.ts`/`calculos.ts`
 * y filas crudas de `TimerService.getActive()`. Los tipos del hook se infieren desde
 * aquí (`z.infer`), así que un cambio de alias rompe en compilación y, en runtime,
 * `safeParse` lo reporta con la ruta exacta del campo.
 *
 * `lib/database/postgres.cjs` registra parsers para `numeric` e `int8`, por eso los
 * importes y conteos llegan como `number` y no como string.
 */

const numero = z.number();

export const DashboardTrendSchema = z.object({
  current: numero,
  previous: numero,
  delta: numero,
  percentChange: numero,
  direction: z.enum(['up', 'down', 'flat'])
});

export type DashboardTrend = z.infer<typeof DashboardTrendSchema>;

export const DashboardRankingItemSchema = z.object({
  name: z.string(),
  quantity: numero,
  amount: numero
});

export type DashboardRankingItem = z.infer<typeof DashboardRankingItemSchema>;

export const DashboardInsightsSchema = z.object({
  comparisons: z.object({
    salesToday: DashboardTrendSchema,
    servicesToday: DashboardTrendSchema,
    movementToday: DashboardTrendSchema,
    salesWeek: DashboardTrendSchema,
    operationsWeek: DashboardTrendSchema
  }),
  localStatus: z.object({
    rooms: z.object({
      occupied: numero,
      free: numero,
      total: numero,
      occupancyRate: numero
    }),
    services: z.object({ active: numero, expiringSoon: numero }),
    orders: z.object({ open: numero, serviceRequests: numero }),
    team: z.object({ active: numero, total: numero, coverageRate: numero }),
    cash: z.object({ openRegisters: numero })
  }),
  rankings: z.object({
    products: z.array(DashboardRankingItemSchema),
    rooms: z.array(DashboardRankingItemSchema),
    staff: z.array(DashboardRankingItemSchema)
  }),
  financialSummary: z.object({
    openingAmount: numero,
    sales: numero,
    services: numero,
    tips: numero,
    advances: numero,
    returns: numero,
    withdrawals: numero,
    netRevenue: numero
  }),
  forecast: z.object({
    status: z.enum(['closed', 'insufficient', 'ready']),
    // `buildShiftForecast` devuelve null mientras la caja no tiene historia suficiente.
    projectedRevenue: numero.nullable(),
    expectedMinutes: numero,
    historyCount: numero,
    currentRevenue: numero,
    yesterdayRevenue: numero,
    elapsedMinutesToday: numero,
    anomalies: z.array(
      z.object({
        id: z.string(),
        tone: z.enum(['success', 'warning', 'critical']),
        title: z.string(),
        description: z.string()
      })
    )
  })
});

export type DashboardInsightsResponse = z.infer<typeof DashboardInsightsSchema>;

export const DashboardCajaStatsSchema = z.object({
  // Sin caja abierta el builder devuelve undefined y JSON omite la clave.
  caja_id: z.string().nullish(),
  monto_apertura: numero,
  efectivo_en_caja: numero,
  total_efectivo: numero,
  total_tarjeta: numero,
  total_transferencia: numero,
  total_anticipo: numero,
  total_devolucion: numero,
  total_comision: numero,
  total_propina: numero,
  total_iva: numero,
  total_ventas: numero,
  cantidad_ventas: numero,
  total_servicios: numero,
  cantidad_servicios: numero,
  balance_total: numero,
  tiempo_abierta_horas: numero,
  tiempo_abierta_minutos: numero,
  fecha_apertura_raw: z.string().nullish(),
  usuario_id_apertura: z.string().nullish()
});

export type DashboardBusinessStats = z.infer<typeof DashboardCajaStatsSchema>;

export const DashboardLoggedRoleSchema = z.object({
  logueadas: numero,
  total: numero,
  porcentaje: numero,
  // `usuarios.id_usuario` es varchar y `usuarios.nick` es nullable: el conteo sí es
  // fiable, pero el id llega como texto y el nick puede venir vacío.
  usuarios: z.array(z.object({ id_usuario: z.string(), nick: z.string().nullable() }))
});

export const DashboardLoggedUsersSchema = z.object({
  anfitrionas: DashboardLoggedRoleSchema,
  garzones: DashboardLoggedRoleSchema,
  cajeros: DashboardLoggedRoleSchema,
  barman: DashboardLoggedRoleSchema
});

export type DashboardLoggedUsers = z.infer<typeof DashboardLoggedUsersSchema>;

/**
 * `TimerService.getActive()` devuelve filas enriquecidas (estado, total, anfitrionas,
 * expiresAt…). Se validan los campos que consumen el dashboard y el resto pasa intacto.
 */
export const DashboardTimerSchema = z.looseObject({
  servicioId: z.string(),
  roomId: z.string().nullish(),
  roomName: z.string().nullish(),
  duration: numero,
  startTime: z.string(),
  codigo: z.string().nullish(),
  clienteNombre: z.string().nullish(),
  tipoTransaccion: z.string(),
  isPaused: z.boolean().optional(),
  isActive: z.boolean().optional(),
  remainingTime: numero.optional(),
  anfitrionas: z.string().nullish()
});

export type DashboardTimer = z.infer<typeof DashboardTimerSchema>;

export const DashboardRecentActivitySchema = z.object({
  id: z.string(),
  type: z.string(),
  code: z.string(),
  amount: numero,
  // `fecha_crea` llega como string: postgres.cjs conserva el contrato de fecha.
  date: z.string(),
  estado: numero,
  user: z.object({
    id: z.string(),
    nick: z.string(),
    name: z.string(),
    avatar: z.string().nullable()
  })
});

export type RecentActivityItem = z.infer<typeof DashboardRecentActivitySchema>;

export const DashboardPendingItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  subtitle: z.string(),
  amount: numero,
  createdAt: z.string(),
  href: z.string(),
  kind: z.enum(['order', 'service_request'])
});

export type DashboardPendingItem = z.infer<typeof DashboardPendingItemSchema>;

export const DashboardPendingItemsSchema = z.object({
  orders: z.array(DashboardPendingItemSchema),
  serviceRequests: z.array(DashboardPendingItemSchema),
  summary: z.object({
    totalPendingOrders: numero,
    totalPendingServiceRequests: numero,
    totalVisibleItems: numero
  })
});

export type DashboardPendingItemsResponse = z.infer<typeof DashboardPendingItemsSchema>;

export const DashboardCompositeSchema = z.object({
  insights: DashboardInsightsSchema,
  cajaStats: DashboardCajaStatsSchema,
  loggedUsers: DashboardLoggedUsersSchema,
  timers: z.array(DashboardTimerSchema),
  // `RoomRepository.getAll()` ya devuelve filas parseadas con este mismo schema.
  rooms: z.array(RoomSchema),
  recentActivity: z.array(DashboardRecentActivitySchema),
  pendingServiceRequestsCount: numero,
  pendingItems: DashboardPendingItemsSchema
});

export type DashboardCompositeResponse = z.infer<typeof DashboardCompositeSchema>;
