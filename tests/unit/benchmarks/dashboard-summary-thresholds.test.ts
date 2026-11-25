import { describe, expect, it } from 'vitest';
import {
  getDashboardSummaryThresholdViolations,
  parseDashboardSummaryThresholds
} from '../../benchmarks/dashboard-summary-thresholds';

describe('dashboard summary benchmark thresholds', () => {
  it('leaves thresholds opt-in when no limits are configured', () => {
    expect(parseDashboardSummaryThresholds({})).toEqual({});
  });

  it('parses independently configured median and p95 limits', () => {
    expect(
      parseDashboardSummaryThresholds({
        DASHBOARD_SUMMARY_MAX_MEDIAN_MS: '250',
        DASHBOARD_SUMMARY_MAX_P95_MS: '400'
      })
    ).toEqual({ medianMs: 250, p95Ms: 400 });
  });

  it.each(['abc', '0', '-1', 'Infinity'])('rejects invalid limit %s', value => {
    expect(() => parseDashboardSummaryThresholds({ DASHBOARD_SUMMARY_MAX_P95_MS: value })).toThrow(
      'DASHBOARD_SUMMARY_MAX_P95_MS debe ser un número mayor que 0'
    );
  });

  it('reports only metrics that exceed their configured limits', () => {
    expect(
      getDashboardSummaryThresholdViolations(
        { medianMs: 251, p95Ms: 390 },
        { medianMs: 250, p95Ms: 400 }
      )
    ).toEqual(['mediana 251.00 ms supera el límite de 250 ms']);
  });
});
