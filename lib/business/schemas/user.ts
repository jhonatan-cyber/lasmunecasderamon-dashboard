import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().optional(),
  run: z.string().min(1, 'RUN es requerido'),
  nick: z.string().nullable().optional(),
  name: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  maritalStatus: z.string().nullable().optional(),
  afp: z.string().optional(),
  rol_id: z.string().min(1, 'Rol es requerido').or(z.number().min(1, 'Rol es requerido')),
  role: z.string().nullable().optional(),
  salary: z.coerce.number().min(0).optional(),
  contributions: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).nullable().optional(),
  foto: z.string().nullable().optional(),
  status: z.coerce.number().optional(),
  estado: z.coerce.number().optional(),
  estado_servicio: z.coerce.number().optional().default(0),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const UserCreateSchema = UserSchema.omit({ id: true });
export const UserUpdateSchema = UserSchema.partial().extend({ id: z.string().or(z.number()) });

export type UserType = z.infer<typeof UserSchema>;
