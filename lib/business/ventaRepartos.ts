export type MixedPayment = { metodo: string; monto: number };
export type AllocationRow<T> = T & { currentAmount: number; nextAmount?: number };

export function parseMixedPayments(raw: unknown): MixedPayment[] {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item: Record<string, unknown>) => ({
      metodo: String(item?.metodo || ''),
      monto: Number(item?.monto || 0)
    }))
    .filter((item: MixedPayment) => item.metodo && item.monto > 0);
}

export function normalizeSolicitudStatus(status: string): 'confirmada' | 'rechazada' {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'aprobado' || normalized === 'confirmado' || normalized === 'confirmada'
    ? 'confirmada'
    : 'rechazada';
}

export function allocateProportionally<T>(
  rows: T[],
  getAmount: (row: T) => number,
  targetTotal: number
): AllocationRow<T>[] {
  const normalizedTarget = Math.max(0, Math.round(Number(targetTotal || 0)));
  const baseRows = rows.map(row => ({
    ...row,
    currentAmount: Math.max(0, Math.round(Number(getAmount(row) || 0)))
  }));
  const currentTotal = baseRows.reduce((sum, row) => sum + row.currentAmount, 0);
  if (currentTotal <= 0 || normalizedTarget <= 0) {
    return baseRows.map(row => ({ ...row, nextAmount: 0 }));
  }
  const allocated = baseRows.map(row => ({
    ...row,
    nextAmount: Math.floor((row.currentAmount * normalizedTarget) / currentTotal)
  }));
  let assigned = allocated.reduce((sum, row) => sum + Number(row.nextAmount || 0), 0);
  let remainder = Math.max(0, normalizedTarget - assigned);
  let cursor = 0;
  while (remainder > 0 && allocated.length > 0) {
    allocated[cursor % allocated.length].nextAmount =
      Number(allocated[cursor % allocated.length].nextAmount || 0) + 1;
    remainder -= 1;
    cursor += 1;
  }
  return allocated;
}
