import { NextApiRequest, NextApiResponse } from 'next';
import { sendNotificationToAll } from './notifications/sse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      console.log('📤 Test Real Order: Iniciando...');
      
      // Simular datos de un pedido real
      const pedidoId = Math.floor(Math.random() * 1000) + 1;
      const codigo = `TEST${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const clienteNombre = 'Cliente de Prueba';
      const meseroNombre = 'Mesero de Prueba';
      const total = Math.floor(Math.random() * 50000) + 10000;
      
      console.log('📤 Test Real Order: Pedido creado exitosamente, ID:', pedidoId);
      console.log('📤 Test Real Order: Información obtenida - Cliente:', clienteNombre, 'Mesero:', meseroNombre);
      
      // Enviar notificación en tiempo real
      const notificationData = {
        id: pedidoId,
        codigo,
        cliente: clienteNombre,
        mesero: meseroNombre,
        total: total,
        timestamp: new Date().toISOString(),
        createdBy: 1 // ID de usuario de prueba para simular que fue creado por el usuario 1
      };
      
      console.log('📤 Test Real Order: Enviando notificación de nuevo pedido:', notificationData);
      sendNotificationToAll('new_order', notificationData);

      return res.status(200).json({
        success: true,
        message: 'Pedido de prueba creado correctamente',
        data: notificationData
      });
    } catch (error) {
      console.error('Error en test real order:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creando pedido de prueba',
        error: error
      });
    }
  } else {
    return res.status(405).json({ message: 'Método no permitido' });
  }
}