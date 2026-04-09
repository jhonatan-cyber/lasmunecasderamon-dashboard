export function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateRandomCode4(): string {
  // Generate 4-digit numeric code (0000-9999)
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}
