import 'dotenv/config';
import mysql from 'mysql2/promise';

async function backfill() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '195.200.4.245',
    user: process.env.DB_USER || 'nuwesoft',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'lasmunecasderamon',
    port: Number(process.env.DB_PORT || 3306),
    timezone: '-04:00',
    dateStrings: true,
    charset: 'utf8mb4'
  });

  try {
    console.log('🔄 Backfilling anticipo_historial desde anticipos existentes...\n');

    // Obtener todos los anticipos
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

      // 1. Solicitud — cuando se creó el anticipo (todos tienen fecha_crea)
      entries.push({
        anticipo_id: a.id_anticipo,
        accion: 'solicitud',
        usuario_id: a.usuario_id,
        fecha_crea: a.fecha_crea
      });

      // 2. Aprobado — si tiene fecha_aprobacion
      if (a.fecha_aprobacion) {
        entries.push({
          anticipo_id: a.id_anticipo,
          accion: 'aprobado',
          usuario_id: null,
          fecha_crea: a.fecha_aprobacion
        });
      }

      // 3. Rechazado — si estado=3 (usa fecha_mod como fecha del rechazo)
      if (Number(a.estado) === 3 && a.fecha_mod) {
        entries.push({
          anticipo_id: a.id_anticipo,
          accion: 'rechazado',
          usuario_id: null,
          fecha_crea: a.fecha_mod
        });
      }

      // 4. Entregado — si tiene fecha_entrega
      if (a.fecha_entrega) {
        // entregado_por es INT pero usuarios.id_usuario es varchar(36) UUID,
        // asi que los INT antiguos no coincidirian con la FK. Usamos NULL.
        entries.push({
          anticipo_id: a.id_anticipo,
          accion: 'entregado',
          usuario_id: null,
          fecha_crea: a.fecha_entrega
        });
      }

      // Insertar todas las entradas con INSERT IGNORE para evitar duplicados
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
    console.error('❌ Error en backfill:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

backfill();
