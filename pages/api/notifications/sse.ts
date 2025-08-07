import { NextApiRequest, NextApiResponse } from 'next';

// Almacenar las conexiones activas
const clients = new Set<NextApiResponse>();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    console.log('🔔 SSE: Nueva conexión solicitada');

    // Configurar headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Accel-Buffering', 'no');

    // Agregar cliente a la lista
    clients.add(res);
    console.log('🔔 SSE: Cliente conectado. Total de clientes:', clients.size);

    // Enviar mensaje inicial
    const initialMessage = JSON.stringify({
      type: 'connected',
      message: 'Conectado a notificaciones en tiempo real',
      timestamp: new Date().toISOString()
    });

    console.log('🔔 SSE: Enviando mensaje inicial:', initialMessage);
    res.write(`data: ${initialMessage}\n\n`);

    // Mantener la conexión viva con ping
    const keepAlive = setInterval(() => {
      if (clients.has(res)) {
        try {
          res.write('data: {"type":"ping","timestamp":"' + new Date().toISOString() + '"}\n\n');
        } catch (error) {
          console.log('🔔 SSE: Error enviando ping, eliminando cliente');
          clients.delete(res);
          clearInterval(keepAlive);
        }
      } else {
        clearInterval(keepAlive);
      }
    }, 30000);

    // Manejar desconexión del cliente
    req.on('close', () => {
      console.log('🔔 SSE: Cliente desconectado');
      clients.delete(res);
      clearInterval(keepAlive);
    });

    req.on('error', error => {
      console.log('🔔 SSE: Error en conexión:', error);
      clients.delete(res);
      clearInterval(keepAlive);
    });
  } else {
    res.status(405).json({ message: 'Método no permitido' });
  }
}

// Función para enviar notificaciones a todos los clientes
export function sendNotificationToAll(type: string, data: any) {
  console.log('🔔 SSE: Enviando notificación a todos los clientes:', type, data);
  console.log('🔔 SSE: Total de clientes conectados:', clients.size);
  
  if (clients.size === 0) {
    console.log('⚠️ SSE: No hay clientes conectados para recibir la notificación');
    return;
  }
  
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString()
  });

  const deadClients: NextApiResponse[] = [];

  clients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (error) {
      deadClients.push(client);
    }
  });

  // Limpiar clientes muertos
  deadClients.forEach(client => {
    clients.delete(client);
  });
}


