/* eslint-disable no-console -- Salida de la herramienta CLI de desarrollo. */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import pg from 'pg';
import postgres from '../lib/database/postgres.cjs';

// Herramienta local de desarrollo: las escrituras pertenecen al módulo Clientes.
const config = postgres.connectionConfig();
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', '::1'].includes(config.host)
) {
  throw new Error('El seed de clientes sólo se ejecuta en PostgreSQL local de desarrollo.');
}
const dryRun = process.argv.includes('--dry-run');
const client = new pg.Client(config);

// Clientes bolivianos de prueba para un bar en La Paz. El documento (CI) va en
// la columna `run` (único campo de identificación; no existe columna email).
const CLIENTES = [
  { run: '12345678-LP', nombre: 'Carlos', apellido: 'Mamani', telefono: '+591 71234567' },
  { run: '87654321-LP', nombre: 'María', apellido: 'Quispe', telefono: '+591 69876543' },
  { run: '34567890-CB', nombre: 'José', apellido: 'Choque', telefono: '+591 74567890' },
  { run: '56789012-SC', nombre: 'Luis', apellido: 'Flores', telefono: '+591 67890123' },
  { run: '67890123-LP', nombre: 'Ana', apellido: 'Rodríguez', telefono: '+591 78901234' },
  { run: '78901234-OR', nombre: 'Carmen', apellido: 'García', telefono: '+591 65678901' },
  { run: '89012345-LP', nombre: 'Fernando', apellido: 'Pérez', telefono: '+591 70123456' },
  { run: '90123456-PT', nombre: 'Patricia', apellido: 'Gonzales', telefono: '+591 62345678' },
  { run: '11223344-LP', nombre: 'Diego', apellido: 'Vargas', telefono: '+591 73456789' },
  { run: '22334455-CB', nombre: 'Sofía', apellido: 'Lara', telefono: '+591 64567890' },
  { run: '33445566-LP', nombre: 'Marco', apellido: 'Rojas', telefono: '+591 75678901' },
  { run: '44556677-SC', nombre: 'Lucía', apellido: 'Mendoza', telefono: '+591 66789012' },
  { run: '55667788-LP', nombre: 'Raúl', apellido: 'Condori', telefono: '+591 77890123' },
  { run: '66778899-CB', nombre: 'Verónica', apellido: 'Ayma', telefono: '+591 68901234' },
  { run: '77889900-LP', nombre: 'Carlos', apellido: 'Flores', telefono: '+591 69012345' },
  { run: '88990011-OR', nombre: 'María', apellido: 'Vargas', telefono: '+591 70123457' },
  { run: '99001122-LP', nombre: 'José', apellido: 'Rojas', telefono: '+591 61234567' },
  { run: '10203040-LP', nombre: 'Luis', apellido: 'Mamani', telefono: '+591 72345678' },
  { run: '20304050-CB', nombre: 'Ana', apellido: 'Quispe', telefono: '+591 63456789' },
  { run: '30405060-SC', nombre: 'Carmen', apellido: 'Choque', telefono: '+591 74567891' },
  { run: '40506070-LP', nombre: 'Fernando', apellido: 'García', telefono: '+591 65678902' },
  { run: '50607080-PT', nombre: 'Patricia', apellido: 'Pérez', telefono: '+591 76789012' },
  { run: '60708090-LP', nombre: 'Diego', apellido: 'Gonzales', telefono: '+591 67890124' },
  { run: '70809010-CB', nombre: 'Sofía', apellido: 'Lara', telefono: '+591 78901234' },
  { run: '80901020-LP', nombre: 'Marco', apellido: 'Mendoza', telefono: '+591 69012356' }
];

function idPara(run) {
  const h = createHash('sha256').update(`seed-clientes-v1:${run}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

try {
  await client.connect();
  await client.query('BEGIN');
  // Serializa ejecuciones simultáneas del seed.
  await client.query('LOCK TABLE clientes IN SHARE ROW EXCLUSIVE MODE');
  const resumen = [];
  for (const cliente of CLIENTES) {
    const id = idPara(cliente.run);
    const { rowCount } = await client.query(
      `
      INSERT INTO clientes (id_cliente, run, nombre, apellido, telefono, fecha_crea, estado, saldo)
      SELECT $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::timestamp, 1, 0
      WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE lower(run) = lower($2::varchar))
      ON CONFLICT (id_cliente) DO NOTHING
      RETURNING id_cliente
      `,
      [id, cliente.run, cliente.nombre, cliente.apellido, cliente.telefono, new Date()]
    );
    resumen.push({
      run: cliente.run,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      telefono: cliente.telefono,
      estado: rowCount > 0 ? 'insertado' : 'ya existia'
    });
  }
  await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
  console.log(`${dryRun ? 'Simulación' : 'Seed aplicado'}: ${CLIENTES.length} clientes.`);
  console.table(resumen);
  const insertados = resumen.filter(r => r.estado === 'insertado').length;
  console.log(`Clientes nuevos: ${insertados}. Ya existían: ${CLIENTES.length - insertados}.`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
