import { query } from '@/lib/database/db';

let cachedAdminWhatsApp: string | null = null;

export async function getAdminWhatsApp(): Promise<string> {
  if (cachedAdminWhatsApp !== null) return cachedAdminWhatsApp;

  try {
    const [row] = (await query(
      "SELECT valor FROM configuraciones WHERE clave = 'admin_whatsapp' LIMIT 1"
    )) as any[];
    const raw = (row?.valor as string) || '';
    cachedAdminWhatsApp = raw.replace('whatsapp:', '');
  } catch {
    cachedAdminWhatsApp = '';
  }

  return cachedAdminWhatsApp!;
}

export function clearAdminWhatsAppCache() {
  cachedAdminWhatsApp = null;
}
