import { z } from 'zod';

export const ClientSchema = z.object({
  id: z.string().optional(),
  run: z.string().optional().default(''),
  name: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  phone: z.string().optional().default(''),
  saldo: z.number().optional().default(0),
  deuda: z.number().optional().default(0),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
  status: z.number().optional().default(1),
});

export type ClientType = z.infer<typeof ClientSchema>;
