import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DB_HOST: z.string().default('127.0.0.1'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('lasmunecasderamon'),
  DB_PORT: z.coerce.number().default(3306),
  
  // Auth
  JWT_SECRET: z.string().min(8, 'JWT_SECRET debe tener al menos 8 caracteres'),
  
  // External APIs (Optional for basic running, but good to have)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  ADMIN_WHATSAPP_NUMBER: z.string().optional(),
  
  // URLs
  NEXT_PUBLIC_BASE_URL: z.string().url().default('http://localhost'),
  NEXT_PUBLIC_API_URL: z.string().default('/api'),
});

/**
 * Validamos las variables de entorno al iniciar.
 * Si algo falta o está mal, tiramos un error claro.
 */
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Error de validación en variables de entorno:', _env.error.format());
  throw new Error('Variables de entorno inválidas');
}

export const env = _env.data;
