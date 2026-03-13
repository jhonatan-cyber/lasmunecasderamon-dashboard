import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({
            success: false,
            message: `Método ${req.method} no permitido`
        });
    }

    try {
        const { id_caja } = req.query;

        if (!id_caja) {
            return res.status(400).json({
                success: false,
                message: 'ID de caja es requerido'
            });
        }

        const cajaId = parseInt(id_caja as string);
        if (isNaN(cajaId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de caja inválido'
            });
        }

        // Asegurar que la tabla existe (proactivo)
        await query(`
            CREATE TABLE IF NOT EXISTS retiros_caja (
                id_retiro INT AUTO_INCREMENT PRIMARY KEY,
                id_caja INT NOT NULL,
                monto DECIMAL(15,2) NOT NULL,
                motivo TEXT,
                usuario_id INT NOT NULL,
                fecha_retiro DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_caja (id_caja),
                INDEX idx_fecha (fecha_retiro)
            )
        `);

        // Obtener retiros de la caja con información del usuario
        const retiros = (await query(
            `SELECT 
        r.*,
        CONCAT(u.nombre, ' ', u.apellido) as usuario_nombre
      FROM retiros_caja r
      LEFT JOIN usuarios u ON r.usuario_id = u.id_usuario
      WHERE r.id_caja = ?
      ORDER BY r.fecha_retiro DESC`,
            [cajaId]
        )) as RowDataPacket[];

        return res.status(200).json({
            success: true,
            data: retiros,
            total: retiros.length
        });
    } catch (error: any) {
        console.error('[API retiros] Error:', error);
        
        // Si la tabla no existe (aunque hayamos intentado crearla), devolver array vacío
        if (error?.code === 'ER_NO_SUCH_TABLE' || error?.message?.includes("doesn't exist")) {
            return res.status(200).json({
                success: true,
                data: [],
                total: 0,
                message: 'Tabla de retiros no existe aún'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener retiros',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
