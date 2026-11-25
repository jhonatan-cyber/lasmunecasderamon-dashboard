import { obtenerValorConfiguracion } from '@/modules/configuracion';

let cachedAdminWhatsApp: string | null = null;

/**
 * Número del administrador (el que recibe anulaciones, anticipos y cierres).
 * Vive en `configuraciones.admin_whatsapp` (Configuraciones → WhatsApp); si está
 * vacío se cae a `ADMIN_WHATSAPP_NUMBER` del `.env`.
 */
export async function getAdminWhatsApp(): Promise<string> {
  if (cachedAdminWhatsApp !== null) return cachedAdminWhatsApp;

  const desdeEnv = (process.env.ADMIN_WHATSAPP_NUMBER || '').replace('whatsapp:', '').trim();

  try {
    const raw = ((await obtenerValorConfiguracion('admin_whatsapp')) || '').trim();
    cachedAdminWhatsApp = raw.replace('whatsapp:', '') || desdeEnv;
  } catch {
    cachedAdminWhatsApp = desdeEnv;
  }

  return cachedAdminWhatsApp!;
}

export function clearAdminWhatsAppCache() {
  cachedAdminWhatsApp = null;
}
