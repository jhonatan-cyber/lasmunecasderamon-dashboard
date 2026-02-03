import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await query('ALTER TABLE ventas ADD COLUMN tiempo INT DEFAULT 0 AFTER total_comision', []);
    return res.status(200).json({ success: true, message: 'Column tiempo added to ventas table' });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
