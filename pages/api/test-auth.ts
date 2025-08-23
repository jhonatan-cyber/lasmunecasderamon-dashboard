import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const userData = getCurrentUser(req);
    
    console.log('=== TEST AUTH ===');
    console.log('userData:', userData);
    console.log('req.user:', req.user);

    if (!userData) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - userData es null'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role
      }
    });
  } catch (error) {
    console.error('Error en test-auth:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);
