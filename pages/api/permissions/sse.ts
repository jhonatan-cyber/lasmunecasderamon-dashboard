import { NextApiRequest, NextApiResponse } from 'next';

// Almacenar las conexiones activas
const clients = new Set<NextApiResponse>();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Configurar headers para SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Agregar cliente a la lista
  clients.add(res);

  // Enviar mensaje inicial
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Conectado al servidor de permisos' })}\n\n`);

  // Manejar desconexión del cliente
  req.on('close', () => {
    clients.delete(res);
  });
}

// Función para notificar a todos los clientes
export function notifyPermissionsUpdate(roleId: number) {
  const message = JSON.stringify({
    type: 'permissions-updated',
    roleId,
    timestamp: new Date().toISOString()
  });

  clients.forEach((client) => {
    client.write(`data: ${message}\n\n`);
  });
}
