import { NextApiRequest, NextApiResponse } from 'next';
import { swaggerSpec } from '@/lib/swagger';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Permitir acceso público a la documentación
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
  
  res.status(200).json(swaggerSpec);
} 