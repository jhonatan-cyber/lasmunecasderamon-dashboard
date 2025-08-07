import { NextApiRequest, NextApiResponse } from 'next';
import { sendNotificationToAll } from './notifications/sse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    // Simular un nuevo pedido
    const testOrderData = {
      id: Date.now(),
      codigo: 'TEST' + Math.random().toString(36).substr(2, 4).toUpperCase(),
      cliente: 'Cliente de Prueba',
      mesero: 'Mesero de Prueba',
      total: Math.floor(Math.random() * 100000) + 10000,
      timestamp: new Date().toISOString(),
      createdBy: 1 // ID de usuario de prueba para simular que fue creado por el usuario 1
    };

    console.log('📤 Enviando notificación de prueba:', testOrderData);
    sendNotificationToAll('new_order', testOrderData);

    return res.status(200).json({
      success: true,
      message: 'Notificación de prueba enviada',
      data: testOrderData
    });
  } catch (error) {
    console.error('Error en test-notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}