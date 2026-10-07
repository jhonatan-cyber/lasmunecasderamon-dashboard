/* eslint-disable no-console -- Salida de la herramienta CLI de desarrollo. */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import pg from 'pg';
import postgres from '../../../lib/database/postgres.cjs';

// Herramienta local de desarrollo: las escrituras pertenecen al módulo Asistencia.
const config = postgres.connectionConfig();
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', '::1'].includes(config.host)
) {
  throw new Error('El seed de asistencia sólo se ejecuta en PostgreSQL local de desarrollo.');
}
const hasta = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
const desde = `${hasta.slice(0, 4)}-01-01`;
const dryRun = process.argv.includes('--dry-run');
const client = new pg.Client(config);

try {
  await client.connect();
  await client.query('BEGIN');
  // Serializa ejecuciones simultáneas del seed y protege el control por usuario/fecha.
  await client.query('LOCK TABLE asistencias IN SHARE ROW EXCLUSIVE MODE');
  const { rows: usuarios } = await client.query(`
    SELECT u.id_usuario, u.nick FROM usuarios u
    LEFT JOIN roles r ON r.id_rol = u.rol_id
    WHERE LOWER(COALESCE(r.nombre, '')) NOT LIKE '%admin%'
      AND LOWER(COALESCE(u.nick, '')) NOT IN ('admin', 'administrador', 'administrator')
    ORDER BY u.id_usuario
  `);
  const fechas = [];
  for (
    let day = new Date(`${desde}T00:00:00Z`);
    day.toISOString().slice(0, 10) <= hasta;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    fechas.push(day.toISOString().slice(0, 10));
  }
  const resumen = [];
  for (const usuario of usuarios) {
    const { rows: existentes } = await client.query(
      'SELECT fecha::text FROM asistencias WHERE usuario_id = $1 AND fecha BETWEEN $2::date AND $3::date',
      [usuario.id_usuario, desde, hasta]
    );
    const presentes = new Set(existentes.map(row => row.fecha));
    const nuevas = [];
    for (const fecha of fechas) {
      const hash = createHash('sha256')
        .update(`asistencia-seed-v1:${usuario.id_usuario}:${fecha}`)
        .digest();
      // Aproximadamente 80% de presencia; distribución estable y distinta por persona.
      if (hash[0] % 10 < 2 || presentes.has(fecha)) continue;
      nuevas.push({
        id: `seed-asistencia-${hash.toString('hex').slice(0, 20)}`,
        fecha,
        hora: `08:${String(hash[1] % 60).padStart(2, '0')}:00`
      });
      presentes.add(fecha);
    }
    if (!dryRun && nuevas.length) {
      await client.query(
        `
        INSERT INTO asistencias (id_asistencia, usuario_id, fecha, hora, estado, origen)
        SELECT x.id, $1::varchar, x.fecha::date, x.hora::time, 1, 'seed'
        FROM jsonb_to_recordset($2::jsonb) AS x(id text, fecha text, hora text)
        WHERE NOT EXISTS (
          SELECT 1 FROM asistencias a WHERE a.usuario_id = $1::varchar AND a.fecha = x.fecha::date
        )
        ON CONFLICT (id_asistencia) DO NOTHING
      `,
        [usuario.id_usuario, JSON.stringify(nuevas)]
      );
    }
    resumen.push({
      usuario: usuario.nick,
      nuevas: nuevas.length,
      asistencias: presentes.size,
      faltas: fechas.length - presentes.size
    });
  }
  await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
  console.log(
    `${dryRun ? 'Simulación' : 'Seed aplicado'}: ${desde} hasta ${hasta} (${fechas.length} días calendario).`
  );
  console.table(resumen);
  console.log(
    `Usuarios: ${usuarios.length}. Marcas nuevas: ${resumen.reduce((sum, row) => sum + row.nuevas, 0)}. Administradores excluidos.`
  );
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
