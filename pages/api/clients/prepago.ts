/* eslint-disable */
import type { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, body } = req;

  if (method === 'POST') {
    const { cliente_id, monto, metodo_pago, usuario_id, pago_mixto } = body;

    if (!cliente_id || !monto || isNaN(monto)) {
      return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
    }

    try {
      const now = getNowInBusinessTimezone();
      const idMovimiento = generateUUID();

      // Preparar el motivo si es mixto
      let detalleMixto = null;
      if (metodo_pago === 'mixto' && pago_mixto) {
        detalleMixto = JSON.stringify(pago_mixto);
      }

      // Intentar insertar con el campo metadatos si existe, o guardarlo en una nota
      await query(
        `INSERT INTO clientes_prepago_movimientos 
        (id_movimiento, cliente_id, tipo, monto, metodo_pago, usuario_id, fecha_crea, metadatos) 
        VALUES (?, ?, 'CARGA', ?, ?, ?, ?, ?)`,
        [idMovimiento, cliente_id, monto, metodo_pago || 'efectivo', usuario_id, now, detalleMixto]
      ).catch(async (err) => {
        // Si falla porque no existe 'metadatos', intentar crearla
        if (err.message.includes('metadatos') || err.message.includes('column')) {
            await query('ALTER TABLE clientes_prepago_movimientos ADD COLUMN metadatos TEXT').catch(() => {});
            return query(
                `INSERT INTO clientes_prepago_movimientos 
                (id_movimiento, cliente_id, tipo, monto, metodo_pago, usuario_id, fecha_crea, metadatos) 
                VALUES (?, ?, 'CARGA', ?, ?, ?, ?, ?)`,
                [idMovimiento, cliente_id, monto, metodo_pago || 'efectivo', usuario_id, now, detalleMixto]
            );
        }
        throw err;
      });

      // 3. Actualizar el saldo del cliente
      await query(
        'UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?',
        [monto, cliente_id]
      );

      // 4. (Opcional) Registrar en caja si fuera necesario, pero usualmente las ventas ya lo hacen.
      // Aquí estamos cargando saldo, es un ingreso de dinero "a cuenta".
      // Debería registrarse en la caja actual como un ingreso de tipo 'prepago'.
      
      const openCajaResult = await query('SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1') as any[];
      if (openCajaResult.length > 0) {
          const idCaja = openCajaResult[0].id_caja;
          // Si existe una tabla de movimientos de caja, registrarlo ahí. 
          // En este sistema parece que se calcula dinámicamente o se usa 'retiros_caja'.
      }

      return res.status(200).json({
        success: true,
        message: 'Carga de prepago exitosa',
        id_movimiento: idMovimiento
      });

    } catch (error) {
      console.error('Error en carga prepago:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la carga de prepago',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (method === 'GET') {
      const { cliente_id } = req.query;
      if (!cliente_id) return res.status(400).json({ message: 'cliente_id requerido' });

      try {
          const movimientos = await query(
              'SELECT * FROM clientes_prepago_movimientos WHERE cliente_id = ? ORDER BY fecha_crea DESC',
              [cliente_id]
          );
          return res.status(200).json(movimientos);
      } catch (error) {
          return res.status(500).json({ message: 'Error al obtener movimientos' });
      }
  }

  return res.status(405).json({ message: 'Método no permitido' });
}
