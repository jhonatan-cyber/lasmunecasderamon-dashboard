import { NextApiRequest, NextApiResponse } from 'next';

const globalForSSE = globalThis as typeof globalThis & {
  __sseClients?: Set<NextApiResponse>;
};

const clients = globalForSSE.__sseClients ?? new Set<NextApiResponse>();
globalForSSE.__sseClients = clients;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Accel-Buffering', 'no');

    clients.add(res);

    const initialMessage = JSON.stringify({
      type: 'connected',
      message: 'Conectado a notificaciones en tiempo real',
      timestamp: new Date().toISOString()
    });

    res.write(`data: ${initialMessage}\n\n`);

    const keepAlive = setInterval(() => {
      if (clients.has(res)) {
        try {
          res.write('data: {"type":"ping","timestamp":"' + new Date().toISOString() + '"}\n\n');
        } catch (error) {
          clients.delete(res);
          clearInterval(keepAlive);
        }
      } else {
        clearInterval(keepAlive);
      }
    }, 30000);

    req.on('close', () => {
      clients.delete(res);
      clearInterval(keepAlive);
    });

    req.on('error', error => {
      clients.delete(res);
      clearInterval(keepAlive);
    });
  } else {
    res.status(405).json({ message: 'Método no permitido' });
  }
}

export function sendNotificationToAll(type: string, data: any) {

  if (clients.size === 0) {
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

  console.log(`[SSE] ✅ '${type}' enviado a ${clients.size - deadClients.length}/${clients.size} clientes activos`);

  deadClients.forEach(client => {
    clients.delete(client);
  });
}
