import { z } from 'zod';
import { logger } from './logger';

export interface EntropyValidationResult {
  valid: boolean;
  score: number;
  reasons: string[];
}

function calculateEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const charCounts = new Map<string, number>();
  for (const char of str) {
    charCounts.set(char, (charCounts.get(char) || 0) + 1);
  }

  let entropy = 0;
  const len = str.length;
  for (const count of charCounts.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

function detectPatterns(str: string): string[] {
  const patterns: string[] = [];

  if (/(.)\1{3,}/.test(str)) {
    patterns.push('repeated_chars');
  }

  if (
    /(?:abcd|bcde|cdef|defg|efgh|fghi|ghij|hijk|ijkl|jklm|klmn|lmno|mnop|nopq|opqr|pqrs|qrst|rstu|stuv|tuvw|uvwx|vwxy|wxyz|0123|1234|2345|3456|4567|5678|6789)/i.test(
      str
    )
  ) {
    patterns.push('sequential');
  }

  if (
    /^(password|qwerty|admin|123456|letmein|welcome|monkey|dragon|master|login|shadow|sunshine|princess|football|super|baseball|michael|jesus|ninja|mustang|batman)/i.test(
      str
    )
  ) {
    patterns.push('common_weak');
  }

  if (/(qwerty|asdf|zxcv|qazwsx|12345|54321|09876|0123456789|password|passwd)/i.test(str)) {
    patterns.push('keyboard');
  }

  if (/^[A-Za-z0-9+/]{50,}={0,2}$/.test(str) && str.length > 64 && /[+/=]/.test(str)) {
    patterns.push('base64');
  }

  return patterns;
}

export function validateJwtSecret(secret: string | undefined): EntropyValidationResult {
  const reasons: string[] = [];

  if (!secret) {
    return {
      valid: false,
      score: 0,
      reasons: ['JWT_SECRET is not defined']
    };
  }

  if (secret.length < 64) {
    reasons.push(`Length is ${secret.length}, minimum required is 64 characters`);
  }

  const entropy = calculateEntropy(secret);
  const normalizedScore = Math.min(100, Math.round((entropy / 6) * 100));

  if (normalizedScore < 60) {
    reasons.push(`Low entropy (score: ${normalizedScore}/100)`);
  }

  const patterns = detectPatterns(secret);
  if (patterns.length > 0) {
    reasons.push(`Detected weak patterns: ${patterns.join(', ')}`);
  }

  const valid = secret.length >= 64 && normalizedScore >= 60 && patterns.length === 0;

  return {
    valid,
    score: normalizedScore,
    reasons
  };
}

function validateStartupEnv() {
  const jwtValidation = validateJwtSecret(process.env.JWT_SECRET);

  if (!jwtValidation.valid) {
    logger.error('JWT_SECRET validation failed at startup:', {
      reasons: jwtValidation.reasons,
      score: jwtValidation.score
    });

    console.error('\n============================================');
    console.error('SECURITY ERROR: JWT_SECRET is missing or weak');
    console.error('============================================');
    console.error('Requirements:');
    console.error('  - Minimum 64 characters');
    console.error('  - High entropy (random characters)');
    console.error('  - No repeated patterns or common words');
    console.error('');
    console.error('Issues found:');
    jwtValidation.reasons.forEach(reason => console.error(`  - ${reason}`));
    console.error('============================================\n');

    process.exit(1);
  }

  logger.info('JWT_SECRET validation passed', { score: jwtValidation.score });
}

const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
if (
  process.env.NODE_ENV === 'production' &&
  !isBuildTime &&
  process.env.SKIP_JWT_VALIDATION !== 'true'
) {
  validateStartupEnv();
}

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
  NEXT_PUBLIC_API_URL: z.string().default('/api')
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  logger.error('Error de validación en variables de entorno:', _env.error.format());

  throw new Error('Variables de entorno inválidas');
}

export const env = _env.data;
