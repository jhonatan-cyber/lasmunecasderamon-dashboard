import { describe, expect, it } from 'vitest';
import { normalizeDateValueForResponse } from '@/lib/api/date-response';
import { DashboardCompositeSchema } from '@/lib/business/schemas/dashboard';

describe('normalizeDateValueForResponse', () => {
  it('preserves generatedAt as an ISO timestamp while normalizing business dates', () => {
    const generatedAt = '2026-11-26T03:14:16.928Z';
    const result = normalizeDateValueForResponse({ generatedAt, createdAt: generatedAt }) as {
      generatedAt: string;
      createdAt: string;
    };

    expect(result.generatedAt).toBe(generatedAt);
    expect(DashboardCompositeSchema.shape.generatedAt.safeParse(result.generatedAt).success).toBe(
      true
    );
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
