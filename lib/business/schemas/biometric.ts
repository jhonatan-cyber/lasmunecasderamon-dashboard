import { z } from 'zod';
import { nombreSchema, idSchema, ipv4Refinement, VALIDATION_MESSAGES } from './validationMessages';

export const BiometricDeviceCreateSchema = z.object({
  nombre: nombreSchema(),
  marca: z.enum(['dahua', 'zkteco']),
  modelo: z.string().max(100, VALIDATION_MESSAGES.max('Modelo', 100)).optional().nullable().transform(v => v ?? undefined),
  serial: idSchema({ label: 'Serial' }),
  ip: z.string().refine(ipv4Refinement, VALIDATION_MESSAGES.invalidIp).optional().nullable().transform(v => v ?? undefined)
});

export const BiometricReceptionUpdateSchema = z.object({
  habilitado: z.boolean()
});
