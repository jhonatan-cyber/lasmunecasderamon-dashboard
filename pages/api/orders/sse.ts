import { NextApiRequest, NextApiResponse } from 'next';

// Almacenar las conexiones activas
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
  
  console.log(`✅ [ORDERS SSE] Cliente conectado: ${clientId} (Total: ${clients.size})`);

  // Enviar mensaje inicial
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    message: 'Conectado al servidor de pedidos',
    clientId 
  })}\n\n`);

  // Heartbeat cada 30 segundos para mantener la conexión viva
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (error) {
      console.error(`❌ [ORDERS SSE] Error en heartbeat para ${clientId}:`, error);
      clearInterval(heartbeatInterval);
      clients.delete(res);
    }
  }, 30000);

  // Manejar desconexión del cliente
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    clients.delete(res);
    console.log(`🔴 [ORDERS SSE] Cliente desconectado: ${clientId} (Total: ${clients.size})`);
  });

  // Manejar errores
  req.on('error', (error) => {
    console.error(`❌ [ORDERS SSE] Error en conexión ${clientId}:`, error);
    clearInterval(heartbeatInterval);
    clients.delete(res);
  });
}

// Función para notificar cuando se procesa un pedido
export function notifyOrderProcessed(orderId: number) {
  const message = JSON.stringify({
    type: 'order-processed',
    orderId,
    timestamp: new Date().toISOString()
  });

  console.log(`📢 [ORDERS SSE] Notificando pedido procesado a ${clients.size} clientes (orderId: ${orderId})`);

  let successCount = 0;
  let errorCount = 0;

  clients.forEach((clientInfo, client) => {
    try {
      client.write(`data: ${message}\n\n`);
      successCount++;
      console.log(`✅ [ORDERS SSE] Mensaje enviado a ${clientInfo.id}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ [ORDERS SSE] Error enviando a ${clientInfo.id}:`, error);
      clients.delete(client);
    }
  });

  console.log(`📊 [ORDERS SSE] Resultado: ${successCount} exitosos, ${errorCount} errores`);
}

// Función para notificar cuando se elimina un pedido
export function notifyOrderDeleted(orderId: number) {
  const message = JSON.stringify({
    type: 'order-deleted',
    orderId,
    timestamp: new Date().toISOString()
  });

  console.log(`📢 [ORDERS SSE] Notificando pedido eliminado a ${clients.size} clientes (orderId: ${orderId})`);

  let successCount = 0;
  let errorCount = 0;

  clients.forEach((clientInfo, client) => {
    try {
      client.write(`data: ${message}\n\n`);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`❌ [ORDERS SSE] Error enviando a ${clientInfo.id}:`, error);
      clients.delete(client);
    }
  });

  console.log(`📊 [ORDERS SSE] Resultado: ${successCount} exitosos, ${errorCount} errores`);
}

// Función para notificar cuando se crea un nuevo pedido
export function notifyOrderCreated(orderId: number) {
  const message = JSON.stringify({
    type: 'order-created',
    orderId,
    timestamp: new Date().toISOString()
  });

  console.log(`📢 [ORDERS SSE] Notificando nuevo pedido a ${clients.size} clientes (orderId: ${orderId})`);

  let successCount = 0;
  let errorCount = 0;

  clients.forEach((clientInfo, client) => {
    try {
      client.write(`data: ${message}\n\n`);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`❌ [ORDERS SSE] Error enviando a ${clientInfo.id}:`, error);
      clients.delete(client);
    }
  });

  console.log(`📊 [ORDERS SSE] Resultado: ${successCount} exitosos, ${errorCount} errores`);
}
