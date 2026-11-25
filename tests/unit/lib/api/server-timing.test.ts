import { describe, expect, it } from 'vitest';
import { addServerTimingMetric } from '@/lib/api/server-timing';

describe('server timing metrics', () => {
  it('does not expose timings unless the request opts in', () => {
    const response = new Response('ok');

    addServerTimingMetric(response, new Request('http://localhost'), 'handler', 12.345);

    expect(response.headers.has('server-timing')).toBe(false);
  });

  it('adds rounded metrics while preserving existing server timings', () => {
    const response = new Response('ok', { headers: { 'server-timing': 'cache;dur=2.00' } });
    const request = new Request('http://localhost', { headers: { 'x-lmr-profile': '1' } });

    addServerTimingMetric(response, request, 'handler', 12.345);

    expect(response.headers.get('server-timing')).toBe('cache;dur=2.00, handler;dur=12.35');
  });

  it('ignores invalid metric names and durations', () => {
    const response = new Response('ok');
    const request = new Request('http://localhost', { headers: { 'x-lmr-profile': '1' } });

    addServerTimingMetric(response, request, 'handler,secret', 12);
    addServerTimingMetric(response, request, 'cache', Number.NaN);

    expect(response.headers.has('server-timing')).toBe(false);
  });
});
