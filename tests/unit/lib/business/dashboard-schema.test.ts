import { describe, expect, it } from 'vitest';
import { DashboardCompositeSchema } from '@/lib/business/schemas/dashboard';

describe('DashboardCompositeSchema', () => {
  it('accepts generatedAt as an ISO datetime with UTC or an explicit offset', () => {
    const generatedAtSchema = DashboardCompositeSchema.shape.generatedAt;
    expect(generatedAtSchema.safeParse('2026-11-25T17:56:52.373Z').success).toBe(true);
    expect(generatedAtSchema.safeParse('2026-11-25T17:56:52.373+00:00').success).toBe(true);
  });

  it('rejects invalid generatedAt calendar dates', () => {
    const generatedAtSchema = DashboardCompositeSchema.shape.generatedAt;
    expect(generatedAtSchema.safeParse('2026-02-30T17:56:52.373+00:00').success).toBe(false);
  });
});
