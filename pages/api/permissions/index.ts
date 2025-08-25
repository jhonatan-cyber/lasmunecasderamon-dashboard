import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const permissions = await query(`
        SELECT 
          id,
          name,
          description,
          module,
          action,
          created_at,
          updated_at
        FROM permissions 
        WHERE deleted_at IS NULL 
        ORDER BY module, action
      `);

      res.status(200).json({
        success: true,
        data: permissions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener los permisos'
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description, module, action } = req.body;

      if (!name || !module || !action) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, módulo y acción son requeridos'
        });
      }

      const result = await query(
        `
        INSERT INTO permissions (name, description, module, action) 
        VALUES (?, ?, ?, ?)
      `,
        [name, description, module, action]
      );

      res.status(201).json({
        success: true,
        message: 'Permiso creado correctamente',
        data: { id: (result as any).insertId }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al crear el permiso'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`
    });
  }
}
