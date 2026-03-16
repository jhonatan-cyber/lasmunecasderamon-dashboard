import { NextApiRequest, NextApiResponse } from 'next';
const clients = new Map<NextApiResponse, { id: string; connectedAt: Date }>();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  clients.set(res, { id: clientId, connectedAt: new Date() });

  res.write(
    `data: ${JSON.stringify({
      type: 'connected',
      message: 'Conectado al servidor de pedidos',
      clientId
    })}\n\n`
  );

  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeatInterval);
      clients.delete(res);
    }
  }, 30000);
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    clients.delete(res);
  });

  req.on('error', error => {
    clearInterval(heartbeatInterval);
    clients.delete(res);
  });
}

export function notifyOrderProcessed(orderId: string) {
  const message = JSON.stringify({
    type: 'order-processed',
    orderId,
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

export function notifyOrderDeleted(orderId: string) {
  const message = JSON.stringify({
    type: 'order-deleted',
    orderId,
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

export function notifyOrderCreated(orderId: string) {
  const message = JSON.stringify({
    type: 'order-created',
    orderId,
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
