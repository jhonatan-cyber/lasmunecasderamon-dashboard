import { z } from 'zod';
import { paginar, paginacion } from '../paginacion.js';
import { api, diagnosticarConexion } from '../api-client.js';
import {
  acotar,
  envolver,
  esquemaDiagnostico,
  esquemaSalida,
  fallo
} from '../formato.js';

type Esquema = Record<string, z.ZodTypeAny>;

function consulta(
  description: string,
  esquema: Esquema | undefined,
  ejecutar: (args: any) => Promise<unknown>
) {
  // El SDK ya valida la entrada antes de llamar; volver a validar aquí hace que
  // invocar `execute` directamente (u otro registro futuro) no se salte los límites.
  const schema = z.object(esquema ?? {}).strict();
  return {
    description,
    inputSchema: esquema ?? {},
    outputSchema: esquemaSalida,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    execute: async (args: any) => {
      try {
        return envolver(await ejecutar(schema.parse(args ?? {})));
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
    outputSchema: esquemaDiagnostico,
    execute: async () => {
      const diagnostico = await diagnosticarConexion();
      return {
        content: [{ type: 'text' as const, text: acotar(diagnostico) }],
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
      estado: z.string().optional(),
      ...paginacion
    },
    async a => paginar(await api('GET', '/api/cuentas', { query: { tipo: a.tipo, estado: a.estado } }), a)
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

  ranking_asistencia: consulta(
    'Usuarios con más asistencias y faltas, incluyendo empates. Jornada martes a domingo: cuenta días laborales sin presencia como faltas. Sin fechas consulta desde la primera marca de cada usuario hasta ayer en America/La_Paz; startDate y endDate filtran fechas inclusivas, sin contar días en curso o futuros. Incluye asistencias pagadas.',
    { startDate: z.iso.date().optional(), endDate: z.iso.date().optional() },
    async a => {
      if (a.startDate && a.endDate && a.startDate > a.endDate)
        throw new Error('La fecha inicial debe ser anterior o igual a la final');
      return api('GET', '/api/attendance/ranking', {
        query: { startDate: a.startDate, endDate: a.endDate }
      });
    }
  ),

  agenda_rango: consulta(
    'Eventos de agenda en un rango: GET /api/calendar/data con startDate y endDate (YYYY-MM-DD) y type opcional (servicios|ventas).',
    {
      startDate: z.iso.date()
        .describe('Fecha inicial YYYY-MM-DD'),
      endDate: z.iso.date()
        .describe('Fecha final YYYY-MM-DD'),
      type: z.enum(['servicios', 'ventas']).optional()
    },
    async a => {
      if (a.startDate > a.endDate) throw new Error('La fecha inicial debe ser anterior o igual a la final');
      return api('GET', '/api/calendar/data', {
        query: { startDate: a.startDate, endDate: a.endDate, type: a.type }
      });
    }
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
  ),

  buscar_producto: consulta(
    'Catálogo de productos: GET /api/products. term busca por nombre y tiene prioridad sobre category_id; para_venta limita a presentaciones con stock en el bar. Sin parámetros devuelve la primera página; limit/offset permiten recorrer el catálogo.',
    {
      ...paginacion,
      term: z.string().min(1).optional().describe('Texto a buscar en el nombre del producto'),
      category_id: z.string().min(1).optional().describe('Identificador de la categoría'),
      para_venta: z
        .boolean()
        .optional()
        .describe('true = sólo presentaciones con stock en el bar (catálogo para vender)')
    },
    async a =>
      paginar(await api('GET', '/api/products', {
        query: {
          term: a.term,
          category_id: a.category_id,
          for_sale: a.para_venta ? '1' : undefined
        }
      }), a, ['products', 'items'])
  ),

  detalle_producto: consulta(
    'Detalle de un producto por id, con presentaciones, precios y stock: GET /api/products?id=.',
    { id: z.string().min(1).describe('Identificador del producto') },
    async a => api('GET', '/api/products', { query: { id: a.id } })
  ),

  listar_transferencias: consulta(
    'Stock del bar e historial de transferencias almacén → bar: GET /api/transfers. Devuelve { items, history }. Las pendientes de aceptar o rechazar están en transferencias_pendientes.',
    paginacion,
    async a => paginar(await api('GET', '/api/transfers'), a, ['items', 'history'])
  ),

  transferencias_pendientes: consulta(
    'Transferencias de almacén al bar pendientes de resolver: GET /api/transfers/pending. Para aprobar o rechazar, consultar detalle_solicitud con tipo=transferencia y usar resolver_solicitud con confirmación explícita; el receptor debe ser distinto del emisor.',
    paginacion,
    async a => paginar(await api('GET', '/api/transfers/pending'), a, ['items'])
  ),

  historial_cajas: consulta(
    'Historial de cajas (turnos): GET /api/cashregister. con_resumen devuelve sólo el agregado; sin él pagina las cajas con limit/offset. Para el turno abierto usa estado_caja.',
    {
      ...paginacion,
      con_resumen: z
        .boolean()
        .optional()
        .describe('true = resumen agregado en vez del historial completo')
    },
    async a => {
      const datos = await api('GET', '/api/cashregister', { query: { resumen: a.con_resumen ? '1' : undefined } });
      return a.con_resumen ? datos : paginar(datos, a);
    }
  ),

  reporte_ventas: consulta(
    'Reporte de ventas: GET /api/reports/sales con totales por método de pago, ventas por día y shots. period por defecto today; custom exige startDate y endDate.',
    {
      period: z
        .enum([
          'today',
          'yesterday',
          'week',
          'month',
          'custom',
          'current_month',
          'last_month',
          'current_year',
          'last_year'
        ])
        .optional()
        .describe('Rango del informe; por defecto today'),
      startDate: z.iso.date()
        .optional()
        .describe('Fecha inicial YYYY-MM-DD (requerida con period=custom)'),
      endDate: z.iso.date()
        .optional()
        .describe('Fecha final YYYY-MM-DD (requerida con period=custom)')
    },
    async a => {
      const period = a.period ?? 'today';
      if (period === 'custom' && !(a.startDate && a.endDate))
        throw new Error('period=custom exige startDate y endDate (YYYY-MM-DD)');
      if (a.startDate && a.endDate && a.startDate > a.endDate)
        throw new Error('La fecha inicial debe ser anterior o igual a la final');
      return api('GET', '/api/reports/sales', {
        query: { period, startDate: a.startDate, endDate: a.endDate }
      });
    }
  ),

  auditoria_reciente: consulta(
    'Últimos eventos de auditoría del dashboard: GET /api/audit-logs, más recientes primero. limit 1–200, por defecto 50.',
    {
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Cantidad de eventos, por defecto 50')
    },
    async a => api('GET', '/api/audit-logs', { query: { limit: a.limit } })
  )
};
