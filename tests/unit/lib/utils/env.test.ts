import { describe, it, expect, vi, beforeEach } from 'vitest';




vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));




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

function validateJwtSecret(secret: string | undefined): {
  valid: boolean;
  score: number;
  reasons: string[];
} {
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

describe('validateJwtSecret', () => {
  describe('missing or undefined secrets', () => {
    it('should return invalid for undefined secret', () => {
      const result = validateJwtSecret(undefined);
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('JWT_SECRET is not defined');
    });

    it('should return invalid for empty string', () => {
      const result = validateJwtSecret('');
      expect(result.valid).toBe(false);
    });
  });

  describe('length validation', () => {
    it('should return invalid for secrets shorter than 64 characters', () => {
      const result = validateJwtSecret('shortpassword123');
      expect(result.valid).toBe(false);
      expect(result.reasons.some(r => r.includes('Length'))).toBe(true);
    });

    it('should accept 64+ character secrets with high entropy', () => {
      const strongSecret = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2';
      const result = validateJwtSecret(strongSecret);
      expect(result.valid).toBe(true);
    });
  });

  describe('entropy validation', () => {
    it('should return invalid for low entropy (repeated characters)', () => {
      const weakSecret = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const result = validateJwtSecret(weakSecret);
      expect(result.valid).toBe(false);
      expect(result.reasons.some(r => r.includes('Low entropy') || r.includes('repeated'))).toBe(
        true
      );
    });

    it('should return invalid for sequential patterns', () => {
      const sequential = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijkl';
      const result = validateJwtSecret(sequential);
      expect(result.valid).toBe(false);
      expect(result.reasons.some(r => r.includes('sequential'))).toBe(true);
    });

    it('should return invalid for common weak passwords', () => {
      const commonPassword = 'password123456789012345678901234567890123456789012345678901234567890';
      const result = validateJwtSecret(commonPassword);
      expect(result.valid).toBe(false);
      expect(result.reasons.some(r => r.includes('common_weak'))).toBe(true);
    });
  });

  describe('strong secrets', () => {
    it('should accept high-entropy random string with special chars', () => {
      
      const randomSecret = 'kL9mN2pQ4rS6tU8vW0xY2zA4bC6dE8fG0hJ2kM4nP6qR8sT0!uV2wX4yZ6aB8cD0eF2gH4';
      const result = validateJwtSecret(randomSecret);
      expect(result.valid).toBe(true);
    });

    it('should accept long hex-like secrets', () => {
      const hexSecret =
        '8621c05bbced440a09fee8f81408641b8bc99feadc865e4891eb38f07c0df9f0e2456b070c10897089ca8058692464a81936785f6864342c2a5279adb0c7ce4a';
      const result = validateJwtSecret(hexSecret);
      expect(result.valid).toBe(true);
    });

    it('should return high score for strong secrets with mixed chars', () => {
      
      const strongSecret =
        'Sunset@Over#Ocean$Wave%2024^Mountain&Peak*Forest(River)Valley+Wild/Animal=Journey';
      const result = validateJwtSecret(strongSecret);
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(60);
    });
  });
});
