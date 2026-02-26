import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';

const retiroSchema = z.object({
    id_caja: z.number().min(1, 'ID de caja es requerido'),
    monto: z.number().min(0.01, 'El monto debe ser mayor a 0'),
    motivo: z.string().min(1, 'El motivo es requerido'),
    usuario_id: z.number().min(1, 'ID de usuario es requerido')
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({
            success: false,
            message: `Método ${req.method} no permitido`
        });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        // Validar datos con Zod
        let validatedData;
        try {
            validatedData = retiroSchema.parse(body);
        } catch (validationError) {
            if (validationError instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de entrada inválidos',
                    errors: validationError.issues.map((err: z.ZodIssue) => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            throw validationError;
        }

        // Verificar si la caja existe y está abierta
        const cajaResult = (await query(
            'SELECT id_caja, estado, monto_apertura, efectivo, devolucion, anticipo FROM cajas WHERE id_caja = ?',
            [validatedData.id_caja]
        )) as RowDataPacket[];

        if (!cajaResult || (Array.isArray(cajaResult) && cajaResult.length === 0)) {
            return res.status(404).json({
                success: false,
                message: 'Caja no encontrada'
            });
        }

        const caja = Array.isArray(cajaResult) ? cajaResult[0] : cajaResult;

        // Verificar que la caja esté abierta
        if (caja.estado !== 1) {
            return res.status(400).json({
                success: false,
                message: 'La caja debe estar abierta para realizar retiros'
            });
        }

        // Calcular monto disponible
        const montoDisponible = caja.monto_apertura + caja.efectivo - caja.devolucion - caja.anticipo;

        // Verificar que hay suficiente dinero
        if (validatedData.monto > montoDisponible) {
            return res.status(400).json({
                success: false,
                message: `Monto insuficiente. Disponible: $${montoDisponible.toLocaleString()}`
            });
        }

        // Verificar que el usuario existe
        const userResult = (await query(
            'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 1',
            [validatedData.usuario_id]
        )) as RowDataPacket[];

        if (!userResult || (Array.isArray(userResult) && userResult.length === 0)) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado o inactivo'
            });
        }

        // Registrar el retiro en una tabla de historial (opcional pero recomendado)
        // Si no tienes esta tabla, puedes crearla o comentar esta parte
        try {
            await query(
                `INSERT INTO retiros_caja (id_caja, monto, motivo, usuario_id, fecha_retiro) 
         VALUES (?, ?, ?, ?, NOW())`,
                [validatedData.id_caja, validatedData.monto, validatedData.motivo, validatedData.usuario_id]
            );
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error al registrar retiro',
                error: error instanceof Error ? error.message : String(error)
            });
        }

        // Actualizar el efectivo de la caja (restar el monto retirado)
        await query(
            'UPDATE cajas SET efectivo = efectivo - ? WHERE id_caja = ?',
            [validatedData.monto, validatedData.id_caja]
        );

        // Obtener la caja actualizada
        const [cajaActualizada] = (await query(
            `SELECT 
        c.*,
        CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre,
        CONCAT(u2.nombre, ' ', u2.apellido) as cajero_cierre_nombre
      FROM cajas c
      LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
      LEFT JOIN usuarios u2 ON c.usuario_id_cierre = u2.id_usuario
      WHERE c.id_caja = ?`,
            [validatedData.id_caja]
        )) as RowDataPacket[];

        return res.status(200).json({
            success: true,
            message: `Retiro de $${validatedData.monto.toLocaleString()} realizado exitosamente`,
            data: {
                id_caja: validatedData.id_caja,
                monto_retirado: validatedData.monto,
                motivo: validatedData.motivo,
                nuevo_efectivo: cajaActualizada.efectivo || 0
            }
        });
    } catch (error) {
       
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
