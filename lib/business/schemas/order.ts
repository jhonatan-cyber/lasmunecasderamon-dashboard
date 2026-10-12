import { z } from 'zod';
const inventoryFields = {
  presentacion_id: z.string().nullable().optional(),
  tipo_venta: z.enum(['botella', 'shot']).optional(),
  shot_anfitriona: z.boolean().optional(),
  acompanamiento_corto: z
    .object({
      presentacion_id: z.string().min(1),
      ml_por_corto: z.number().int().min(1).max(10000),
      nombre: z.string().max(300).optional()
    })
    .optional()
};

export const OrderSchema = z.object({
  id: z.string().optional(),
  codigo: z.string().optional(),
  mesero_id: z.string().optional(),
  cliente_id: z.string().nullable().optional(),
  subtotal: z.number().optional().default(0),
  total: z.number().min(0),
  total_comision: z.number().optional().default(0),
  propina: z.number().optional().default(0),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia']).nullable().optional(),
  estado: z.number().optional().default(1),
  fecha_crea: z.string().or(z.date()).optional(),
  cliente_nombre: z.string().nullable().optional(),
  mesero_nombre: z.string().nullable().optional(),
  mesero_nick: z.string().nullable().optional(),
  nicks: z.string().nullable().optional()
});

export type OrderType = z.infer<typeof OrderSchema>;

export const OrderCreateSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
  meseroId: z.string().min(1, 'Mesero es requerido'),
  clienteId: z.string().nullable().optional(),
  subtotal: z.number().min(0),
  total: z.number().min(0),
  totalComision: z.number().optional().default(0),
  propina: z.number().optional().default(0),
  metodoPago: z.enum(['efectivo', 'tarjeta', 'transferencia']).optional(),
  device_date: z.string().optional(),
  detalles: z
    .array(
      z
        .object({
          ...inventoryFields,
          productoId: z.string().min(1),
          precio: z.number().min(0),
          comision: z.number().optional().default(0),
          generaComision: z.number().optional().default(1),
          cantidad: z.number().min(1),
          subtotal: z.number().min(0),
          hostessId: z.string().nullable().optional(),
          roomId: z.string().nullable().optional(),
          selectedHostesses: z.array(z.string()).optional().default([])
        })
        .refine(
          d =>
            d.tipo_venta !== 'shot' ||
            (Boolean(d.presentacion_id) &&
              Boolean(d.acompanamiento_corto) &&
              Number.isInteger(d.cantidad) &&
              d.cantidad <= 99 &&
              d.presentacion_id !== d.acompanamiento_corto?.presentacion_id),
          'El corto necesita soda o gaseosa y ml por corto'
        )
        .refine(
          d => !d.acompanamiento_corto || d.tipo_venta === 'shot',
          'El consumo por ml corresponde a cortos'
        )
        .transform(d =>
          d.tipo_venta === 'shot' && !d.shot_anfitriona
            ? { ...d, comision: 0, generaComision: 0, selectedHostesses: [], hostessId: null }
            : d
        )
    )
    .min(1, 'Al menos un detalle es requerido'),
  usuarios: z
    .array(
      z.object({
        usuarioId: z.string()
      })
    )
    .optional()
    .default([])
});

export type OrderCreateType = z.infer<typeof OrderCreateSchema>;
