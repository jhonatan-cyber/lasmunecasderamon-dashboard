import { z } from 'zod';

export const TipoSolicitudSchema = z.enum([
  'anticipo',
  'devolucion',
  'gratificacion',
  'servicio',
  'transferencia',
  'cierre_caja',
  'anulacion_venta',
  'anulacion_servicio',
  'anulacion_cuenta'
]);
export type TipoSolicitud = z.infer<typeof TipoSolicitudSchema>;
const id = z.string().trim().min(1).max(100);
const motivo = z.string().trim().min(1).max(1000);
const monto = z.number().finite().positive();
const base = { confirmar: z.literal(true), operacion_id: z.uuid() };

export const ConsultaSolicitudesSchema = z
  .object({
    tipo: TipoSolicitudSchema.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(100000).default(0)
  })
  .strict();

export const ComandoSolicitudSchema = z.discriminatedUnion('accion', [
  z
    .object({ ...base, accion: z.literal('crear_anticipo'), usuario_id: id, monto, motivo })
    .strict(),
  z
    .object({ ...base, accion: z.literal('crear_devolucion'), cliente_id: id, monto, motivo })
    .strict(),
  z
    .object({ ...base, accion: z.literal('crear_gratificacion'), usuario_id: id, monto, motivo })
    .strict(),
  z
    .object({
      ...base,
      accion: z.literal('crear_transferencia'),
      producto_id: id,
      presentacion_id: id,
      cantidad: z.number().int().positive().max(10000)
    })
    .strict(),
  z
    .object({
      ...base,
      accion: z.literal('crear_anulacion'),
      tipo: z.enum(['anulacion_venta', 'anulacion_servicio', 'anulacion_cuenta']),
      entidad_id: id,
      monto,
      motivo
    })
    .strict(),
  z
    .object({
      ...base,
      accion: z.literal('crear_servicio'),
      cliente_id: id.optional(),
      habitacion_id: id,
      anfitrionas_ids: z.array(id).min(1).max(20),
      precio_servicio: z.number().finite().nonnegative(),
      precio_habitacion: z.number().finite().nonnegative(),
      comision_anfitriona: z.number().finite().nonnegative(),
      num_clientes: z.number().int().positive(),
      tiempo: z.number().int().positive(),
      metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'prepago']),
      total: monto,
      iva: z.number().finite().nonnegative()
    })
    .strict(),
  z
    .object({
      ...base,
      accion: z.literal('resolver'),
      tipo: TipoSolicitudSchema,
      solicitud_id: id,
      decision: z.enum(['aprobar', 'rechazar']),
      monto_esperado: z.number().finite().nonnegative(),
      motivo: motivo.optional()
    })
    .strict(),
  z
    .object({
      ...base,
      accion: z.literal('entregar_anticipo'),
      solicitud_id: id,
      monto_esperado: monto
    })
    .strict(),
  z.object({ ...base, accion: z.literal('cerrar_caja'), caja_id: id, motivo }).strict()
]);
export type ComandoSolicitud = z.infer<typeof ComandoSolicitudSchema>;
