/* eslint-disable no-console */
const mysql = require('mysql2/promise');
require('dotenv').config();
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

async function testOrderProcessing() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('--- Iniciando Prueba de Procesamiento de Pedido ---');

  try {
    // 1. Obtener datos necesarios
    const [usuarios] = await connection.execute(
      'SELECT id_usuario FROM usuarios WHERE estado = 1 LIMIT 2'
    );
    const [clientes] = await connection.execute('SELECT id_cliente FROM clientes LIMIT 1');
    const [productos] = await connection.execute(
      'SELECT id_producto, precio, comision FROM productos WHERE estado = 1 LIMIT 1'
    );
    const [cajas] = await connection.execute(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    );

    if (usuarios.length < 1 || productos.length < 1 || cajas.length < 1) {
      console.error(
        'No hay suficientes datos (usuarios, productos o caja abierta) para realizar la prueba.'
      );
      process.exit(1);
    }

    const userId = usuarios[0].id_usuario;
    const hostessId = usuarios[1] ? usuarios[1].id_usuario : userId;
    const clienteId = clientes.length > 0 ? clientes[0].id_cliente : null;
    const producto = productos[0];
    const cajaId = cajas[0].id_caja;

    const pedidoId = uuidv4();
    const codigo = 'TEST-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const now = new Date();

    console.log(`Simulando Pedido: ${pedidoId} (CÃ³digo: ${codigo})`);

    // 2. Crear Pedido (Simular lo que hace OrderRepository.create)
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO pedidos (id_pedido, codigo, mesero_id, cliente_id, subtotal, total, total_comision, propina, estado, fecha_crea) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        pedidoId,
        codigo,
        userId,
        clienteId,
        producto.precio,
        Number(producto.precio) + 1000,
        producto.comision,
        1000,
        now
      ]
    );

    const detallePedidoId = uuidv4();
    await connection.execute(
      `INSERT INTO detalle_pedidos (id_detalle_pedido, pedido_id, producto_id, precio, comision, genera_comision, cantidad, subtotal, hostess_id, fecha_crea)
       VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, ?)`,
      [
        detallePedidoId,
        pedidoId,
        producto.id_producto,
        producto.precio,
        producto.comision,
        producto.precio,
        hostessId,
        now
      ]
    );

    await connection.execute(
      `INSERT INTO pedidos_usuarios (id_pedido_usuario, usuario_id, pedido_id) VALUES (?, ?, ?)`,
      [uuidv4(), hostessId, pedidoId]
    );

    await connection.commit();
    console.log('âœ” Pedido creado exitosamente.');

    // 3. Simular Venta (Lo que hace SaleService.createSale)
    console.log('Simulando Venta del Pedido...');
    const ventaId = uuidv4();

    // Simular que el usuario estÃ¡ logueado para que la propina se distribuya
    const [logins] = await connection.execute(
      'SELECT * FROM logins WHERE usuario_id = ? AND estado = 1',
      [userId]
    );
    if (logins.length === 0) {
      await connection.execute(
        'INSERT INTO logins (id_login, usuario_id, estado, en_local, last_login) VALUES (?, ?, 1, 1, NOW())',
        [uuidv4(), userId]
      );
      console.log('âœ” Login simulado para el usuario.');
    }

    // Usaremos los datos del pedido para la venta
    const ventaData = {
      id_venta: ventaId,
      codigo: codigo,
      pedido_id: pedidoId,
      cliente_id: clienteId,
      metodo_pago: 'efectivo',
      propina: 1000,
      sub_total: producto.precio,
      total: Number(producto.precio) + 1000,
      total_comision: producto.comision,
      caja_id: cajaId,
      created_by: userId,
      estado: 1,
      fecha_crea: now
    };

    await connection.beginTransaction();

    // Insertar Venta
    await connection.execute(
      `INSERT INTO ventas (id_venta, codigo, cliente_id, pedido_id, metodo_pago, propina, sub_total, total, total_comision, caja_id, created_by, estado, fecha_crea)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ventaData.id_venta,
        ventaData.codigo,
        ventaData.cliente_id,
        ventaData.pedido_id,
        ventaData.metodo_pago,
        ventaData.propina,
        ventaData.sub_total,
        ventaData.total,
        ventaData.total_comision,
        ventaData.caja_id,
        ventaData.created_by,
        ventaData.estado,
        ventaData.fecha_crea
      ]
    );

    // Insertar Detalle Venta y ComisiÃ³n
    const detalleVentaId = uuidv4();
    await connection.execute(
      `INSERT INTO detalle_ventas (id_detalle_venta, venta_id, producto_id, precio, comision, cantidad, sub_total, hostess_id, fecha_crea)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        detalleVentaId,
        ventaId,
        producto.id_producto,
        producto.precio,
        producto.comision,
        producto.precio,
        hostessId,
        now
      ]
    );

    // ComisiÃ³n
    const comisionId = uuidv4();
    await connection.execute(
      `INSERT INTO comisiones (id_comision, venta_id, monto, estado, fecha_crea) VALUES (?, ?, ?, 1, ?)`,
      [comisionId, ventaId, producto.comision, now]
    );
    await connection.execute(
      `INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, estado, fecha_crea) VALUES (?, ?, ?, ?, 1, ?)`,
      [uuidv4(), comisionId, hostessId, producto.comision, now]
    );

    // Propina (Manual simulada de TipRepository.register)
    const propinaId = uuidv4();
    await connection.execute(
      `INSERT INTO propinas (id_propina, venta_id, propina, estado, fecha_crea) VALUES (?, ?, ?, 1, ?)`,
      [propinaId, ventaId, 1000, now]
    );
    // DistribuciÃ³n de propina
    await connection.execute(
      `INSERT INTO detalle_propinas (id_detalle_propina, propina_id, usuario_id, monto, estado, fecha_crea) VALUES (?, ?, ?, ?, 1, ?)`,
      [uuidv4(), propinaId, userId, 1000, now]
    );

    // Cerrar Pedido
    await connection.execute('UPDATE pedidos SET estado = 0 WHERE id_pedido = ?', [pedidoId]);

    await connection.commit();
    console.log('âœ” Venta, ComisiÃ³n y Propina procesadas exitosamente.');

    // 4. Verificaciones Finales
    console.log('\n--- VERIFICACIONES ---');

    const [v] = await connection.execute('SELECT * FROM ventas WHERE id_venta = ?', [ventaId]);
    console.log(
      'Venta registrada:',
      v.length > 0 ? 'SÃ' : 'NO',
      `(Total: ${v[0]?.total}, Propina: ${v[0]?.propina})`
    );

    const [c] = await connection.execute('SELECT * FROM comisiones WHERE venta_id = ?', [ventaId]);
    console.log('ComisiÃ³n registrada:', c.length > 0 ? 'SÃ' : 'NO', `(Monto: ${c[0]?.monto})`);

    const [dc] = await connection.execute(
      'SELECT * FROM detalle_comisiones dc JOIN comisiones c ON c.id_comision = dc.comision_id WHERE c.venta_id = ?',
      [ventaId]
    );
    console.log(
      'Detalle ComisiÃ³n registrado:',
      dc.length > 0 ? 'SÃ' : 'NO',
      `(Usuario: ${dc[0]?.usuario_id}, Monto: ${dc[0]?.comision})`
    );

    const [p] = await connection.execute('SELECT * FROM propinas WHERE venta_id = ?', [ventaId]);
    console.log('Propina registrada:', p.length > 0 ? 'SÃ' : 'NO', `(Monto: ${p[0]?.propina})`);

    const [dp] = await connection.execute(
      'SELECT * FROM detalle_propinas dp JOIN propinas p ON p.id_propina = dp.propina_id WHERE p.venta_id = ?',
      [ventaId]
    );
    console.log(
      'DistribuciÃ³n Propina registrada:',
      dp.length > 0 ? 'SÃ' : 'NO',
      `(Usuario: ${dp[0]?.usuario_id}, Monto: ${dp[0]?.monto})`
    );

    const [ped] = await connection.execute('SELECT estado FROM pedidos WHERE id_pedido = ?', [
      pedidoId
    ]);
    console.log('Estado Pedido (debe ser 0):', ped[0]?.estado);

    console.log('\n--- PRUEBA FINALIZADA ---');
  } catch (error) {
    console.error('Error durante la prueba:', error);
    if (connection) await connection.rollback();
  } finally {
    if (connection) await connection.end();
  }
}

testOrderProcessing();
