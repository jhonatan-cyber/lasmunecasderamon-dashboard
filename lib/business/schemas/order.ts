import { z } from 'zod';
import { BAUCHER_FOTO_MAX_CHARS, esBaucherDataUrlValido } from '@/lib/business/baucher';

const inventoryFields = {
  presentacion_id: z.string().nullable().optional(),
  tipo_venta: z.enum(['botella', 'shot']).optional(),
  shot_anfitriona: z.boolean().optional(),
  acompanamiento_botella: z
    .object({ presentacion_id: z.string().min(1), unidades: z.number().int().min(1).max(1000) })
    .optional(),
  acompanamiento_corto: z
    .object({
      presentacion_id: z.string().min(1),
      unidades: z.number().int().min(1).max(1000).optional(),
      ml_por_corto: z.number().int().min(1).max(10000).optional(),
      nombre: z.string().max(300).optional()
    })
    .refine(
      value => (value.unidades !== undefined) !== (value.ml_por_corto !== undefined),
      'Selecciona unidades completas del acompa\u00f1amiento'
    )
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
  /** Nombre del archivo del baucher guardado en `public/img/orders`. */
  baucher_foto: z.string().nullable().optional(),
  estado: z.number().optional().default(1),
  fecha_crea: z.string().or(z.date()).optional(),
  cliente_nombre: z.string().nullable().optional(),
  mesero_nombre: z.string().nullable().optional(),
  mesero_nick: z.string().nullable().optional(),
  nicks: z.string().nullable().optional()
});

export type OrderType = z.infer<typeof OrderSchema>;

export const OrderCreateSchema = z
  .object({
    codigo: z.string().min(1, 'Código es requerido'),
    meseroId: z.string().min(1, 'Mesero es requerido'),
    clienteId: z.string().nullable().optional(),
    subtotal: z.number().min(0),
    total: z.number().min(0),
    totalComision: z.number().min(0).optional().default(0),
    propina: z.number().min(0).optional().default(0),
    metodoPago: z.enum(['efectivo', 'tarjeta', 'transferencia']),
    /**
     * Foto del baucher en data URL (`data:image/jpeg;base64,…`): única constancia
     * del pago cuando el pedido es con transferencia. La app del garzón la saca
     * con la cámara y el formulario del dashboard la adjunta con el mismo campo
     * compartido; el servidor la guarda en `public/img/orders` y en
     * `pedidos.baucher_foto` solo queda el nombre del archivo.
     *
     * Es obligatoria con transferencia: el `superRefine` de abajo rechaza el
     * pedido sin ella, así ningún cliente (app, dashboard u otro) deja un pago
     * con transferencia sin constancia.
     */
    baucher_foto: z
      .string()
      .max(BAUCHER_FOTO_MAX_CHARS, 'La foto del baucher supera el tamaño máximo')
      .refine(esBaucherDataUrlValido, 'La foto del baucher no es una imagen válida')
      .optional(),
    device_date: z.string().optional(),
    detalles: z
      .array(
        z
          .object({
            ...inventoryFields,
            productoId: z.string().min(1),
            precio: z.number().min(0),
            comision: z.number().min(0).optional().default(0),
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
                Number.isInteger(d.cantidad) &&
                d.cantidad <= 99 &&
                d.presentacion_id !== d.acompanamiento_corto?.presentacion_id),
            'El corto necesita soda o gaseosa y ml por corto'
          )
          .refine(
            d => !d.acompanamiento_corto || d.tipo_venta === 'shot',
            'El consumo por ml corresponde a cortos'
          )
          .refine(
            d =>
              !d.acompanamiento_botella ||
              (d.tipo_venta !== 'shot' &&
                Boolean(d.presentacion_id) &&
                d.presentacion_id !== d.acompanamiento_botella.presentacion_id),
            'Acompa\u00f1amiento de botella inv\u00e1lido'
          )
          .transform(d =>
            d.tipo_venta === 'shot' && !d.shot_anfitriona
              ? { ...d, comision: 0, generaComision: 0, selectedHostesses: [], hostessId: null }
              : d
          )
          .refine(
            d =>
              d.tipo_venta !== 'shot' ||
              new Set([...d.selectedHostesses, ...(d.hostessId ? [d.hostessId] : [])]).size <=
                d.cantidad,
            'Se permite una anfitriona por unidad de corto'
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
  })
  .superRefine((data, ctx) => {
    if (data.metodoPago === 'transferencia' && !data.baucher_foto) {
      ctx.addIssue({
        code: 'custom',
        path: ['baucher_foto'],
        message: 'El pago con transferencia necesita la foto del baucher'
      });
    }
    for (const [index, d] of data.detalles.entries()) {
      const hosts = new Set([...d.selectedHostesses, ...(d.hostessId ? [d.hostessId] : [])]);
      if (
        (d.comision > 0 && (!hosts.size || d.generaComision !== 1)) ||
        (d.comision === 0 && hosts.size)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['detalles', index, 'selectedHostesses'],
          message: 'Asigna anfitrionas solamente a formatos con comision'
        });
      }
      if (d.subtotal !== d.precio * d.cantidad)
        ctx.addIssue({
          code: 'custom',
          path: ['detalles', index, 'subtotal'],
          message: 'Subtotal del producto incorrecto'
        });
    }
    const subtotal = data.detalles.reduce((sum, d) => sum + d.subtotal, 0);
    if (
      data.subtotal !== subtotal ||
      (data.total !== subtotal && data.total !== subtotal + data.propina)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['total'],
        message: 'El total no coincide con los productos y la propina'
      });
    }
  });

export type OrderCreateType = z.infer<typeof OrderCreateSchema>;
