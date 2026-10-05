import 'server-only';
export {
  enviarWhatsApp,
  enviarMensajeSolicitudAnulacion,
  construirMensajeSolicitudCierreCaja,
  enviarMensajeSolicitudCierreCaja,
  enviarRecordatorioDevolucionSaldo
} from './whatsapp/adaptador';
export type { DatosSolicitudCierreCaja } from './whatsapp/adaptador';
export { sendPushNotification, sendPushByRole } from './push/servicio';

export { NotificationService } from './notificaciones/servicio';
