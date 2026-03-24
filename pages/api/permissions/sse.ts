/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';

// Almacenar las conexiones activas con información adicional
const clients = new Map<NextApiResponse, { id: string; connectedAt: Date }>();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Configurar headers para SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Generar ID único para esta conexión
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Agregar cliente a la lista
  clients.set(res, { id: clientId, connectedAt: new Date() });

  // Enviar mensaje inicial
  res.write(
    `data: ${JSON.stringify({
      type: 'connected',
      message: 'Conectado al servidor de permisos',
      clientId
    })}\n\n`
  );

  // Heartbeat cada 30 segundos para mantener la conexión viva
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeatInterval);
      clients.delete(res);
    }
  }, 30000);

  // Manejar desconexión del cliente
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    clients.delete(res);
  });

  // Manejar errores
  req.on('error', error => {
    clearInterval(heartbeatInterval);
    clients.delete(res);
  });
}

// Función para notificar a todos los clientes
export function notifyPermissionsUpdate(roleId: string) {
  const message = JSON.stringify({
    type: 'permissions-updated',
    roleId,
    timestamp: new Date().toISOString()
  });

  let successCount = 0;
  let errorCount = 0;

  clients.forEach((clientInfo, client) => {
    try {
      client.write(`data: ${message}\n\n`);
      successCount++;
    } catch (error) {
      errorCount++;

      clients.delete(client);
    }
  });
}

