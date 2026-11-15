const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

(async () => {
  const root = path.resolve(__dirname, '..');
  const result = await esbuild.build({
    entryPoints: [path.join(root, 'modules/caja/turnos/cierrePdf.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    packages: 'external',
    alias: { '@': root }
  });
  const compiled = new Module(path.join(__dirname, 'qoder-caja-rendered.cjs'), module);
  compiled.filename = path.join(__dirname, 'qoder-caja-rendered.cjs');
  compiled.paths = module.paths;
  compiled._compile(result.outputFiles[0].text, compiled.filename);
  const data = {
    caja_id: 'DEMO-LOCAL',
    estado: 'aprobada',
    cajero_nombre: 'Operador de prueba',
    resuelto_por: 'Persona autorizadora de prueba',
    solicitado_por: 'Operador solicitante de prueba',
    fecha_apertura: '2026-11-12 19:00:00',
    fecha_cierre: '2026-11-13 03:00:00',
    venta: 120000, servicio: 30000, propina: 5000, comision: 10000,
    anticipo: 0, iva: 0, monto_apertura: 50000,
    efectivo: 70000, tarjeta: 40000, transferencia: 20000,
    devolucion: 3000, retiro_total: 2000, saldo_clientes_descontado: 5000,
    prepago_cargado: 0, prepago_consumido: 0, prepago_pendiente_clientes: 5000,
    ventas_por_producto: [
      { producto: 'Cóctel de prueba', unidades: 8, monto: 64000 },
      { producto: 'Bebida de prueba', unidades: 5, monto: 25000 }
    ],
    monto_cierre_calculado: 175000
  };
  const pdf = compiled.exports.generarPdfCierreCaja(data);
  const output = path.join(__dirname, 'qoder-caja-final.pdf');
  fs.writeFileSync(output, pdf);
  console.log(JSON.stringify({ output, bytes: pdf.length, data: 'ficticios', realWrites: 0 }));
})().catch(error => { console.error(error); process.exitCode = 1; });
