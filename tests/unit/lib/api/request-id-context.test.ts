// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { runWithRequestId } from '@/lib/api/request-id-context';

describe('request ID context', () => {
  it('keeps request IDs isolated across concurrent async work', async () => {
    const { getRequestId } =
      await vi.importActual<typeof import('@/lib/utils/logger')>('@/lib/utils/logger');
    const [firstRequestId, secondRequestId] = await Promise.all([
      runWithRequestId('request-one', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return getRequestId();
      }),
      runWithRequestId('request-two', async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return getRequestId();
      })
    ]);

    expect(firstRequestId).toBe('request-one');
    expect(secondRequestId).toBe('request-two');
  });
});
