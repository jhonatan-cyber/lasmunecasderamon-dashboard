import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { query } from './db';

const expo = new Expo();

/**
 * Envía una notificación push a uno o varios usuarios por sus IDs
 */
export async function sendPushNotification(userIds: number | number[], title: string, body: string, data?: any) {
    const ids = Array.isArray(userIds) ? userIds : [userIds];

    try {
        // Obtener los tokens de la base de datos
        const users = await query(
            `SELECT push_token FROM usuarios WHERE id_usuario IN (${ids.map(() => '?').join(',')}) AND push_token IS NOT NULL`,
            ids
        ) as any[];

        if (!users || users.length === 0) return;

        const messages: ExpoPushMessage[] = [];
        for (const user of users) {
            if (!Expo.isExpoPushToken(user.push_token)) {
                console.error(`Push token ${user.push_token} no es válido.`);
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

        // Dividir en fragmentos (chunks) como recomienda Expo
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);

                // Manejar errores de tickets (tokens inválidos)
                for (const [index, ticket] of ticketChunk.entries()) {
                    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
                        const invalidToken = chunk[index].to;
                        console.warn(`[PUSH] Token inválido detectado: ${invalidToken}. Eliminando...`);
                        await query('UPDATE usuarios SET push_token = NULL WHERE push_token = ?', [invalidToken]);
                    }
                }
            } catch (error) {
                console.error('Error enviando chunk de notificaciones:', error);
            }
        }

        return tickets;
    } catch (error) {
        console.error('Error en sendPushNotification:', error);
    }
}

/**
 * Envía una notificación push a todos los usuarios con un rol específico
 */
export async function sendPushByRole(role: string, title: string, body: string, data?: any) {
    try {
        const users = await query(
            'SELECT push_token FROM usuarios WHERE JSON_EXTRACT(role, "$.name") = ? OR role = ? AND push_token IS NOT NULL',
            [role, role]
        ) as any[];

        if (!users || users.length === 0) return;

        const tokens = users.map(u => u.push_token).filter(t => Expo.isExpoPushToken(t));
        if (tokens.length === 0) return;

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
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                // Manejar errores de tokens inválidos
                for (const [index, ticket] of ticketChunk.entries()) {
                    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
                        const invalidToken = chunk[index].to;
                        await query('UPDATE usuarios SET push_token = NULL WHERE push_token = ?', [invalidToken]);
                    }
                }
            } catch (err) {
                console.error('[PUSH BY ROLE] Error:', err);
            }
        }
    } catch (error) {
        console.error('Error en sendPushByRole:', error);
    }
}
