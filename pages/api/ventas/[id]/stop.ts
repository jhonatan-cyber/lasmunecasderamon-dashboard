import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;
  const ventaId = parseInt(id as string);

  if (isNaN(ventaId)) {
    return res.status(400).json({ error: 'ID de venta inválido' });
  }

  try {
   
    const ventaExistente = (await query(
      'SELECT * FROM ventas WHERE id_venta = ?',
      [ventaId]
    )) as any[];

    if (ventaExistente.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const venta = ventaExistente[0];
    if (venta.habitacion_id) {

      await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [
        venta.habitacion_id
      ]);
      console.log(`✅ Habitación ${venta.habitacion_id} liberada`);
    }

    const anfitrionasLiberadas = (await query(
      `SELECT vu.usuario_id, r.nombre as rol 
       FROM ventas_usuarios vu
       INNER JOIN usuarios u ON vu.usuario_id = u.id_usuario
       LEFT JOIN roles r ON u.rol_id = r.id_rol
       WHERE vu.venta_id = ?`,
      [ventaId]
    )) as any[];

    if (anfitrionasLiberadas.length > 0) {
      for (const anfitriona of anfitrionasLiberadas) {
        if (anfitriona.rol === 'anfitriona') {
          await query('UPDATE usuarios SET estado = 1 WHERE id_usuario = ?', [
            anfitriona.usuario_id
          ]);
          console.log(`✅ Anfitriona ${anfitriona.usuario_id} liberada (estado = 1)`);
        }
      }
      console.log(
        `✅ ${anfitrionasLiberadas.length} anfitrionas liberadas de la venta ${ventaId}`
      );
    }

    
    await query('UPDATE ventas SET fecha_mod = NOW() WHERE id_venta = ?', [ventaId]);

    return res.status(200).json({
      success: true,
      message: 'Venta finalizada, habitación y anfitrionas liberadas',
      ventaId,
      habitacionLiberada: !!venta.habitacion_id,
      anfitrionasLiberadas: anfitrionasLiberadas.length
    });
  } catch (error) {
    console.error('Error al finalizar venta:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
