/**
 * Normaliza destinos para WhatsApp/Twilio. En Bolivia los teléfonos nacionales
 * tienen 8 dígitos; cuando vienen sin prefijo se completa el código +591.
 */
export function normalizeWhatsAppPhone(phone: string): string {
  const raw = phone
    .trim()
    .replace(/^whatsapp:/i, '')
    .trim();
  const digits = raw.replace(/\D/g, '');
  const international = raw.startsWith('+') || raw.startsWith('00');
  const normalizedDigits = raw.startsWith('00') ? digits.slice(2) : digits;
  const withCountryCode =
    international || normalizedDigits.length !== 8 ? normalizedDigits : `591${normalizedDigits}`;
  const normalized = `+${withCountryCode}`;

  if (!/^\+\d{7,15}$/.test(normalized)) {
    throw new Error('Número de destino inválido');
  }

  return normalized;
}
