import { z } from 'zod';
import { montoSchema, descripcionSchema, idSchema } from './validationMessages';

export const GratificacionCreateSchema = z.object({
  usuario_id: idSchema(),
  monto: montoSchema(),
  descripcion: descripcionSchema()
});

export const GratificacionUpdateSchema = z.object({
  monto: montoSchema(),
  descripcion: descripcionSchema()
});
