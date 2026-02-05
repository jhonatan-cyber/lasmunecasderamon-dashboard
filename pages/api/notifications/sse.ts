import { NextApiRequest, NextApiResponse } from 'next';

// Almacenar las conexiones activas en global para compartir entre módulos
const globalForSSE = globalThis as typeof globalThis & {
  __sseClients?: Set<NextApiResponse>;
};

const clients = globalForSSE.__sseClients ?? new Set<NextApiResponse>();
globalForSSE.__sseClients = clients;

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
  console.log(`[SSE] sendNotificationToAll llamado con type="${type}", clients.size=${clients.size}`);
  
  if (clients.size === 0) {
    console.warn('[SSE] ⚠️ NO HAY CLIENTES CONECTADOS - Notificación no se enviará');
    return;
  }

  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString()
  });

  const deadClients: NextApiResponse[] = [];

  console.info(`[SSE] 📤 Broadcasting ${type} a ${clients.size} clientes`);

  clients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
      console.log(`[SSE] ✅ Mensaje enviado a cliente`);
    } catch (error) {
      console.error(`[SSE] ❌ Error al enviar a cliente:`, error);
      deadClients.push(client);
    }
  });

  console.info(`[SSE] ✅ Se envió ${type} a ${clients.size - deadClients.length}/${clients.size} clientes`);

  // Limpiar clientes muertos
  deadClients.forEach(client => {
    clients.delete(client);
  });
}
