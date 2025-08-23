import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🧪 [TEST-CONNECTION] Petición recibida:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  return res.status(200).json({
    success: true,
    message: 'Endpoint de prueba funcionando correctamente',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
}
