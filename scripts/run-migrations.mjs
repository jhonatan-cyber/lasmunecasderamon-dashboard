import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const MIGRATIONS_DIR = path.resolve('migrations');
const MIGRATIONS = [
  'create_anticipo_historial.sql',
  'add_monto_to_solicitudes_anulacion_ventas.sql',
  'fix_detalle_pedido_id_type.sql',
  'add_es_temporal_to_servicios.sql',
  'add_performance_indexes.sql',
  'create_query_logs_table.sql',
];

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    timezone: '-04:00',
    dateStrings: true,
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  try {
    console.log(`🔌 Conectado a ${process.env.DB_HOST}/${process.env.DB_NAME}\n`);

    // ── Migraciones ──
    for (const file of MIGRATIONS) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  ${file} no encontrado, saltando...`);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`  ▶️  Ejecutando ${file}...`);
      try {
        await connection.query(sql);
        console.log(`  ✅ ${file} — OK`);
      } catch (err) {
        // Ignorar errores de "Duplicate column" o "Duplicate key" si ya se ejecutó antes
        const msg = err.message?.toLowerCase() || '';
        if (msg.includes('duplicate column name') || msg.includes('duplicate key name')) {
          console.log(`  ⏭️  ${file} — ya aplicado (${err.message})`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ Migraciones completadas exitosamente\n');

    // ── Backfill ──
    console.log('🔄 Ejecutando backfill de anticipo_historial...\n');

    const [anticipos] = await connection.query(`
      SELECT
        id_anticipo,
        usuario_id,
        fecha_crea,
        fecha_mod,
        estado,
        fecha_aprobacion,
        fecha_entrega,
        entregado_por
      FROM anticipos
      ORDER BY fecha_crea ASC
    `);

    console.log(`  📦 ${anticipos.length} anticipo(s) encontrado(s)\n`);

    let totalInserted = 0;

    for (const a of anticipos) {
      const entries = [];

      // 1. Solicitud
      entries.push({
        anticipo_id: a.id_anticipo,
        accion: 'solicitud',
        usuario_id: a.usuario_id,
        fecha_crea: a.fecha_crea,
      });

      // 2. Aprobado
      if (a.fecha_aprobacion) {
        entries.push({
          anticipo_id: a.id_anticipo,
          accion: 'aprobado',
          usuario_id: null,
          fecha_crea: a.fecha_aprobacion,
        });
      }

      // 3. Rechazado
      if (Number(a.estado) === 3 && a.fecha_mod) {
        entries.push({
          anticipo_id: a.id_anticipo,
          accion: 'rechazado',
          usuario_id: null,
          fecha_crea: a.fecha_mod,
        });
      }

      // 4. Entregado
      if (a.fecha_entrega) {
        entries.push({
          anticipo_id: a.id_anticipo,
          accion: 'entregado',
          usuario_id: null,
          fecha_crea: a.fecha_entrega,
        });
      }

      for (const entry of entries) {
        try {
          await connection.query(
            `INSERT IGNORE INTO anticipo_historial (anticipo_id, accion, usuario_id, fecha_crea)
             VALUES (?, ?, ?, ?)`,
            [entry.anticipo_id, entry.accion, entry.usuario_id, entry.fecha_crea]
          );
          totalInserted++;
        } catch (err) {
          console.error(`  ⚠️  Error insertando ${entry.accion} para ${entry.anticipo_id}:`, err.message);
        }
      }
    }

    console.log(`  ✅ ${totalInserted} registro(s) insertado(s) en anticipo_historial\n`);
    console.log('✅ Backfill completado!');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
