import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Por ahora, retornar array vacío hasta que se implemente el sistema de notificaciones
    console.log('🔔 API: Sistema de notificaciones no implementado, retornando array vacío');
    
    return res.status(200).json({
      success: true,
      notifications: []
    });

  } catch (error) {
    console.error('Error obteniendo notificaciones pendientes:', error);
    
    // Si hay error, retornar array vacío
    return res.status(200).json({
      success: true,
      notifications: []
    });
  }
} 