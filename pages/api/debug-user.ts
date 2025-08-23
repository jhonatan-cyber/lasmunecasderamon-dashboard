import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const userData = getCurrentUser(req);
    
    console.log('=== DEBUG USER ===');
    console.log('userData:', userData);
    console.log('req.user:', req.user);
    console.log('req.headers:', req.headers);
    console.log('req.cookies:', req.cookies);

    return res.status(200).json({
      success: true,
      data: {
        userData,
        reqUser: req.user,
        headers: req.headers,
        cookies: req.cookies
      }
    });
  } catch (error) {
    console.error('Error en debug-user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);
