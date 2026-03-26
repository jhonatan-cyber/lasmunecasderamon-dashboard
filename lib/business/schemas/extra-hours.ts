import { z } from 'zod';

export const ExtraHoursSchema = z.object({
  id_hora_extra: z.string().optional(),
  usuario_id: z.string().min(1, 'Usuario es requerido'),
  hora: z.number().int().positive('La hora debe ser válida'),
  motivo: z.string().optional().default('Motivo no especificado'),
  solicitado_por: z.string().optional().default('Usuario del Sistema'),
  fecha_crea: z.string().or(z.date()).optional(),
});

export type ExtraHoursType = z.infer<typeof ExtraHoursSchema>;
