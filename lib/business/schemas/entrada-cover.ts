import { z } from 'zod';
import { acompanamientoBotellaItemSchema } from './acompanamiento';

export const entregaGrupoCoverSchema = z.object({
  entrada_ids: z
    .array(z.string().trim().min(1).max(36))
    .min(1)
    .max(100)
    .refine(ids => new Set(ids).size === ids.length, 'Las entradas no pueden repetirse'),
  monto_adicional: z.number().int().min(0).max(2147483647),
  unidades: z
    .array(
      z.object({
        presentacion_id: z.string().trim().min(1).max(36),
        tipo_entrega: z.enum(['botella', 'corte']),
        acompanamientos: z.array(acompanamientoBotellaItemSchema).max(50).nullable().optional()
      })
    )
    .min(1)
    .max(500)
});

export const solicitudCoverSchema = entregaGrupoCoverSchema.extend({
  grupo_registro_id: z.string().max(36).nullable().optional(),
  cliente_nombre: z.string().trim().max(200).nullable().optional()
});
