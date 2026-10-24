import { generateUUID, query } from '@/lib/database/db';
import type { ContextoOperacion } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import { BusinessError, ConflictError } from '@/lib/errors/errors';

/**
 * Planilla pendiente de cada trabajador.
 *
 * El período es "lo acumulado desde la última liquidación": cada componente se
 * suma mientras esté en `estado = 1` y el pago lo pone a 0, así que no hace
 * falta un rango de fechas. **No se filtra `U.estado`**: los trabajadores dados
 * de baja siguen apareciendo mientras les quede saldo, que es justamente lo que
 * hay que poder pagarles al irse.
 *
 * `ULT` trae la última liquidación registrada en `pagos_nomina` para mostrar en
 * la lista cuándo y por cuánto se pagó por última vez.
 */
const PAYROLL_SQL = `
SELECT * FROM (SELECT U.id_usuario, R.nombre AS rol, (CAST(U.nombre AS text) || CAST(' ' AS text) || CAST(U.apellido AS text)) AS usuario, U.foto AS usuario_foto,
       COALESCE(ASIS.asistencias * U.sueldo, 0) AS sueldos, COALESCE(ASIS.asistencias * U.aporte, 0) AS aportes,
       COALESCE(VEN.total_venta, 0) AS ventas, COALESCE(SERV.total_servicios, 0) AS servicios,
       COALESCE(ANT.total_anticipos, 0) AS anticipos, COALESCE(PROP.total_propinas, 0) AS propinas,
       COALESCE(HR.total_monto_horas, 0) AS total_monto_horas, COALESCE(GRAT.total_gratificaciones, 0) AS gratificaciones,
       COALESCE(SEM.semanas * U.descuento, 0) AS descuentos,
       ULT.fecha_pago AS ultima_liquidacion_fecha, ULT.monto AS ultima_liquidacion_monto,
       ULT.entregado_por AS ultima_liquidacion_por,
       (COALESCE(ASIS.asistencias * U.sueldo, 0) + COALESCE(VEN.total_venta, 0) + COALESCE(SERV.total_servicios, 0) + COALESCE(PROP.total_propinas, 0) + COALESCE(HR.total_monto_horas, 0) + COALESCE(GRAT.total_gratificaciones, 0) - COALESCE(ANT.total_anticipos, 0) - COALESCE(ASIS.asistencias * U.aporte, 0) - COALESCE(SEM.semanas * U.descuento, 0)) AS total
FROM usuarios U
INNER JOIN roles R ON R.id_rol = U.rol_id
LEFT JOIN (SELECT usuario_id, COUNT(*) AS asistencias FROM asistencias WHERE estado = 1 GROUP BY usuario_id) AS ASIS ON ASIS.usuario_id = U.id_usuario
LEFT JOIN (SELECT DC.usuario_id, SUM(DC.comision) AS total_venta FROM detalle_comisiones DC INNER JOIN comisiones C ON C.id_comision = DC.comision_id WHERE C.venta_id IS NOT NULL AND C.estado = 1 AND DC.estado = 1 GROUP BY DC.usuario_id) AS VEN ON VEN.usuario_id = U.id_usuario
LEFT JOIN (SELECT DC.usuario_id, SUM(DC.comision) AS total_servicios FROM detalle_comisiones DC INNER JOIN comisiones C ON C.id_comision = DC.comision_id WHERE C.servicio_id IS NOT NULL AND C.estado = 1 AND DC.estado = 1 GROUP BY DC.usuario_id) AS SERV ON SERV.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_anticipos FROM anticipos WHERE estado = 1 GROUP BY usuario_id) AS ANT ON ANT.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_propinas FROM detalle_propinas WHERE estado = 1 GROUP BY usuario_id) AS PROP ON PROP.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(total) AS total_monto_horas FROM horas_extras WHERE estado = 1 GROUP BY usuario_id) AS HR ON HR.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, SUM(monto) AS total_gratificaciones FROM gratificaciones WHERE estado = 1 GROUP BY usuario_id) AS GRAT ON GRAT.usuario_id = U.id_usuario
LEFT JOIN (SELECT usuario_id, COUNT(DISTINCT TO_CHAR(fecha, 'IYYY-IW')) AS semanas FROM asistencias WHERE estado = 1 GROUP BY usuario_id) AS SEM ON SEM.usuario_id = U.id_usuario
LEFT JOIN LATERAL (SELECT fecha_pago, monto, entregado_por FROM pagos_nomina WHERE usuario_id = U.id_usuario ORDER BY fecha_pago DESC, fecha_crea DESC LIMIT 1) ULT ON TRUE
) payroll WHERE total > 0`;

/** Lo que se liquida en un pago: el total y el desglose que lo compone. */
export interface ResumenPago {
  total: number;
  componentes: Record<string, number>;
}

const COMPONENTES = [
  'sueldos',
  'aportes',
  'ventas',
  'servicios',
  'anticipos',
  'propinas',
  'total_monto_horas',
  'gratificaciones',
  'descuentos'
] as const;

function resumenDeFila(fila: Record<string, unknown>): ResumenPago {
  const componentes: Record<string, number> = {};
  for (const nombre of COMPONENTES) componentes[nombre] = Number(fila[nombre] ?? 0);
  return { total: Number(fila.total ?? 0), componentes };
}

export class PayrollRepository {
  static async getSummary() {
    return await query(PAYROLL_SQL, []);
  }

  /**
   * Saldo a pagar del trabajador, calculado **dentro** de la unidad de trabajo.
   *
   * El `FOR UPDATE` serializa dos pagos simultáneos del mismo trabajador: el
   * segundo ve el saldo ya liquidado y se rechaza, en lugar de pisar al
   * primero. `totalEsperado` es lo que la lista mostró al operador: si el saldo
   * cambió entre el GET y el POST (llegó una gratificación, otro administrador
   * pagó), se corta en vez de liquidar un monto distinto al confirmado.
   */
  static async resumenParaPago(
    userId: string,
    totalEsperado: number | undefined,
    contexto: ContextoOperacion
  ): Promise<ResumenPago> {
    const trx = resolverTransaccion(contexto);
    await trx('SELECT id_usuario FROM usuarios WHERE id_usuario = ? FOR UPDATE', [userId]);

    const filas = await trx<any[]>(`${PAYROLL_SQL} AND id_usuario = ?`, [userId]);
    if (!filas[0])
      throw new BusinessError('Este trabajador no tiene pagos pendientes', 'SIN_PENDIENTES');

    const resumen = resumenDeFila(filas[0]);
    if (totalEsperado !== undefined && Number(totalEsperado) !== resumen.total)
      throw new ConflictError(
        `El total a pagar cambió: la lista mostraba ${Number(totalEsperado)} y el saldo actual es ${resumen.total}. Revisa la planilla y vuelve a pagar.`
      );
    return resumen;
  }

  /**
   * Ceroa los pendientes del trabajador y deja el registro de la liquidación.
   *
   * El pago no genera movimiento de caja: el sueldo no se descuenta del arqueo
   * (decisión de negocio). Lo que sí queda es la fila en `pagos_nomina` con el
   * monto, el desglose y quién lo entregó.
   */
  static async registrarPago(
    userId: string,
    entregadoPor: string | undefined,
    now: string,
    resumen: ResumenPago,
    contexto: ContextoOperacion
  ) {
    const trx = resolverTransaccion(contexto);

    await trx(
      'UPDATE detalle_comisiones SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
      [now, userId]
    );

    await trx(
      `UPDATE comisiones c
         SET estado = 2, fecha_mod = ?
         WHERE c.estado = 1
           AND NOT EXISTS (
             SELECT 1 FROM detalle_comisiones dc
             WHERE dc.comision_id = c.id_comision AND dc.estado = 1
           )`,
      [now]
    );

    await trx(
      'UPDATE detalle_propinas SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
      [now, userId]
    );

    await trx(
      `UPDATE propinas p
         SET estado = 0, fecha_mod = ?
         WHERE p.estado = 1
           AND NOT EXISTS (
             SELECT 1 FROM detalle_propinas dp
             WHERE dp.propina_id = p.id_propina AND dp.estado = 1
           )`,
      [now]
    );

    if (entregadoPor) {
      await trx(
        'UPDATE anticipos SET estado = 4, fecha_cobro = ?, fecha_mod = ?, entregado_por = ? WHERE usuario_id = ? AND estado = 1',
        [now, now, String(entregadoPor), userId]
      );
    } else {
      await trx(
        'UPDATE anticipos SET estado = 4, fecha_cobro = ?, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
        [now, now, userId]
      );
    }

    await trx(
      'UPDATE horas_extras SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
      [now, userId]
    );

    await trx(
      'UPDATE gratificaciones SET estado = 0, fecha_mod = ? WHERE usuario_id = ? AND estado = 1',
      [now, userId]
    );

    await trx(
      `INSERT INTO pagos_nomina (id, usuario_id, monto, componentes, entregado_por, fecha_pago, fecha_crea)
       VALUES (?, ?, ?, ?::jsonb, ?, ?, ?)`,
      [
        generateUUID(),
        userId,
        resumen.total,
        JSON.stringify(resumen.componentes),
        entregadoPor || null,
        now,
        now
      ]
    );
  }
}
