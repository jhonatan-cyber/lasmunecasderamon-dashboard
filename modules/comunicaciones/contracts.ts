export interface EntradaNotificacion {
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  estado: number;
  data?: string;
}

export { CLAVES_COMUNICACIONES } from './configuracionClaves';
export type { DatosSolicitudCierreCaja } from './whatsapp/adaptador';
