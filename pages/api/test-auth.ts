import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Si llegó aquí, el middleware withAuth ya verificó el token
  // @ts-ignore
  const user = req.user;

  return res.status(200).json({
    success: true,
    authenticated: true,
    user: {
      id: user?.id,
      nick: user?.nick,
      role: user?.role
    }
  });
}

export default withAuth(handler);
