import { NextApiRequest, NextApiResponse } from 'next';

export default async function pendingNotificationsHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  try {
    return res.status(200).json({
      success: true,
      notifications: [],
    });
  } catch {
    return res.status(200).json({
      success: true,
      notifications: [],
    });
  }
}
