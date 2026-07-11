/**
 * IVA configuration — reads the configured rate from the database.
 *
 * The API returns config grouped by category:
 *   data.facturacion.impuesto_iva = "19"
 *
 * Returns a decimal (e.g. 0.19 for 19%). Defaults to 0.19 if not configured.
 * Caches the value in memory for the session to avoid repeated fetches.
 */

let cachedRate: number | null = null;

export async function getIvaRate(): Promise<number> {
  if (cachedRate !== null) return cachedRate;

  try {
    const res = await fetch('/api/configurations');
    const result = await res.json();
    if (result.success && result.data?.facturacion?.impuesto_iva) {
      const pct = Number(result.data.facturacion.impuesto_iva);
      cachedRate = pct > 0 ? pct / 100 : 0.19;
    } else {
      cachedRate = 0.19;
    }
  } catch {
    cachedRate = 0.19;
  }

  return cachedRate;
}

/** Format the IVA rate for display (e.g. "19%") */
export async function getIvaLabel(): Promise<string> {
  const rate = await getIvaRate();
  return `${Math.round(rate * 100)}%`;
}
