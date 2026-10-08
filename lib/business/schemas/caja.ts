import { z } from 'zod';

export const CashRegisterStatusSchema = z.object({
  hasOpenCaja: z.boolean().nullable(),
  cajaInfo: z
    .object({
      id_caja: z.string().or(z.number()),
      usuario_id_apertura: z.string().or(z.number()).nullable(),
      fecha_apertura: z.string().nullable(),
      efectivo_en_caja: z.number().optional().default(0)
    })
    .nullable()
});

export type CashRegisterStatusType = z.infer<typeof CashRegisterStatusSchema>;

export const CajaSchema = z.object({
  id_caja: z.string().or(z.number()).optional(),
  fecha_apertura: z.string().or(z.date()).optional(),
  usuario_id_apertura: z.string().optional(),
  monto_apertura: z.number().optional().default(0),
  estado: z.number().optional().default(1),
  fecha_cierre: z.string().or(z.date()).nullable().optional(),
  usuario_id_cierre: z.string().nullable().optional(),
  monto_cierre: z.number().nullable().optional(),
  ventas: z.number().optional().default(0),
  efectivo: z.number().optional().default(0),
  tarjeta: z.number().optional().default(0),
  transferencia: z.number().optional().default(0),
  servicios: z.number().optional().default(0),
  devoluciones: z.number().optional().default(0),
  prepago: z.number().optional().default(0),
  prepago_cargado: z.number().optional().default(0),
  prepago_consumido: z.number().optional().default(0),
  prepago_pendiente_clientes: z.number().optional().default(0),
  propina: z.number().optional().default(0),
  cuenta: z.number().optional().default(0),
  anticipo: z.number().optional().default(0),
  retiro_total: z.number().optional().default(0),
  egreso: z.number().optional().default(0),
  iva: z.number().optional().default(0),
  comision: z.number().optional().default(0),
  usuario_apertura: z.string().optional(),
  cajero_nombre: z.string().optional(),
  cajero_foto: z.string().optional(),
  cajero_cierre_nombre: z.string().nullable().optional(),
  cajero_cierre_foto: z.string().nullable().optional(),
  /** Cuándo se pidió el cierre. La caja sigue abierta hasta que el admin autorice. */
  cierre_solicitado_en: z.string().or(z.date()).nullable().optional(),
  /** Saldos de clientes que se descontaron del efectivo en este cierre. */
  saldo_clientes_descontado: z.number().optional().default(0),
  /** Saldo prepago pendiente de devolución tras agotar el efectivo del cierre. */
  saldo_clientes_por_devolver: z.number().optional().default(0),
  /** Hay una solicitud de cierre esperando autorización. */
  cierre_pendiente: z.boolean().optional().default(false),
  /** Quién pidió el cierre, si hay una solicitud pendiente. */
  cierre_solicitado_por: z.string().nullable().optional(),
  /**
   * Cuándo salió el último aviso al administrador (al pedir el cierre y en cada reenvío).
   * Si difiere de `cierre_solicitado_en`, hubo reenvíos.
   */
  cierre_ultimo_aviso_en: z.string().or(z.date()).nullable().optional(),
  /**
   * El cierre pendiente quedó sin respuesta (pasó la ventana de recordatorios): ya se puede
   * pedir el cierre de nuevo.
   */
  cierre_estancado: z.boolean().optional().default(false)
});

export type CajaType = z.infer<typeof CajaSchema>;

export const CajaOpenSchema = z.object({
  usuario_id_apertura: z.union([z.string(), z.number()]).transform(val => String(val)),
  monto_apertura: z.number().min(0, 'El monto de apertura debe ser mayor o igual a 0')
});

export const CajaUpdateSchema = z.object({
  id_caja: z
    .union([z.string(), z.number()])
    .transform(val => String(val))
    .optional(),
  ventas: z.number().optional(),
  efectivo: z.number().optional(),
  tarjeta: z.number().optional(),
  transferencia: z.number().optional(),
  servicios: z.number().optional(),
  devoluciones: z.number().optional()
});

export const CajaCloseSchema = z.object({
  id_caja: z.union([z.string(), z.number()]).transform(val => String(val)),
  monto_cierre: z.number().min(0).optional(),
  usuario_id_cierre: z.union([z.string(), z.number()]).transform(val => String(val))
});

/** El cajero pide el cierre; el administrador lo autoriza por WhatsApp. */
export const CajaSolicitarCierreSchema = z.object({
  id_caja: z.union([z.string(), z.number()]).transform(val => String(val)),
  motivo: z.string().trim().max(500).optional()
});

/** Resolución de la solicitud, desde el link del WhatsApp o el dashboard. */
export const CajaProcesarCierreSchema = z.object({
  token: z.string().trim().min(1, 'Token requerido'),
  action: z.enum(['confirmar', 'rechazar'])
});
