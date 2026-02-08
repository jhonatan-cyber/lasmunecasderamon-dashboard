
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db';

// Función para verificar permisos
const checkPermission = async (req: NextApiRequest, module: string, action: string): Promise<boolean> => {
  try {
    // Obtener el usuario actual desde la sesión o token
    const user = (req as any).user;
    
    // Si es administrador, tiene acceso a todo
    if (user?.role?.toLowerCase() === 'administrador') {
      return true;
    }

    // Obtener el rol del usuario
    if (!user?.roleId) {
      return false;
    }

    // Consultar si el usuario tiene el permiso específico
    const [permissionCheck] = await query(`
      SELECT COUNT(*) as has_permission 
      FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ? AND p.module = ? AND p.action = ?
    `, [user.roleId, module, action]);

    return permissionCheck[0].has_permission > 0;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Verificar permiso para listar configuraciones
    const hasPermission = await checkPermission(req, 'configuraciones', 'listar');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a las configuraciones'
      });
    }

    // Obtener configuraciones
    const configuraciones = (await query(
      'SELECT * FROM configuraciones ORDER BY categoria, nombre'
    )) as any[];

    return res.status(200).json({
      success: true,
      data: configuraciones
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener configuraciones',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Verificar permiso para editar configuraciones
    const hasPermission = await checkPermission(req, 'configuraciones', 'editar');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar configuraciones'
      });
    }

    const { configuraciones } = req.body;

    // Validar datos
    if (!configuraciones || !Array.isArray(configuraciones)) {
      return res.status(400).json({
        success: false,
        message: 'Configuraciones inválidas'
      });
    }

    // Actualizar configuraciones
    for (const config of configuraciones) {
      await query(
        'UPDATE configuraciones SET valor = ?, actualizado_en = NOW() WHERE id = ?',
        [config.valor, config.id]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Configuraciones actualizadas exitosamente'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar configuraciones',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return await handleGet(req, res);
    case 'PUT':
      return await handlePut(req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ success: false, message: `Método ${req.method} no permitido` });
  }
}

export default withAuth(handler);
