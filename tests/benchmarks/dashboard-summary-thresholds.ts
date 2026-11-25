export interface DashboardSummaryMetrics {
  medianMs: number;
  p95Ms: number;
}

export interface DashboardSummaryThresholds {
  medianMs?: number;
  p95Ms?: number;
}

function parseThreshold(value: string | undefined, variable: string): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;

  const threshold = Number(value);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new Error(`${variable} debe ser un número mayor que 0`);
  }

  return threshold;
}

export function parseDashboardSummaryThresholds(
  environment: Record<string, string | undefined>
): DashboardSummaryThresholds {
  const medianMs = parseThreshold(
    environment.DASHBOARD_SUMMARY_MAX_MEDIAN_MS,
    'DASHBOARD_SUMMARY_MAX_MEDIAN_MS'
  );
  const p95Ms = parseThreshold(
    environment.DASHBOARD_SUMMARY_MAX_P95_MS,
    'DASHBOARD_SUMMARY_MAX_P95_MS'
  );

  return {
    ...(medianMs === undefined ? {} : { medianMs }),
    ...(p95Ms === undefined ? {} : { p95Ms })
  };
}

export function getDashboardSummaryThresholdViolations(
  metrics: DashboardSummaryMetrics,
  thresholds: DashboardSummaryThresholds
): string[] {
  const violations: string[] = [];

  if (thresholds.medianMs !== undefined && metrics.medianMs > thresholds.medianMs) {
    violations.push(
      `mediana ${metrics.medianMs.toFixed(2)} ms supera el límite de ${thresholds.medianMs} ms`
    );
  }
  if (thresholds.p95Ms !== undefined && metrics.p95Ms > thresholds.p95Ms) {
    violations.push(
      `p95 ${metrics.p95Ms.toFixed(2)} ms supera el límite de ${thresholds.p95Ms} ms`
    );
  }

  return violations;
}
