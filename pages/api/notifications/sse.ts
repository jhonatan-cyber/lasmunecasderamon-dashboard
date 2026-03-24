import { NextApiRequest, NextApiResponse } from 'next';
import { sseManager } from '@/lib/sseService';
export { sendNotificationToAll } from '@/lib/sseService';

export default function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Método no permitido para notificaciones'
    });
  }

  try {
    sseManager.registerClient(req, res);

  } catch (error) {
    console.error('[SSE_HANDLER_ERROR]', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : error
    });

    if (!res.writableEnded) {
      res.status(500).json({
        success: false,
        message: 'Error al iniciar el canal de notificaciones'
      });
    }
  }
}
