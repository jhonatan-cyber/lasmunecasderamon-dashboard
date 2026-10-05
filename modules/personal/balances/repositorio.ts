/**
 * Cálculo de los saldos que habilitan un anticipo. Infraestructura privada del
 * módulo Personal: SQL de `usuarios`, `asistencias`, `comisiones`, `propinas`,
 * `gratificaciones`, `horas_extras` y `anticipos`, todas tablas de Personal.
 *
 * Este SQL vivía en `lib/business/anticiposUtils.ts`, que era un segundo hogar
 * para lógica de Personal fuera del módulo. La fase 6 pide «reubicar reglas en su
 * propietario»: el archivo se movió verbatim y sus consumidores (las rutas de
 * anticipos y la de estadísticas propias) ahora llaman la API pública del módulo.
 */
import { query } from '@/lib/database/db';
import { DatabaseError } from '@/lib/errors/errors';

type AnticipoBalances = {
  montoAsistencia: number;
  montoComision: number;
  montoPropina: number;
  montoMaximo: number;
};

let cachedTableChecks: { hasGratificaciones: boolean; hasHorasExtras: boolean } | null = null;

export async function getAnticipoBalances(usuarioId: string): Promise<AnticipoBalances> {
  try {
    if (!cachedTableChecks) {
      const tableChecks = await query<any[]>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = current_schema()
         AND table_name IN ('gratificaciones', 'horas_extras')`
      );
      cachedTableChecks = {
        hasGratificaciones: tableChecks.some(t => t.table_name === 'gratificaciones'),
        hasHorasExtras: tableChecks.some(t => t.table_name === 'horas_extras')
      };
    }

    const mainSql = `
      SELECT
        U.id_usuario,
        (COALESCE(A.total_asistencias, 0) * U.sueldo) as monto_sueldo,
        (COALESCE(A.total_asistencias, 0) * U.aporte) as monto_aporte,
        (COALESCE(S.total_semanas, 0) * U.descuento) as monto_descuento_hab,
        (SELECT COALESCE(SUM(DC.comision), 0) FROM detalle_comisiones DC INNER JOIN comisiones C ON C.id_comision = DC.comision_id WHERE DC.usuario_id = U.id_usuario AND C.estado = 1) as total_comisiones,
        (SELECT COALESCE(SUM(DP.monto), 0) FROM detalle_propinas DP INNER JOIN propinas P ON P.id_propina = DP.propina_id WHERE DP.usuario_id = U.id_usuario AND P.estado = 1) as total_propinas,
        (SELECT COALESCE(SUM(monto), 0) FROM anticipos WHERE usuario_id = U.id_usuario AND estado IN (0, 1)) as total_anticipos
        ${cachedTableChecks.hasGratificaciones ? ', (SELECT COALESCE(SUM(monto), 0) FROM gratificaciones WHERE usuario_id = U.id_usuario AND estado = 1) as total_gratificaciones' : ', 0 as total_gratificaciones'}
        ${cachedTableChecks.hasHorasExtras ? ', (SELECT COALESCE(SUM(total), 0) FROM horas_extras WHERE usuario_id = U.id_usuario AND estado = 1) as total_horas_extras' : ', 0 as total_horas_extras'}
      FROM usuarios U
      LEFT JOIN (
        SELECT usuario_id, COUNT(*) AS total_asistencias
        FROM asistencias WHERE estado = 1 GROUP BY usuario_id
      ) A ON U.id_usuario = A.usuario_id
      LEFT JOIN (
        SELECT usuario_id, COUNT(DISTINCT TO_CHAR(fecha, 'IYYY-IW')) AS total_semanas
        FROM asistencias WHERE estado = 1 GROUP BY usuario_id
      ) S ON U.id_usuario = S.usuario_id
      WHERE U.id_usuario = ?
    `;

    const result = await query<any[]>(mainSql, [usuarioId]);
    const data = result[0] || {
      monto_sueldo: 0,
      monto_aporte: 0,
      monto_descuento_hab: 0,
      total_comisiones: 0,
      total_propinas: 0,
      total_anticipos: 0,
      total_gratificaciones: 0,
      total_horas_extras: 0
    };

    const ingresos =
      Number(data.monto_sueldo) +
      Number(data.total_propinas) +
      Number(data.total_comisiones) +
      Number(data.total_gratificaciones) +
      Number(data.total_horas_extras);

    const egresos =
      Number(data.monto_aporte) + Number(data.monto_descuento_hab) + Number(data.total_anticipos);

    const montoMaximo = Math.max(0, ingresos - egresos);

    return {
      montoAsistencia: Number(data.monto_sueldo),
      montoComision: Number(data.total_comisiones),
      montoPropina: Number(data.total_propinas),
      montoMaximo
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    throw new DatabaseError(`Error al calcular balances de anticipo: ${msg}`, error);
  }
}
