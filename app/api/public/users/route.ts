import { NextResponse } from 'next/server';
import { query } from '@/lib/database/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query<any[]>(`
      SELECT u.id_usuario as id, u.nombre, u.apellido, u.nick, u.foto, u.qr_token, r.nombre as role
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id_rol
      WHERE u.estado = 1 AND (r.nombre IS NULL OR LOWER(r.nombre) <> 'administrador')
      ORDER BY u.nombre ASC, u.apellido ASC
    `);

    const users = rows.map(row => ({
      id: row.id,
      name: `${row.nombre} ${row.apellido}`,
      nick: row.nick,
      foto: row.foto || 'default.png',
      qr_token: row.qr_token,
      role: row.role || 'Sin Rol'
    }));

    const configRows = await query<any[]>(
      "SELECT clave, valor FROM configuraciones WHERE clave IN ('asistencia_hora_inicio', 'asistencia_hora_fin', 'timezone')"
    );

    let startHour = 21;
    let endHour = 23;
    let timezone = 'America/Santiago';

    for (const row of configRows) {
      if (row.clave === 'asistencia_hora_inicio') {
        const val = parseInt(row.valor, 10);
        if (!isNaN(val)) startHour = val;
      } else if (row.clave === 'asistencia_hora_fin') {
        const val = parseInt(row.valor, 10);
        if (!isNaN(val)) endHour = val;
      } else if (row.clave === 'timezone') {
        timezone = row.valor;
      }
    }

    let codeRes = await query<any[]>(
      'SELECT codigo FROM codigos WHERE estado = 1 ORDER BY fecha_crea DESC LIMIT 1'
    );
    let systemCode = codeRes.length > 0 ? codeRes[0].codigo : null;
    const isValidCode = systemCode && /^\d{4}$/.test(systemCode);

    if (!systemCode || !isValidCode) {
      const { generateRandomCode4 } = require('@/lib/utils/codeUtils');
      const { getNowInBusinessTimezone } = require('@/lib/business/timezoneService');
      const newCode = generateRandomCode4();
      const crypto = require('crypto');
      const newId = crypto.randomUUID();
      const fechaSQL = getNowInBusinessTimezone();

      await query('DELETE FROM codigos');
      await query(
        'INSERT INTO codigos (id_codigo, codigo, fecha_crea, estado) VALUES (?, ?, ?, 1)',
        [newId, newCode, fechaSQL]
      );
      systemCode = newCode;
    }

    return NextResponse.json({
      success: true,
      data: users,
      config: {
        asistencia_hora_inicio: startHour,
        asistencia_hora_fin: endHour,
        timezone,
        systemCode
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al obtener los usuarios' },
      { status: 500 }
    );
  }
}
