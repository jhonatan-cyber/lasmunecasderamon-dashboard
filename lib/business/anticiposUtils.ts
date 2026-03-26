import { query } from '@/lib/database/db';

type AnticipoBalances = {
  montoAsistencia: number;
  montoComision: number;
  montoPropina: number;
  montoMaximo: number;
};

export async function getAnticipoBalances(usuarioId: string): Promise<AnticipoBalances> {
  const asistenciaResult = (await query(
    `SELECT total_final FROM (
      SELECT U.id_usuario, (COALESCE(A.total_asistencias, 0) * U.sueldo)
        - (COALESCE(A.total_asistencias, 0) * U.aporte)
        - (COALESCE(U.semanas_con_descuento, 0) * U.descuento) AS total_final
      FROM (
        SELECT id_usuario, nombre, apellido, sueldo, aporte, descuento,
          COUNT(DISTINCT YEARWEEK(fecha, 1)) AS semanas_con_descuento
        FROM usuarios
        LEFT JOIN asistencias ON usuarios.id_usuario = asistencias.usuario_id AND asistencias.estado = 1
        GROUP BY id_usuario
      ) U
      LEFT JOIN (
        SELECT usuario_id, COUNT(*) AS total_asistencias
        FROM asistencias WHERE estado = 1 GROUP BY usuario_id
      ) A ON U.id_usuario = A.usuario_id
    ) X WHERE id_usuario = ?`,
    [usuarioId]
  )) as Array<{ total_final: number | string | null }>;

  const comisionesResult = (await query(
    `SELECT COALESCE(SUM(DC.comision),0) AS total
     FROM detalle_comisiones DC
     INNER JOIN comisiones C ON C.id_comision = DC.comision_id
     WHERE DC.usuario_id = ? AND C.estado = 1`,
    [usuarioId]
  )) as Array<{ total: number | string | null }>;

  const propinasResult = (await query(
    `SELECT COALESCE(SUM(DP.monto),0) AS total
     FROM detalle_propinas DP
     INNER JOIN propinas P ON P.id_propina = DP.propina_id
     WHERE DP.usuario_id = ? AND P.estado = 1`,
    [usuarioId]
  )) as Array<{ total: number | string | null }>;

  const montoAsistencia = Number(asistenciaResult[0]?.total_final || 0);
  const montoComision = Number(comisionesResult[0]?.total || 0);
  const montoPropina = Number(propinasResult[0]?.total || 0);
  const montoMaximo = montoAsistencia + montoComision + montoPropina;

  return {
    montoAsistencia,
    montoComision,
    montoPropina,
    montoMaximo,
  };
}
