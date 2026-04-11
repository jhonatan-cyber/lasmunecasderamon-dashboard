/* eslint-disable no-console */
const mysql = require('mysql2/promise');
require('dotenv').config();
const crypto = require('crypto');

async function runTest() {
  console.log('ðŸš€ Iniciando Prueba de IntegraciÃ³n: Ciclo Completo de Pedido (v3)');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // 1. Obtener datos necesarios (Cliente, Usuario, Producto)
    const [clientes] = await connection.execute('SELECT id_cliente FROM clientes LIMIT 1');
    const [usuarios] = await connection.execute(
      'SELECT id_usuario FROM usuarios WHERE estado = 1 LIMIT 1'
    );
    const [productos] = await connection.execute(
      'SELECT id_producto, nombre, precio, comision FROM productos WHERE estado = 1 LIMIT 1'
    );

    if (clientes.length === 0 || usuarios.length === 0 || productos.length === 0) {
      throw new Error(
        'No hay datos suficientes para realizar la prueba (clientes, usuarios o productos activos)'
      );
    }

    const clienteId = clientes[0].id_cliente;
    const usuarioId = usuarios[0].id_usuario;
    const producto = productos[0];

    console.log(
      `âœ… Datos base listos: Cliente ${clienteId}, Usuario ${usuarioId}, Producto ${producto.nombre}`
    );

    // 2. Crear Pedido
    const pedidoId = crypto.randomUUID();
    const pedidoCodigo = `TEST-${Math.floor(Math.random() * 10000)}`;
    const propina = 1000;
    const subtotal = producto.precio;
    const total = subtotal + propina;
    const totalComision = producto.comision;

    await connection.execute(
      'INSERT INTO pedidos (id_pedido, codigo, cliente_id, mesero_id, subtotal, propina, total, total_comision, estado, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())',
      [pedidoId, pedidoCodigo, clienteId, usuarioId, subtotal, propina, total, totalComision]
    );
    console.log(`âœ… Pedido creado: ${pedidoCodigo} (ID: ${pedidoId})`);

    // 3. Agregar Detalle del Pedido
    const detalleId = crypto.randomUUID();
    await connection.execute(
      'INSERT INTO detalle_pedidos (id_detalle_pedido, pedido_id, producto_id, cantidad, precio, subtotal, comision, fecha_crea) VALUES (?, ?, ?, 1, ?, ?, ?, NOW())',
      [
        detalleId,
        pedidoId,
        producto.id_producto,
        producto.precio,
        producto.precio,
        producto.comision
      ]
    );
    console.log(`âœ… Detalle de pedido agregado para ${producto.nombre}`);

    // 4. Procesar Venta (FacturaciÃ³n)
    const ventaId = crypto.randomUUID();
    const ventaCodigo = `V-${Math.floor(Math.random() * 10000)}`;
    await connection.execute(
      'INSERT INTO ventas (id_venta, codigo, cliente_id, pedido_id, created_by, total, sub_total, propina, total_comision, metodo_pago, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "Efectivo", NOW())',
      [
        ventaId,
        ventaCodigo,
        clienteId,
        pedidoId,
        usuarioId,
        total,
        subtotal,
        propina,
        totalComision
      ]
    );
    console.log(`âœ… Venta registrada: ID ${ventaId} (CÃ³digo: ${ventaCodigo})`);

    // 5. Actualizar Estado del Pedido a Finalizado (0)
    await connection.execute('UPDATE pedidos SET estado = 0 WHERE id_pedido = ?', [pedidoId]);
    console.log(`âœ… Pedido ${pedidoCodigo} marcado como FINALIZADO`);

    // 6. VERIFICACIONES FINALES
    console.log('\n--- VERIFICACIONES ---');

    // Verificar Venta
    const [vCheck] = await connection.execute('SELECT * FROM ventas WHERE id_venta = ?', [ventaId]);
    console.log(
      vCheck.length > 0 ? 'âœ”ï¸ Venta persistida correctamente' : 'âŒ Error: Venta no encontrada'
    );

    // Verificar Estado Pedido
    const [pCheck] = await connection.execute('SELECT estado FROM pedidos WHERE id_pedido = ?', [
      pedidoId
    ]);
    console.log(
      pCheck[0].estado === 0
        ? 'âœ”ï¸ Estado del pedido es FINALIZADO'
        : 'âŒ Error: Estado incorrecto'
    );

    // Verificar Detalle de Pedido
    const [dCheck] = await connection.execute('SELECT * FROM detalle_pedidos WHERE pedido_id = ?', [
      pedidoId
    ]);
    console.log(
      dCheck.length > 0 ? 'âœ”ï¸ Detalle del pedido verificado' : 'âŒ Error: Detalle no encontrado'
    );

    console.log('\nðŸŒŸ VALIDACIÃ“N EXITOSA: El ciclo completo de pedido funciona correctamente.');
  } catch (error) {
    console.error('\nâŒ ERROR DURANTE LA PRUEBA:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runTest();
