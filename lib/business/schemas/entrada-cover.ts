import { z } from 'zod';
import { acompanamientoBotellaItemSchema } from './acompanamiento';

const entradaIdSchema = z.string().trim().min(1).max(36);
const montoAdicionalSchema = z.number().int().min(0).max(2147483647);
const unidadCoverSchema = z.object({
  presentacion_id: z.string().trim().min(1).max(36),
  tipo_entrega: z.enum(['botella', 'corte']),
  acompanamientos: z.array(acompanamientoBotellaItemSchema).max(50).nullable().optional()
});

export const entregaGrupoCoverSchema = z.object({
  entrada_ids: z
    .array(entradaIdSchema)
    .min(1)
    .max(100)
    .refine(ids => new Set(ids).size === ids.length, 'Las entradas no pueden repetirse'),
  monto_adicional: montoAdicionalSchema,
  unidades: z.array(unidadCoverSchema).min(1).max(500)
});

export const entregaIndividualCoverSchema = z.object({
  entregas: z
    .array(
      z.object({
        entrada_id: entradaIdSchema,
        monto_adicional: montoAdicionalSchema,
        unidades: z.array(unidadCoverSchema).min(1).max(500),
        anfitriona_id: entradaIdSchema.nullable().optional(),
        habitacion_id: entradaIdSchema.nullable().optional()
      })
    )
    .min(1)
    .max(100)
    .refine(
      entregas => new Set(entregas.map(entrega => entrega.entrada_id)).size === entregas.length,
      'Las entradas no pueden repetirse'
    )
    .refine(
      entregas => entregas.reduce((total, entrega) => total + entrega.unidades.length, 0) <= 500,
      'La entrega no puede superar 500 productos'
    )
});

export const entregaCoverSchema = z.union([entregaGrupoCoverSchema, entregaIndividualCoverSchema]);

export const solicitudCoverSchema = entregaGrupoCoverSchema.extend({
  grupo_registro_id: z.string().max(36).nullable().optional(),
  cliente_nombre: z.string().trim().max(200).nullable().optional()
});
