import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query, generateUUID } from '@/lib/database/db';
import logger from '@/lib/utils/logger';

const DEFAULT_ROLES = [
  { nombre: 'Administrador', descripcion: 'Rol administrador creado automáticamente' },
  { nombre: 'Cajero', descripcion: 'Acceso al sistema y a la app' },
  { nombre: 'Garzon', descripcion: 'Acceso a la app' },
  { nombre: 'Anfitriona', descripcion: 'Acceso a la app' }
];

/**
 * Seed de roles por defecto si la tabla está vacía.
 * Lo usa la UI de Roles (`app/roles/page.tsx`) cuando no hay roles.
 */
export const POST = withRoute({ auth: true, access: 'administrator', audit: true }, async () => {
  try {
    const existing = await query<any[]>(`SELECT COUNT(*)::int AS count FROM roles`);
    const count = existing?.[0]?.count ?? 0;

    if (count > 0) {
      return NextResponse.json({
        success: true,
        message: 'La tabla de roles ya tiene datos',
        details: { rolesExistentes: count, creados: 0 }
      });
    }

    let creados = 0;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    for (const role of DEFAULT_ROLES) {
      await query(
        `INSERT INTO roles (id_rol, nombre, descripcion, estado, fecha_crea, fecha_mod, fecha_baja)
         VALUES (?, ?, ?, 1, ?, NULL, NULL)`,
        [generateUUID(), role.nombre, role.descripcion, now]
      );
      creados++;
    }

    return NextResponse.json({
      success: true,
      message: 'Tabla de roles configurada correctamente',
      details: { creados }
    });
  } catch (error: any) {
    logger.error('[roles/setup] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error interno' },
      { status: 500 }
    );
  }
});
