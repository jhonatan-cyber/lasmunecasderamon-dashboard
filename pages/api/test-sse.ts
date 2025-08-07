import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    console.log('🔔 Test SSE: Conexión solicitada');
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Enviar mensaje inicial
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      message: 'Test SSE conectado',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Enviar un mensaje de prueba después de 2 segundos
    setTimeout(() => {
      res.write(`data: ${JSON.stringify({
        type: 'test_message',
        message: 'Este es un mensaje de prueba',
        timestamp: new Date().toISOString()
      })}\n\n`);
    }, 2000);

    // Mantener conexión viva
    const interval = setInterval(() => {
      res.write(`data: ${JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString()
      })}\n\n`);
    }, 10000);

    req.on('close', () => {
      clearInterval(interval);
      console.log('🔔 Test SSE: Conexión cerrada');
    });
  } else {
    res.status(405).json({ message: 'Método no permitido' });
  }
} 