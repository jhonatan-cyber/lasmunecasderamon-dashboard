import { query } from '@/lib/database/db';

export function listarAdministradoresActivos(): Promise<Array<{ id_usuario: string }>> {
  return query(
    `SELECT u.id_usuario FROM usuarios u
     INNER JOIN roles r ON u.rol_id = r.id_rol
     WHERE LOWER(r.nombre) = 'administrador' AND u.estado = 1`
  );
}
