/* eslint-disable */
import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { filename } = req.query;

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ success: false, message: 'Nombre de archivo requerido' });
    }

    // Construir la ruta del archivo
    const filePath = path.join(process.cwd(), 'public', 'img', 'users', filename);

    // Verificar que el archivo existe
    try {
      await fs.access(filePath);
    } catch (error) {
      // Si el archivo no existe, devolver la imagen por defecto
      const defaultPath = path.join(process.cwd(), 'public', 'img', 'users', 'default.png');
      try {
        await fs.access(defaultPath);
        const defaultImage = await fs.readFile(defaultPath);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return res.status(200).send(defaultImage);
      } catch (defaultError) {
        return res.status(404).json({ success: false, message: 'Imagen no encontrada' });
      }
    }

    // Leer el archivo
    const imageBuffer = await fs.readFile(filePath);

    // Determinar el tipo de contenido basado en la extensión
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg'; // Por defecto

    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }

    // Configurar headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Enviar la imagen
    res.status(200).send(imageBuffer);

  } catch (error) {
    
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}
