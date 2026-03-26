import { z } from 'zod';

export const AttendanceSchema = z.object({
  id: z.string().optional(),
  usuario_id: z.string(),
  fecha: z.string(),
  hora: z.string(),
  estado: z.number().optional().default(1)
});

export type AttendanceType = z.infer<typeof AttendanceSchema>;

export const AttendanceRegisterSchema = z.object({
  qrData: z.string().min(1, 'Código QR requerido')
});
