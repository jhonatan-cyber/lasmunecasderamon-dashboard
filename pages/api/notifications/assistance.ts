import { NextApiRequest, NextApiResponse } from 'next';
import { sendPushByRole } from '@/lib/pushNotifications';
import { sendNotificationToAll } from './sse';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { servicioId, roomName, type, message } = req.body;

    if (!servicioId || !roomName || !type) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const title = '⚠️ SOLICITUD DE ASISTENCIA';
        const body = `Habitación ${roomName} solicita: ${type}${message ? ` - ${message}` : ''}`;

        // Notificar a Cajeros y Administradores por Push
        await sendPushByRole('cajero', title, body, {
            type: 'service_assistance',
            servicioId,
            roomName,
            assistanceType: type
        });
        await sendPushByRole('administrador', title, body, {
            type: 'service_assistance',
            servicioId,
            roomName,
            assistanceType: type
        });

        // Notificar por SSE para UI en tiempo real
        sendNotificationToAll('service_assistance', {
            servicioId,
            roomName,
            assistanceType: type,
            message,
            timestamp: new Date().toISOString()
        });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('[ASSISTANCE API] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
