import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const testData = req.body;
    
    // Test 1: Verificar que llega el body
    console.log('[DEBUG] Body received:', JSON.stringify(testData, null, 2));
    
    // Test 2: Intentar insertar venta
    try {
      const insertVentaSql = `
        INSERT INTO ventas (
          codigo, cliente_id, habitacion_id, metodo_pago, propina, sub_total, total, total_comision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const ventaResult = await query(insertVentaSql, [
        'TEST' + Date.now(),
        testData.cliente_id || 1,
        testData.habitacion_id || null,
        testData.metodo_pago || 'efectivo',
        testData.propina || 0,
        testData.sub_total || 0,
        testData.total || 0,
        testData.total_comision || 0
      ]) as any;
      
      const ventaId = ventaResult.insertId;
      console.log('[DEBUG] Venta inserted with ID:', ventaId);
      
      // Test 3: Insertar detalles
      if (testData.detalles && Array.isArray(testData.detalles)) {
        for (const detalle of testData.detalles) {
          await query(
            `INSERT INTO detalle_ventas (venta_id, producto_id, precio, comision, cantidad, sub_total) VALUES (?, ?, ?, ?, ?, ?)`,
            [ventaId, detalle.producto_id, detalle.precio, detalle.comision, detalle.cantidad, detalle.sub_total]
          );
        }
        console.log('[DEBUG] Detalles inserted');
      }
      
      // Test 4: Insertar usuarios
      if (testData.usuarios && Array.isArray(testData.usuarios)) {
        for (const usuarioId of testData.usuarios) {
          await query(
            `INSERT INTO ventas_usuarios (venta_id, usuario_id) VALUES (?, ?)`,
            [ventaId, usuarioId]
          );
        }
        console.log('[DEBUG] Usuarios inserted');
      }
      
      // Test 5: Limpiar datos de prueba
      await query('DELETE FROM ventas_usuarios WHERE venta_id = ?', [ventaId]);
      await query('DELETE FROM detalle_ventas WHERE venta_id = ?', [ventaId]);
      await query('DELETE FROM ventas WHERE id_venta = ?', [ventaId]);
      console.log('[DEBUG] Test data cleaned');
      
      return res.status(200).json({
        success: true,
        message: 'All tests passed',
        ventaId
      });
      
    } catch (dbError) {
      console.error('[DEBUG] Database error:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
    }
    
  } catch (error) {
    console.error('[DEBUG] General error:', error);
    return res.status(500).json({
      success: false,
      error: 'General error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
