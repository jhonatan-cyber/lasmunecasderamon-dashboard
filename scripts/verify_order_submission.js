/* eslint-disable no-console */

const { query, withTransaction } = require('./lib/database/db');
const { OrderRepository } = require('./lib/repositories/OrderRepository');
const { v4: uuidv4 } = require('uuid');

async function testOrderSubmission() {
  console.log('--- Iniciando prueba de envío de pedido ---');

  try {
    // 1. Obtener datos necesarios (un mesero, un cliente, un producto, una anfitriona)
    const meseros = await query(
      'SELECT id_usuario FROM usuarios WHERE rol_id IN (SELECT id_rol FROM roles WHERE LOWER(nombre) = "garzon") LIMIT 1'
    );
    const clientes = await query('SELECT id_cliente FROM clientes LIMIT 1');
    const productos = await query(
      'SELECT id_producto, precio, comision FROM productos WHERE status = 1 LIMIT 1'
    );
    const anfitrionas = await query(
      'SELECT id_usuario FROM usuarios WHERE rol_id IN (SELECT id_rol FROM roles WHERE LOWER(nombre) = "anfitriona") LIMIT 1'
    );

    if (meseros.length === 0 || productos.length === 0) {
      console.error('No se encontraron meseros o productos activos para la prueba.');
      return;
    }

    const meseroId = meseros[0].id_usuario;
    const clienteId = clientes.length > 0 ? clientes[0].id_cliente : null;
    const producto = productos[0];
    const anfitrionaId = anfitrionas.length > 0 ? anfitrionas[0].id_usuario : null;

    console.log('Datos de prueba seleccionados:');
    console.log('- Mesero ID:', meseroId);
    console.log('- Cliente ID:', clienteId);
    console.log(
      '- Producto ID:',
      producto.id_producto,
      '(Precio:',
      producto.precio,
      ', Comision:',
      producto.comision,
      ')'
    );
    console.log('- Anfitriona ID:', anfitrionaId);

    // 2. Simular el objeto de pedido que envía el frontend
    const subtotal = producto.precio;
    const propina = subtotal * 0.1; // 10% de propina
    const total = subtotal + propina;
    const totalComision = producto.comision || 0;

    const mockOrder = {
      codigo: 'TEST-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      meseroId: meseroId,
      clienteId: clienteId,
      subtotal: subtotal,
      total: total,
      propina: propina,
      totalComision: totalComision,
      detalles: [
        {
          productoId: producto.id_producto,
          precio: producto.precio,
          comision: producto.comision || 0,
          cantidad: 1,
          subtotal: producto.precio,
          generaComision: (producto.comision || 0) > 0 ? 1 : 0,
          hostessId: anfitrionaId,
          selectedHostesses: anfitrionaId ? [anfitrionaId] : [],
          roomId: null
        }
      ],
      usuarios: anfitrionaId ? [{ usuarioId: anfitrionaId }] : []
    };

    console.log('\nSimulando envío de pedido (Payload):');
    console.log(JSON.stringify(mockOrder, null, 2));

    // 3. Ejecutar la creación en el repositorio
    const result = await OrderRepository.create(mockOrder);
    const pedidoId = result.id;
    console.log('\nPedido creado exitosamente. ID:', pedidoId);

    // 4. Verificar en la base de datos
    console.log('\nVerificando datos en la base de datos...');

    const [pedidoDB] = await query('SELECT * FROM pedidos WHERE id_pedido = ?', [pedidoId]);
    console.log('Tabla "pedidos":');
    console.log('- Cliente ID:', pedidoDB.cliente_id, '(Esperado:', clienteId, ')');
    console.log('- Subtotal:', pedidoDB.subtotal, '(Esperado:', subtotal, ')');
    console.log('- Propina:', pedidoDB.propina, '(Esperado:', propina, ')');
    console.log('- Total:', pedidoDB.total, '(Esperado:', total, ')');

    const [detalleDB] = await query('SELECT * FROM detalle_pedidos WHERE pedido_id = ?', [
      pedidoId
    ]);
    console.log('\nTabla "detalle_pedidos":');
    console.log('- Producto ID:', detalleDB.producto_id);
    console.log('- Precio:', detalleDB.precio, '(Esperado:', producto.precio, ')');
    console.log('- Comision:', detalleDB.comision, '(Esperado:', producto.comision || 0, ')');

    if (anfitrionaId) {
      const anfitrionasDetalle = await query(
        'SELECT * FROM detalle_pedidos_anfitrionas WHERE detalle_pedido_id = ?',
        [detalleDB.id_detalle_pedido]
      );
      console.log('\nTabla "detalle_pedidos_anfitrionas":');
      console.log('- Registros encontrados:', anfitrionasDetalle.length);
      if (anfitrionasDetalle.length > 0) {
        console.log(
          '- Anfitriona ID:',
          anfitrionasDetalle[0].anfitriona_id,
          '(Esperado:',
          anfitrionaId,
          ')'
        );
      }

      const usuariosPedido = await query('SELECT * FROM pedidos_usuarios WHERE pedido_id = ?', [
        pedidoId
      ]);
      console.log('\nTabla "pedidos_usuarios":');
      console.log('- Registros encontrados:', usuariosPedido.length);
    }

    // 5. Limpieza (opcional, pero mejor dejarlo para auditoría si es ambiente de dev)
    // console.log('\nEliminando pedido de prueba...');
    // await OrderRepository.delete(pedidoId);
    // console.log('Pedido eliminado.');

    console.log('\n--- Prueba finalizada con ÉXITO ---');
  } catch (error) {
    console.error('\n--- ERROR durante la prueba ---');
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testOrderSubmission();
