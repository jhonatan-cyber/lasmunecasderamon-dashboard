import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    // Leer el archivo swagger.json desde la carpeta public
    const swaggerPath = path.join(process.cwd(), 'public', 'swagger.json');
    const swaggerContent = fs.readFileSync(swaggerPath, 'utf8');
    const swaggerSpec = JSON.parse(swaggerContent);

    // Configurar headers para JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora

    // Devolver la especificación
    res.status(200).json(swaggerSpec);
  } catch (error) {
    console.error('Error al leer la especificación Swagger:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}
