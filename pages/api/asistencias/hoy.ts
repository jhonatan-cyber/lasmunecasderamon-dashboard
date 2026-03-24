import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { getSystemTimezone } from '@/lib/timezoneService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const currentUser = getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  const tz = getSystemTimezone();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

  const rows = await query(
    'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
    [currentUser.id, todayStr]
  ) as Array<{ id_asistencia: string | number }>;

  return res.status(200).json({
    success: true,
    registrada: Array.isArray(rows) && rows.length > 0
  });
}

export default withAuth(handler);

