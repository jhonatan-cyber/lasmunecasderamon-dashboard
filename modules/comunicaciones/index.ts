import 'server-only';
export {
  enviarWhatsApp,
  enviarWhatsAppAAdministradores,
  enviarPruebaWhatsApp,
  enviarPdfCierreCajaWhatsApp,
  enviarReporteCajaWhatsApp,
  enviarMensajeSolicitudAnulacion,
  enviarMensajeSolicitudAnulacionEntrada,
  construirMensajeSolicitudCierreCaja,
  enviarMensajeSolicitudCierreCaja,
  enviarRecordatorioDevolucionSaldo
} from './whatsapp/adaptador';
export type { DatosSolicitudCierreCaja, ResultadoEnvioAdministradores } from './whatsapp/adaptador';

export {
  enviarEmail,
  enviarEmailRecuperacionContrasena,
  clearResendCache
} from './email/adaptador';

export {
  resolverDestinosWhatsApp,
  numerosAdministradores,
  credencialesParaWebhook,
  listarConfigAdministradores,
  listarAdministradoresDisponibles,
  guardarConfigAdministrador,
  eliminarConfigAdministrador
} from './whatsapp/administradores';
export type {
  DestinoWhatsApp,
  CredencialesTwilio,
  EntradaAdminWhatsApp
} from './whatsapp/administradores';
export { sendPushNotification, sendPushByRole, sendPushByPermission } from './push/servicio';

export { NotificationService } from './notificaciones/servicio';

export { registrarEntregaWhatsApp, historialWhatsApp } from './whatsapp/seguimiento';
