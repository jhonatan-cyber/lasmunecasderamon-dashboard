import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { query } from '@/lib/database/db';
import logger from '@/lib/utils/logger';

const expo = new Expo();

type PushData = Record<string, unknown>;

type PushUserRow = {
  push_token: string | null;
};

export async function sendPushNotification(
  userIds: string | string[],
  title: string,
  body: string,
  data?: PushData
) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (!ids.length) return;

  try {
    const users = (await query(
      `SELECT DISTINCT token AS push_token FROM push_tokens WHERE usuario_id IN (${ids.map(() => '?').join(',')}) AND token IS NOT NULL`,
      ids
    )) as PushUserRow[];

    if (!users || users.length === 0) return;

    const messages: ExpoPushMessage[] = [];
    for (const user of users) {
      if (!Expo.isExpoPushToken(user.push_token)) {
        continue;
      }

      messages.push({
        to: user.push_token,
        sound: 'default',
        title,
        body,
        data: data || {}
      });
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        for (const [index, ticket] of ticketChunk.entries()) {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            const invalidToken = chunk[index].to;
            await query('DELETE FROM push_tokens WHERE token = ?', [invalidToken]);
          }
        }
      } catch (error) {
        logger.error('Error enviando chunk de notificaciones:', error);
      }
    }

    return tickets;
  } catch (error) {
    logger.error('Error en sendPushNotification:', error);
  }
}

export async function sendPushByPermission(
  module: string,
  action: string,
  title: string,
  body: string,
  data?: PushData
) {
  try {
    // Quien ve el control en la UI es quien recibe el aviso: portadores del par
    // módulo/acción del catálogo + administrador (pasa todo, como en `hasPermission`).
    const users = (await query(
      `SELECT DISTINCT p.token AS push_token
             FROM push_tokens p INNER JOIN usuarios u ON u.id_usuario = p.usuario_id
             INNER JOIN roles r ON u.rol_id = r.id_rol
            WHERE p.token IS NOT NULL
              AND (LOWER(r.nombre) = 'administrador'
                   OR EXISTS (
                     SELECT 1 FROM role_permissions rp
                      INNER JOIN permissions perm ON perm.id = rp.permission_id
                      WHERE rp.role_id = r.id_rol
                        AND perm.module = ? AND perm.action = ? AND perm.deleted_at IS NULL
                   ))`,
      [module, action]
    )) as PushUserRow[];

    if (!users || users.length === 0) return;

    const tokens = users
      .map(u => u.push_token)
      .filter((t): t is string => Boolean(t) && Expo.isExpoPushToken(t));

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {}
    }));

    const chunks = expo.chunkPushNotifications(messages);
    const tickets: unknown[] = [];
    for (const chunk of chunks) {
      try {
        const ticket = await expo.sendPushNotificationsAsync(chunk);
        if (ticket) tickets.push(...ticket);
      } catch (err) {
        logger.error('[PUSH BY PERMISSION] Error:', err);
      }
    }
    return tickets;
  } catch (error) {
    logger.error('[PUSH BY PERMISSION] Error:', error);
  }
}

export async function sendPushByRole(role: string, title: string, body: string, data?: PushData) {
  try {
    const users = (await query(
      `SELECT DISTINCT p.token AS push_token 
             FROM push_tokens p INNER JOIN usuarios u ON u.id_usuario = p.usuario_id 
             INNER JOIN roles r ON u.rol_id = r.id_rol 
             WHERE LOWER(r.nombre) = LOWER(?) AND p.token IS NOT NULL`,
      [role]
    )) as PushUserRow[];

    if (!users || users.length === 0) return;

    const tokens = users
      .map(u => u.push_token)
      .filter((t): t is string => Boolean(t) && Expo.isExpoPushToken(t));

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {}
    }));

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        for (const [index, ticket] of ticketChunk.entries()) {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            const invalidToken = chunk[index].to;
            await query('DELETE FROM push_tokens WHERE token = ?', [invalidToken]);
          }
        }
      } catch (err) {
        logger.error('[PUSH BY ROLE] Error:', err);
      }
    }
  } catch (error) {
    logger.error('Error en sendPushByRole:', error);
  }
}
