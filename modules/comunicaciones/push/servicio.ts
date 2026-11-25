import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import logger from '@/lib/utils/logger';
import {
  eliminarTokenPush,
  listarTokensConPermiso,
  listarTokensDeRol,
  listarTokensDeUsuarios
} from './repositorio';

const expo = new Expo();

/**
 * Mismo canal que crea la app (`ANDROID_NOTIFICATION_CHANNEL_ID` en
 * services/pushNotifications.ts): alta importancia, sonido y vibración.
 * Sin `channelId`, Android usa su canal de respaldo y el aviso puede quedar
 * mudo según la configuración del equipo.
 */
const ANDROID_CHANNEL_ID = 'alertas';

type PushData = Record<string, unknown>;

export async function sendPushNotification(
  userIds: string | string[],
  title: string,
  body: string,
  data?: PushData
) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (!ids.length) return;

  try {
    const users = await listarTokensDeUsuarios(ids);

    if (!users || users.length === 0) return;

    const messages: ExpoPushMessage[] = [];
    for (const user of users) {
      if (!Expo.isExpoPushToken(user.push_token)) {
        continue;
      }

      messages.push({
        to: user.push_token,
        sound: 'default',
        priority: 'high',
        channelId: ANDROID_CHANNEL_ID,
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
            if (typeof invalidToken === 'string') await eliminarTokenPush(invalidToken);
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
    const users = await listarTokensConPermiso(module, action);

    if (!users || users.length === 0) return;

    const tokens = users
      .map(u => u.push_token)
      .filter((t): t is string => Boolean(t) && Expo.isExpoPushToken(t));

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      priority: 'high',
      channelId: ANDROID_CHANNEL_ID,
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
    const users = await listarTokensDeRol(role);

    if (!users || users.length === 0) return;

    const tokens = users
      .map(u => u.push_token)
      .filter((t): t is string => Boolean(t) && Expo.isExpoPushToken(t));

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      priority: 'high',
      channelId: ANDROID_CHANNEL_ID,
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
            if (typeof invalidToken === 'string') await eliminarTokenPush(invalidToken);
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
