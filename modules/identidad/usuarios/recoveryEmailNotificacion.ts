import 'server-only';
import { NotificationService, sendPushByRole } from '@/modules/comunicaciones';
import logger from '@/lib/utils/logger';
import { listarStaffSinCorreoRecuperacion } from './repositorio';

/** Roles que requieren correo de recuperación para poder resetear la contraseña. */
const STAFF_ROLES = ['barman', 'garzon', 'anfitriona', 'cajero'];

/**
 * Encuentra los usuarios de staff sin correo de recuperación y les envía una
 * notificación in-app y un push para que lo configuren.
 *
 * Retorna la cantidad de usuarios notificados.
 */
export async function notificarStaffSinCorreoRecuperacion(): Promise<number> {
  const rows = await listarStaffSinCorreoRecuperacion(STAFF_ROLES);

  if (rows.length === 0) {
    logger.info('[RecoveryEmail] No hay usuarios de staff sin correo de recuperación.');
    return 0;
  }

  let notificados = 0;

  for (const row of rows) {
    try {
      // Notificación in-app
      await NotificationService.create({
        usuario_id: row.id_usuario,
        tipo: 'configuracion',
        titulo: 'Configura tu correo de recuperación',
        mensaje:
          'Para poder recuperar tu contraseña en caso de olvido, configura tu correo de recuperación desde tu perfil. Sin este correo, no podrás acceder a tu cuenta si olvidas la contraseña.',
        estado: 0
      });

      notificados++;
    } catch (err) {
      logger.error(`[RecoveryEmail] Error al crear notificación para ${row.id_usuario}:`, err);
    }
  }

  // Push notification por rol (llega a la app móvil de todos los roles de staff)
  for (const rol of STAFF_ROLES) {
    try {
      await sendPushByRole(
        rol,
        '⚠️ Correo de recuperación pendiente',
        'Configura tu correo de recuperación desde tu perfil para poder recuperar tu contraseña.'
      );
    } catch (err) {
      logger.error(`[RecoveryEmail] Error al enviar push para rol ${rol}:`, err);
    }
  }

  logger.info(
    `[RecoveryEmail] Se notificó a ${notificados} usuario(s) de staff sin correo de recuperación.`
  );
  return notificados;
}
