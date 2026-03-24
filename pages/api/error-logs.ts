/* eslint-disable */
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Obtener últimos 50 logs
    try {
      const logs = await query(`
        SELECT * FROM error_logs 
        ORDER BY fecha_crea DESC 
        LIMIT 50
      `);
      return res.status(200).json({ success: true, data: logs });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Error al obtener logs' });
    }
  }
  
  if (req.method === 'POST') {
    // Guardar log
    try {
      const { endpoint, error_message, stack_trace, request_body } = req.body;
      
      // Crear tabla si no existe
      await query(`
        CREATE TABLE IF NOT EXISTS error_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          endpoint VARCHAR(255),
          error_message TEXT,
          stack_trace TEXT,
          request_body TEXT,
          fecha_crea DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await query(
        'INSERT INTO error_logs (endpoint, error_message, stack_trace, request_body) VALUES (?, ?, ?, ?)',
        [endpoint, error_message, stack_trace, request_body]
      );
      
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Error al guardar log' });
    }
  }
  
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
