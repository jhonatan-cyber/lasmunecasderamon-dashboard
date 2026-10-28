/**
 * Normaliza y formatea un RUT chileno con puntos y guion (12.345.678-9).
 *
 * Acepta el valor con o sin formato; si no quedan dígitos ni K devuelve ''.
 */
export function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/gi, '').toUpperCase();
  if (!clean) return '';
  if (clean.length <= 1) return clean;

  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}
