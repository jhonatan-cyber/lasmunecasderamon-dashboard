import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método no permitido'
    });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de cuenta es requerido'
    });
  }

  const cuentaId = parseInt(id);

  try {
    const { cuenta_id, metodo_pago, propina = 0, total_cobrado, habitacion_id = null } = req.body;

    // Validaciones
    if (!cuenta_id || !metodo_pago || total_cobrado === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: cuenta_id, metodo_pago, total_cobrado'
      });
    }

    // Validar método de pago
    const metodosValidos = ['efectivo', 'tarjeta', 'transferencia'];
    if (!metodosValidos.includes(metodo_pago)) {
      return res.status(400).json({
        success: false,
        message: 'Método de pago inválido'
      });
    }

    // Actualizar el estado de la cuenta a "Cobrada" (estado = 0)
    const updateCuentaSql = `
      UPDATE cuentas 
      SET estado = 0, 
          fecha_mod = NOW()
      WHERE id_cuenta = ?
    `;

    await query(updateCuentaSql, [cuenta_id]);

    // Registrar el cobro en la tabla cobros_cuentas (si existe)
    // Si no existe la tabla, solo actualizamos el estado de la cuenta
    try {
      const insertCobroSql = `
        INSERT INTO cobros_cuentas (
          cuenta_id,
          metodo_pago,
          propina,
          total_cobrado,
          habitacion_id,
          fecha_cobro
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `;

      await query(insertCobroSql, [cuenta_id, metodo_pago, propina, total_cobrado, habitacion_id]);
    } catch (error) {
      console.log('Tabla cobros_cuentas no existe, solo se actualizó el estado de la cuenta');
    }

    // Si hay habitación seleccionada, actualizar su estado a "Ocupada" (estado = 2)
    if (habitacion_id) {
      try {
        const updateHabitacionSql = `
          UPDATE habitaciones 
          SET estado = 2 
          WHERE id_habitacion = ?
        `;
        await query(updateHabitacionSql, [habitacion_id]);
      } catch (error) {
        console.error('Error al actualizar habitación:', error);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Cuenta cobrada exitosamente',
      data: {
        cuenta_id,
        metodo_pago,
        propina,
        total_cobrado,
        habitacion_id,
        fecha_cobro: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al cobrar la cuenta'
    });
  }
}
