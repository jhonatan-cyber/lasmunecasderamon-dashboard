import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { query } from '@/lib/database/db';
import logger from '../utils/logger';

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

    try {
        const users = await query(
            `SELECT push_token FROM usuarios WHERE id_usuario IN (${ids.map(() => '?').join(',')}) AND push_token IS NOT NULL`,
            ids
        ) as PushUserRow[];

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
                data: data || {},
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
                        await query('UPDATE usuarios SET push_token = NULL WHERE push_token = ?', [invalidToken]);
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

export async function sendPushByRole(
    role: string,
    title: string,
    body: string,
    data?: PushData
) {
    try {
        const users = await query(
            `SELECT u.push_token 
             FROM usuarios u 
             INNER JOIN roles r ON u.rol_id = r.id_rol 
             WHERE LOWER(r.nombre) = LOWER(?) AND u.push_token IS NOT NULL`,
            [role]
        ) as PushUserRow[];

        if (!users || users.length === 0) return;

        const tokens = users.map(u => u.push_token).filter((t): t is string => Boolean(t) && Expo.isExpoPushToken(t));

        const messages: ExpoPushMessage[] = tokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data: data || {},
        }));

        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk)
                for (const [index, ticket] of ticketChunk.entries()) {
                    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
                        const invalidToken = chunk[index].to;
                        await query('UPDATE usuarios SET push_token = NULL WHERE push_token = ?', [invalidToken]);
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

