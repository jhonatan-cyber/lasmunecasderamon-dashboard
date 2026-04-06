import { z } from 'zod';
import { logger } from './logger';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('lasmunecasderamon'),
  DB_PORT: z.coerce.number().default(3306),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET debe tener al menos 8 caracteres'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  ADMIN_WHATSAPP_NUMBER: z.string().optional(),
  NEXT_PUBLIC_BASE_URL: z.string().url().default('http://localhost'),
  NEXT_PUBLIC_API_URL: z.string().default('/api'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  logger.error('Error de validación en variables de entorno:', _env.error.format());
  throw new Error('Variables de entorno inválidas');
}

export const env = _env.data;
