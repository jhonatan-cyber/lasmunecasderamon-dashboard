const { SaleRepository } = require('./lib/repositories/SaleRepository');

async function testSaleDetail() {
  try {
    // Buscar una venta con un pedido asociado para probar el garzon_nombre
    const { query } = require('./lib/database/db');
    const sales = await query('SELECT id_venta FROM ventas WHERE pedido_id IS NOT NULL LIMIT 1');
    
    if (sales.length === 0) {
      console.log('No se encontraron ventas con pedido asociado para probar.');
      // Probar con cualquier venta
      const anySale = await query('SELECT id_venta FROM ventas LIMIT 1');
      if (anySale.length === 0) {
        console.log('No hay ventas en la base de datos.');
        return;
      }
      const id = anySale[0].id_venta;
      console.log(`Probando con venta ID: ${id}`);
      const result = await SaleRepository.getById(id);
      console.log('Resultado:', JSON.stringify(result, null, 2));
    } else {
      const id = sales[0].id_venta;
      console.log(`Probando con venta ID (con pedido): ${id}`);
      const result = await SaleRepository.getById(id);
      console.log('Resultado:', JSON.stringify(result, null, 2));
      console.log('Garzon Nombre:', result.garzon_nombre);
    }
  } catch (error) {
    console.error('Error durante la prueba:', error);
  } finally {
    process.exit(0);
  }
}

testSaleDetail();
