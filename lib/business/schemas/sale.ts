import { z } from 'zod';

export const SaleSchema = z.object({
  id: z.string().optional(),
  codigo: z.string().nullable().optional(),
  cliente_id: z.string().nullable().optional(),
  pedido_id: z.string().nullable().optional(),
  servicio_id: z.string().min(1).nullable().optional(),
  habitacion_id: z.string().nullable().optional(),
  metodo_pago: z
    .enum(['efectivo', 'tarjeta', 'transferencia', 'prepago', 'mixto'])
    .optional()
    .default('efectivo'),
  metodologia_pago: z.string().nullable().optional(),
  monto_prepago: z.number().optional().default(0),
  monto_adicional: z.number().optional().default(0),
  propina: z.number().optional().default(0),
  sub_total: z.number().optional().default(0),
  total: z.number().min(0),
  tiempo: z.number().optional().default(0),
  caja_id: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  cajero_nick: z.string().nullable().optional(),
  cajero_nombre: z.string().nullable().optional(),
  estado: z.number().optional().default(1),
  fecha_crea: z.string().or(z.date()).nullable().optional(),
  fecha_mod: z.string().or(z.date()).nullable().optional(),
  cliente_nombre: z.string().nullable().optional(),
  habitacion_numero: z.string().nullable().optional(),
  habitacion_nombre: z.string().nullable().optional(),
  item_count: z.number().optional().default(0),
  anfitrionas_nicks: z.string().nullable().optional(),
  pagos_mixtos: z.any().optional()
});

export const SaleCreateSchema = z.object({
  total: z.number().min(0),
  sub_total: z.number().optional(),
  total_comision: z.number().optional().default(0),
  cliente_id: z.string().nullable().optional(),
  pedido_id: z.string().nullable().optional(),
  servicio_id: z.string().min(1).nullable().optional(),
  servicio_anfitrionas: z.array(z.string().min(1)).max(100).optional(),
  habitacion_id: z.string().nullable().optional(),
  metodo_pago: z
    .enum(['efectivo', 'tarjeta', 'transferencia', 'prepago', 'mixto'])
    .optional()
    .default('efectivo'),
  metodo_pago_adicional: z
    .enum(['efectivo', 'tarjeta', 'transferencia', 'prepago', 'mixto'])
    .nullable()
    .optional(),
  monto_prepago: z.number().optional().default(0),
  monto_adicional: z.number().optional().default(0),
  pagos_mixtos: z.any().optional(),
  propina: z.number().optional().default(0),
  usuarios: z.array(z.string()).optional().default([]),
  tiempo: z.number().optional().default(0),
  codigo: z.string().optional(),
  device_date: z.string().optional(),
  detalles: z
    .array(
      z
        .object({
          producto_id: z.string(),
          presentacion_id: z.string().nullable().optional(),
          // 'shot' descuenta ml de la botella abierta en el bar; por defecto, botella entera.
          tipo_venta: z.enum(['botella', 'shot']).optional(),
          // El shot puede cobrarse a precio de cliente (default) o de anfitriona.
          acompanamiento_botella: z
            .object({
              presentacion_id: z.string().min(1),
              unidades: z.number().int().min(1).max(1000)
            })
            .optional(),
          acompanamiento_corto: z
            .object({
              presentacion_id: z.string().min(1),
              unidades: z.number().int().min(1).max(1000).optional(),
              ml_por_corto: z.number().int().min(1).max(10000).optional()
            })
            .refine(
              value => (value.unidades !== undefined) !== (value.ml_por_corto !== undefined),
              'Selecciona unidades completas del acompa\u00f1amiento'
            )
            .optional(),
          shot_anfitriona: z.boolean().optional().default(false),
          precio: z.number(),
          comision: z.number().optional().default(0),
          cantidad: z.number().min(1),
          sub_total: z.number().optional(),
          hostess_id: z.string().nullable().optional(),
          hostesses: z.array(z.string()).optional(),
          isChampagne: z.boolean().optional()
        })
        .refine(
          detail =>
            (!detail.acompanamiento_botella ||
              (detail.tipo_venta !== 'shot' &&
                Boolean(detail.presentacion_id) &&
                detail.presentacion_id !== detail.acompanamiento_botella.presentacion_id)) &&
            (!detail.acompanamiento_corto ||
              (detail.tipo_venta === 'shot' &&
                Boolean(detail.presentacion_id) &&
                detail.presentacion_id !== detail.acompanamiento_corto.presentacion_id)),
          'La bebida requiere el tipo de venta correcto y una presentación distinta'
        )
        .refine(
          detail =>
            detail.tipo_venta !== 'shot' ||
            (Number.isInteger(detail.cantidad) && detail.cantidad <= 99),
          'La cantidad de cortos debe ser un entero entre 1 y 99'
        )
        .transform(detail =>
          detail.tipo_venta === 'shot' && !detail.shot_anfitriona
            ? { ...detail, comision: 0, hostess_id: null, hostesses: [] }
            : detail
        )
        .refine(
          detail =>
            detail.tipo_venta !== 'shot' ||
            new Set([
              ...(detail.hostesses ?? []),
              ...(detail.hostess_id ? [detail.hostess_id] : [])
            ]).size <= detail.cantidad,
          'Se permite una anfitriona por unidad de corto'
        )
    )
    .min(1, 'Al menos un detalle es requerido')
});

export type SaleType = z.infer<typeof SaleSchema>;
