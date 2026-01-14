import { NextApiRequest, NextApiResponse } from 'next';

// Almacenar las conexiones activas
const clients = new Set<NextApiResponse>();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    console.info('[SSE] client connected');

    // Configurar headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Accel-Buffering', 'no');

    // Agregar cliente a la lista
    clients.add(res);
    console.info(`[SSE] total clients after connect: ${clients.size}`);

    // Enviar mensaje inicial
    const initialMessage = JSON.stringify({
      type: 'connected',
      message: 'Conectado a notificaciones en tiempo real',
      timestamp: new Date().toISOString()
    });

    res.write(`data: ${initialMessage}\n\n`);

    // Mantener la conexión viva con ping
    const keepAlive = setInterval(() => {
      if (clients.has(res)) {
        try {
          res.write('data: {"type":"ping","timestamp":"' + new Date().toISOString() + '"}\n\n');
        } catch (error) {
          // silent
          clients.delete(res);
          clearInterval(keepAlive);
          console.warn('[SSE] keep-alive failed, removed client');
        }
      } else {
        clearInterval(keepAlive);
      }
    }, 30000);

    // Manejar desconexión del cliente
    req.on('close', () => {
      console.info('[SSE] client disconnected');
      clients.delete(res);
      clearInterval(keepAlive);
    });

    req.on('error', error => {
      console.error('[SSE] client error', error);
      clients.delete(res);
      clearInterval(keepAlive);
    });
  } else {
    res.status(405).json({ message: 'Método no permitido' });
  }
}

// Función para enviar notificaciones a todos los clientes
export function sendNotificationToAll(type: string, data: any) {
  if (clients.size === 0) {
    console.warn('[SSE] no clients connected, skipping send');
    return;
  }

  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString()
  });

  const deadClients: NextApiResponse[] = [];

  console.info(`[SSE] broadcasting ${type} to ${clients.size} clients`);

  clients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (error) {
      deadClients.push(client);
    }
  });

  console.info(`[SSE] sent ${type} to ${clients.size - deadClients.length} clients`);

  // Limpiar clientes muertos
  deadClients.forEach(client => {
    clients.delete(client);
  });
}
