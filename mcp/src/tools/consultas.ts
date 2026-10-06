import { z } from 'zod';
import { api, diagnosticarConexion } from '../api-client.js';
import { acotar, ok, fallo } from '../formato.js';

type Esquema = Record<string, z.ZodTypeAny>;

function consulta(
  description: string,
  esquema: Esquema | undefined,
  ejecutar: (args: any) => Promise<unknown>
) {
  return {
    description,
    inputSchema: esquema ?? {},
    execute: async (args: any) => {
      try {
        return ok(acotar(await ejecutar(args)));
      } catch (e) {
        return fallo(e);
      }
    }
  };
}

export const herramientas = {
  verificar_conexion: {
    description:
      'Diagnostica /api/ping y autenticación por separado: red, timeout, credenciales y permisos. Conserva ambos resultados aunque uno falle.',
    inputSchema: {},
    execute: async () => {
      const diagnostico = await diagnosticarConexion();
      return {
        ...ok(acotar(diagnostico)),
        structuredContent: diagnostico,
        ...(diagnostico.ok ? {} : { isError: true as const })
      };
    }
  },

  resumen_dashboard: consulta(
    'Resumen operativo del día (ventas, cuentas, ocupación): GET /api/stats/dashboard-summary.',
    undefined,
    async () => api('GET', '/api/stats/dashboard-summary')
  ),

  listar_ventas: consulta(
    'Lista ventas con filtros: GET /api/sales. Parámetros opcionales tipo, estado, page, limit (máx 100), search.',
    {
      tipo: z.string().optional().describe('Tipo de venta, p. ej. barra o champagne'),
      estado: z.string().optional().describe('Estado de la venta'),
      page: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      search: z.string().optional()
    },
    async a =>
      api('GET', '/api/sales', {
        query: { tipo: a.tipo, estado: a.estado, page: a.page, limit: a.limit, search: a.search }
      })
  ),

  listar_cuentas: consulta(
    'Lista cuentas de mesas y salas: GET /api/cuentas. Parámetros opcionales tipo y estado (p. ej. ABIERTA, CERRADA, PREP).',
    {
      tipo: z.string().optional(),
      estado: z.string().optional()
    },
    async a => api('GET', '/api/cuentas', { query: { tipo: a.tipo, estado: a.estado } })
  ),

  detalle_cuenta: consulta(
    'Detalle completo de una cuenta por id (consumos y totales): GET /api/cuentas/{id}. Útil para verificar montos antes de cobrar.',
    { id: z.string().min(1).describe('Identificador de la cuenta') },
    async a => api('GET', `/api/cuentas/${encodeURIComponent(a.id)}`)
  ),

  estado_caja: consulta(
    'Estado actual de la caja (turno abierto, montos): GET /api/cashregister/status.',
    undefined,
    async () => api('GET', '/api/cashregister/status')
  ),

  asistencia_hoy: consulta(
    'Asistencias marcadas hoy por el personal: GET /api/attendance/hoy.',
    undefined,
    async () => api('GET', '/api/attendance/hoy')
  ),

  agenda_rango: consulta(
    'Eventos de agenda en un rango: GET /api/calendar/data con startDate y endDate (YYYY-MM-DD) y type opcional (servicios|ventas).',
    {
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('Fecha inicial YYYY-MM-DD'),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('Fecha final YYYY-MM-DD'),
      type: z.enum(['servicios', 'ventas']).optional()
    },
    async a =>
      api('GET', '/api/calendar/data', {
        query: { startDate: a.startDate, endDate: a.endDate, type: a.type }
      })
  ),

  buscar_clientes: consulta(
    'Busca clientes por nombre o teléfono, con filtro opcional de saldo prepago: GET /api/clients.',
    {
      search: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
      con_saldo: z.boolean().optional().describe('true = solo clientes con saldo prepago')
    },
    async a =>
      api('GET', '/api/clients', {
        query: { search: a.search, limit: a.limit, con_saldo: a.con_saldo ? '1' : undefined }
      })
  ),

  habitaciones: consulta(
    'Estado de habitaciones y salas privadas: GET /api/rooms con filtro opcional status.',
    { status: z.string().optional().describe('p. ej. disponible, ocupada') },
    async a => api('GET', '/api/rooms', { query: { status: a.status } })
  ),

  temporizadores_activos: consulta(
    'Temporizadores de consumo en curso: GET /api/timers/active.',
    undefined,
    async () => api('GET', '/api/timers/active')
  )
};
