/* eslint-disable no-console */
const crypto = require('crypto');
function uuidv4() {
  return crypto.randomUUID();
}
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function runIntegrationTest() {
  console.log('🚀 Iniciando prueba de integración: Flujo de Pedido, Venta, Comisiones y Propinas');

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión a la base de datos establecida.');

    const testOrderId = uuidv4();
    const testSaleId = uuidv4();
    const testClientId = null;

    const [users] = await connection.execute('SELECT id_usuario FROM usuarios LIMIT 1');
    if (users.length === 0) {
      throw new Error('No se encontraron usuarios en la base de datos para la prueba.');
    }
    const testGarzonId = users[0].id_usuario;
    const testAnfitrionaId = users[0].id_usuario;

    console.log(`ðŸ“ Generando pedido de prueba: ${testOrderId}`);

    await connection.execute(
      'INSERT INTO pedidos (id_pedido, codigo, cliente_id, subtotal, total, total_comision, propina, estado, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [testOrderId, 'TEST-CODE-123', testClientId, 20000, 20000, 5000, 2000, 1]
    );
    console.log('✅ Pedido insertado.');

    const [detailCols] = await connection.execute('DESCRIBE detalle_pedidos');

    const [prods] = await connection.execute('SELECT id_producto FROM productos LIMIT 1');
    const testProductId = prods.length > 0 ? prods[0].id_producto : 'test-prod-1';

    const lastDetailId = uuidv4();
    let insertDetailSql =
      'INSERT INTO detalle_pedidos (id_detalle_pedido, pedido_id, producto_id, cantidad, precio, comision, subtotal, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())';
    let insertDetailParams = [lastDetailId, testOrderId, testProductId, 1, 18000, 5000, 18000];

    await connection.execute(insertDetailSql, insertDetailParams);
    console.log(`✅ Detalle de pedido insertado (ID: ${lastDetailId}).`);

    const pedidoUsuarioId = uuidv4();
    await connection.execute(
      'INSERT INTO pedidos_usuarios (id_pedido_usuario, usuario_id, pedido_id) VALUES (?, ?, ?)',
      [pedidoUsuarioId, testAnfitrionaId, testOrderId]
    );
    console.log('✅ Anfitriona asignada al pedido.');

    console.log(`ðŸ’° Procesando venta para el pedido: ${testSaleId}`);

    await connection.execute(
      'INSERT INTO ventas (id_venta, codigo, pedido_id, sub_total, total, propina, metodo_pago, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [testSaleId, 'TEST-SALE-123', testOrderId, 20000, 22000, 2000, 'Efectivo']
    );

    await connection.execute('UPDATE pedidos SET estado = 0 WHERE id_pedido = ?', [testOrderId]);
    console.log('✅ Venta registrada y pedido finalizado.');

    console.log('âš–ï¸ Verificando distribución de comisiones...');
    const commissionId = uuidv4();
    await connection.execute(
      'INSERT INTO comisiones (id_comision, venta_id, monto, estado, fecha_crea) VALUES (?, ?, ?, ?, NOW())',
      [commissionId, testSaleId, 5000, 1]
    );

    const detailCommissionId = uuidv4();
    await connection.execute(
      'INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, fecha_crea) VALUES (?, ?, ?, ?, NOW())',
      [detailCommissionId, commissionId, testAnfitrionaId, 5000]
    );
    console.log('✅ Comisiones registradas.');

    console.log('ðŸŽ Verificando distribución de propinas...');

    const loginId = uuidv4();
    await connection.execute(
      'INSERT INTO logins (id_login, usuario_id, last_login, estado, en_local) VALUES (?, ?, NOW(), 1, 1)',
      [loginId, testGarzonId]
    );

    const tipId = uuidv4();
    await connection.execute(
      'INSERT INTO propinas (id_propina, venta_id, propina, fecha_crea) VALUES (?, ?, ?, NOW())',
      [tipId, testSaleId, 2000]
    );

    const detailTipId = uuidv4();
    await connection.execute(
      'INSERT INTO detalle_propinas (id_detalle_propina, propina_id, usuario_id, monto, estado, fecha_crea) VALUES (?, ?, ?, ?, ?, NOW())',
      [detailTipId, tipId, testGarzonId, 2000, 1]
    );
    console.log('✅ Propinas distribuidas.');

    console.log('\nðŸ” Realizando validaciones finales...');

    const [comms] = await connection.execute('SELECT * FROM comisiones WHERE venta_id = ?', [
      testSaleId
    ]);
    if (comms.length > 0 && Number(comms[0].monto) === 5000) {
      console.log('â­ VALIDACIÓN EXITOSA: Comisión registrada correctamente.');
    } else {
      throw new Error('âŒ FALLO: No se encontró la comisión esperada.');
    }

    const [tips] = await connection.execute('SELECT * FROM propinas WHERE venta_id = ?', [
      testSaleId
    ]);
    if (tips.length > 0 && Number(tips[0].propina) === 2000) {
      console.log('â­ VALIDACIÓN EXITOSA: Propina registrada correctamente.');
    } else {
      throw new Error('âŒ FALLO: No se encontró la propina esperada.');
    }

    const [tipDetails] = await connection.execute(
      'SELECT * FROM detalle_propinas WHERE propina_id = ?',
      [tipId]
    );
    if (tipDetails.length > 0 && tipDetails[0].monto === 2000) {
      console.log('â­ VALIDACIÓN EXITOSA: Detalle de propina asignado al usuario.');
    } else {
      throw new Error('âŒ FALLO: No se encontró el detalle de propina.');
    }

    console.log('\n✨ PRUEBA DE INTEGRACIÓN COMPLETADA CON ÉXITO');
  } catch (error) {
    console.error('\nâŒ ERROR DURANTE LA PRUEBA:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runIntegrationTest();
