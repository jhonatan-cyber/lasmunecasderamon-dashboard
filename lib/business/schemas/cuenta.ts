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

export const DetalleCuentaSchema = z
  .object({
    ...inventoryFields,
    producto_id: z.string(),
    precio: z.coerce.number(),
    cantidad: z.coerce.number(),
    sub_total: z.coerce.number(),
    comision: z.coerce.number(),
    hostesses: z.array(z.string()).optional(),
    isChampagne: z.boolean().optional()
  })
  .refine(
    d =>
      !d.acompanamiento_corto ||
      (d.tipo_venta === 'shot' &&
        Boolean(d.presentacion_id) &&
        d.presentacion_id !== d.acompanamiento_corto.presentacion_id),
    'Consumo de corto invalido'
  )
  .transform(d =>
    d.tipo_venta === 'shot' && !d.shot_anfitriona ? { ...d, comision: 0, hostesses: [] } : d
  );

export const CuentaSchema = z.object({
  id: z.string().optional(),
  codigo: z.string().min(1, 'El código es requerido'),
  cliente_id: z.string().nullable().optional(),
  total_comision: z.number(),
  sub_total: z.number(),
  total: z.number(),
  habitacion_id: z.string().nullable().optional(),
  pedido_id: z.string().nullable().optional(),
  servicio_id: z.string().nullable().optional(),
  tiempo: z.number().optional(),
  detalles: z.array(DetalleCuentaSchema),
  usuarios: z.array(z.string()).optional(),
  estado: z.number().optional().default(1),
  fecha_crea: z.string().or(z.date()).optional(),
  fecha_mod: z.string().or(z.date()).optional(),
  created_by: z.string().optional()
});

export type CuentaType = z.infer<typeof CuentaSchema>;

export const CuentaCreateSchema = CuentaSchema.omit({
  id: true,
  fecha_crea: true,
  fecha_mod: true,
  created_by: true
});
