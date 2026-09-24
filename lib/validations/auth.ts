import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'El usuario es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});

export const registerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido: z.string().min(1, 'El apellido es obligatorio'),
  email: z.string().trim().min(1, 'El usuario (email) es obligatorio'),
  ci: z.string().min(4, 'El RUN (CI) debe tener al menos 4 caracteres')
});

export const resetPasswordSchema = z.object({
  run: z.string().trim().min(4, 'El RUN es obligatorio')
});

export const changePasswordSchema = z
  .object({
    password: z.string().trim().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma la contraseña')
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
