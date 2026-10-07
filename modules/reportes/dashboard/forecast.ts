export function buildShiftForecast(row: Record<string, unknown> = {}) {
  const currentRevenue = Math.max(0, Number(row.current_revenue) || 0);
  const elapsedMinutes = Math.max(0, Number(row.elapsed_minutes) || 0);
  const expectedMinutes = Math.max(0, Number(row.expected_minutes) || 0);
  const historyCount = Number(row.history_count) || 0;
  const status = !row.caja_id
    ? 'closed'
    : elapsedMinutes < 30 || elapsedMinutes > 24 * 60 || historyCount < 3 || !expectedMinutes
      ? 'insufficient'
      : 'ready';
  return {
    status,
    currentRevenue,
    yesterdayRevenue: Math.max(0, Number(row.previous_revenue) || 0),
    projectedRevenue:
      status === 'ready'
        ? Math.round(currentRevenue * Math.max(1, expectedMinutes / elapsedMinutes))
        : null,
    elapsedMinutesToday: elapsedMinutes,
    expectedMinutes,
    historyCount,
    anomalies:
      elapsedMinutes > 24 * 60
        ? [
            {
              id: 'stale-caja',
              tone: 'warning' as const,
              title: 'Revisar caja abierta',
              description:
                'La caja lleva más de 24 horas abierta. Revisa su cierre antes de estimar el próximo turno.'
            }
          ]
        : []
  };
}
