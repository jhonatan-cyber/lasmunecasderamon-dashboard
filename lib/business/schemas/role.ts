import { z } from 'zod';

/** La interfaz web usa name/description; el módulo mantiene nombre/descripcion. */
export const RoleWriteSchema = z.preprocess(
  value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const input = value as Record<string, unknown>;
    return {
      nombre: input.nombre ?? input.name,
      descripcion: input.descripcion ?? input.description ?? ''
    };
  },
  z.object({
    nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
    descripcion: z.string().trim().max(2000)
  })
);
