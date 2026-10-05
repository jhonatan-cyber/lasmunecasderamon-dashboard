import type { DefinicionClave } from '@/lib/configuracion/definiciones';
import { telefono } from '@/lib/configuracion/definiciones';
const ADMIN_WHATSAPP = telefono('admin_whatsapp', '59172419112');
const TWILIO_WHATSAPP = telefono('twilio_whatsapp_number', 'whatsapp:+14155238886', true);
export const CLAVES_COMUNICACIONES: Record<string, DefinicionClave> = {
  admin_whatsapp: {
    categoria: 'sistema',
    tipo: 'text',
    default: '',
    validar: ADMIN_WHATSAPP
  },
  twilio_account_sid: {
    categoria: 'integraciones',
    tipo: 'text',
    default: '',
    validar: (valor: string) => {
      if (!valor) return null; // Vacío = seguir usando la variable de entorno.
      if (!/^AC[0-9a-f]{32}$/i.test(valor.trim())) {
        return 'twilio_account_sid debe ser un Account SID de Twilio (empieza con AC y tiene 32 caracteres)';
      }
      return null;
    }
  },
  twilio_auth_token: {
    categoria: 'integraciones',
    tipo: 'text',
    default: '',
    validar: (valor: string) => {
      if (!valor) return null;
      if (!/^[A-Za-z0-9_\-]{16,128}$/.test(valor.trim())) {
        return 'twilio_auth_token debe ser un Auth Token válido de Twilio (mínimo 16 caracteres)';
      }
      return null;
    }
  },
  twilio_whatsapp_number: {
    categoria: 'integraciones',
    tipo: 'text',
    default: '',
    validar: TWILIO_WHATSAPP
  }
};
