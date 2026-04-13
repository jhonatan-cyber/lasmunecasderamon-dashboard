/* eslint-disable no-console */
const mysql = require('mysql2/promise');
require('dotenv').config();

const queryMock = async (sql, params = []) => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  try {
    const [rows] = await connection.execute(sql.replace(/@/g, ''), params);
    return rows;
  } finally {
    await connection.end();
  }
};

const VentasStatsRepository = {
  getVentasBarras: async caja_id => {
    const results = await queryMock(
      `
          SELECT 
            COALESCE(SUM(v.total), 0) as total_venta,
            COALESCE(SUM(dv.precio * dv.cantidad), 0) as monto_productos,
            COALESCE(SUM(v.propina), 0) as propinas
          FROM ventas v
          INNER JOIN detalle_ventas dv ON v.id_venta = dv.venta_id
          LEFT JOIN comisiones c ON v.id_venta = c.venta_id
          WHERE v.caja_id = ?
            AND c.id_comision IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM detalle_ventas dv2
              INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
              WHERE dv2.venta_id = v.id_venta
                AND (LOWER(p2.nombre) REGEXP 'champagne|champaña|shampage|champan')
            )
        `,
      [caja_id]
    );
    const row = results[0] || { total_venta: 0, monto_productos: 0, propinas: 0 };
    return {
      total_venta: Number(row.total_venta),
      monto_productos: Number(row.monto_productos),
      propinas: Number(row.propinas)
    };
  },
  getVentasChampagne: async caja_id => {
    const results = await queryMock(
      `
          SELECT 
            COALESCE(SUM(DISTINCT v.total), 0) as total_venta,
            COALESCE(SUM(DISTINCT v.propina), 0) as propinas,
            (
              SELECT COALESCE(SUM(dv.precio * dv.cantidad), 0)
              FROM detalle_ventas dv
              INNER JOIN productos p ON p.id_producto = dv.producto_id
              WHERE dv.venta_id = v.id_venta
                AND (LOWER(p.nombre) REGEXP 'champagne|champaña|shampage|champan')
            ) as monto_champagne,
            (
              SELECT COALESCE(SUM(dc.comision), 0)
              FROM comisiones c
              INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision
              WHERE c.venta_id = v.id_venta
            ) as comisiones
          FROM ventas v
          WHERE v.caja_id = ?
            AND EXISTS (
              SELECT 1 FROM detalle_ventas dv2
              INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
              WHERE dv2.venta_id = v.id_venta
                AND (LOWER(p2.nombre) REGEXP 'champagne|champaña|shampage|champan')
            )
          GROUP BY v.id_venta
        `,
      [caja_id]
    );
    return results.reduce(
      (acc, row) => ({
        total_venta: acc.total_venta + Number(row.total_venta),
        monto_champagne: acc.monto_champagne + Number(row.monto_champagne),
        comisiones: acc.comisiones + Number(row.comisiones),
        propinas: acc.propinas + Number(row.propinas)
      }),
      { total_venta: 0, monto_champagne: 0, comisiones: 0, propinas: 0 }
    );
  },
  getVentasTragosChicas: async caja_id => {
    const results = await queryMock(
      `
          SELECT 
            COALESCE(SUM(DISTINCT v.total), 0) as total_venta,
            COALESCE(SUM(DISTINCT v.propina), 0) as propinas,
            (
              SELECT COALESCE(SUM(dc.comision), 0)
              FROM comisiones c
              INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision
              WHERE c.venta_id = v.id_venta
            ) as comisiones,
            (
              SELECT COALESCE(SUM(dv.precio * dv.cantidad), 0)
              FROM detalle_ventas dv
              WHERE dv.venta_id = v.id_venta
            ) as monto_productos
          FROM ventas v
          INNER JOIN comisiones c ON c.venta_id = v.id_venta
          WHERE v.caja_id = ?
            AND NOT EXISTS (
              SELECT 1 FROM detalle_ventas dv2
              INNER JOIN productos p2 ON p2.id_producto = dv2.producto_id
              WHERE dv2.venta_id = v.id_venta
                AND (LOWER(p2.nombre) REGEXP 'champagne|champaña|shampage|champan')
            )
          GROUP BY v.id_venta
        `,
      [caja_id]
    );
    return results.reduce(
      (acc, row) => {
        const comisiones = Number(row.comisiones || 0);
        const propinas = Number(row.propinas || 0);
        const montoProductos = Number(row.monto_productos || 0);
        return {
          total_venta: acc.total_venta + Number(row.total_venta),
          monto_productos:
            acc.monto_productos + Math.max(0, montoProductos - propinas - comisiones),
          comisiones: acc.comisiones + comisiones,
          propinas: acc.propinas + propinas
        };
      },
      { total_venta: 0, monto_productos: 0, comisiones: 0, propinas: 0 }
    );
  }
};

async function testVentasStatsRepository() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: VentasStatsRepository ---');

  try {
    const activeCaja = await queryMock('SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1');
    if (activeCaja.length === 0) {
      console.log('   - No hay cajas abiertas para probar, usando la última cerrada...');
      const lastCaja = await queryMock(
        'SELECT id_caja FROM cajas ORDER BY fecha_apertura DESC LIMIT 1'
      );
      if (lastCaja.length === 0) throw new Error('No hay cajas en la base de datos');
      activeCaja.push(lastCaja[0]);
    }
    const cajaId = activeCaja[0].id_caja;
    console.log(`Usando caja ID: ${cajaId}`);

    // 1. Test getVentasBarras
    console.log('1. Probando getVentasBarras...');
    const barras = await VentasStatsRepository.getVentasBarras(cajaId);
    console.log(`   - Total Ventas Barras: ${barras.total_venta}`);
    if (typeof barras.total_venta !== 'number')
      throw new Error('getVentasBarras no retornó un número');

    // 2. Test getVentasChampagne
    console.log('2. Probando getVentasChampagne...');
    const champagne = await VentasStatsRepository.getVentasChampagne(cajaId);
    console.log(`   - Total Ventas Champagne: ${champagne.total_venta}`);

    // 3. Test getVentasTragosChicas
    console.log('3. Probando getVentasTragosChicas...');
    const tragos = await VentasStatsRepository.getVentasTragosChicas(cajaId);
    console.log(`   - Total Ventas Tragos Chicas: ${tragos.total_venta}`);

    console.log('\nPRUEBAS UNITARIAS COMPLETADAS CON ÉXITO');
  } catch (error) {
    console.error('\nERROR EN LAS PRUEBAS:', error.message);
    process.exit(1);
  }
}

testVentasStatsRepository();
