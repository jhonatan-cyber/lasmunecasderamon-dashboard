import { z } from 'zod';

export const PermissionCreateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional().nullable().transform(v => v ?? undefined),
  module: z.string().min(1, 'El módulo es requerido').max(100, 'El módulo no puede exceder 100 caracteres'),
  action: z.string().min(1, 'La acción es requerida').max(50, 'La acción no puede exceder 50 caracteres')
});

export const PermissionUpdateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede exceder 100 caracteres').optional(),
  description: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional().nullable().transform(v => v ?? undefined),
  module: z.string().min(1, 'El módulo es requerido').max(100, 'El módulo no puede exceder 100 caracteres').optional(),
  action: z.string().min(1, 'La acción es requerida').max(50, 'La acción no puede exceder 50 caracteres').optional()
}).refine(data => data.name || data.description !== undefined || data.module || data.action, {
  message: 'Al menos un campo debe ser proporcionado para actualizar'
});
