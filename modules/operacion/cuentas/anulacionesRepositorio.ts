import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

type CuentaCommissionRow = {
  id_detalle_cuenta: string;
  hostess_id: string | null;
  comision: number;
};

async function adjustCuentaCommission(
  cuentaId: string | undefined,
  currentTotal: number,
  remainingTotal: number,
  contexto: ContextoOperacion
) {
  const dbQuery = resolverTransaccion(contexto);
  if (!cuentaId) return 0;

  const detailRows = (await dbQuery(
    'SELECT id_detalle_cuenta, hostess_id, comision FROM detalle_cuentas WHERE cuenta_id = ? ORDER BY fecha_crea ASC',
    [cuentaId]
  )) as CuentaCommissionRow[];

  const currentCommissionTotal = detailRows.reduce(
    (sum, row) => sum + Number(row.comision || 0),
    0
  );
  if (currentCommissionTotal <= 0) {
    await dbQuery('UPDATE cuentas SET total_comision = ? WHERE id_cuenta = ?', [0, cuentaId]);
    return 0;
  }

  const remainingCommission =
    currentTotal > 0 && remainingTotal > 0
      ? Math.round((currentCommissionTotal * remainingTotal) / currentTotal)
      : 0;

  const baseRows = detailRows.map(row => ({
    ...row,
    nextComision:
      remainingCommission > 0
        ? Math.floor((Number(row.comision || 0) * remainingCommission) / currentCommissionTotal)
        : 0
  }));

  let assigned = baseRows.reduce((sum, row) => sum + row.nextComision, 0);
  let remainder = Math.max(0, remainingCommission - assigned);

  const hostessAnchors = new Map<string, number>();
  baseRows.forEach((row, index) => {
    const key = String(row.hostess_id || `sin_hostess_${index}`);
    if (!hostessAnchors.has(key)) {
      hostessAnchors.set(key, index);
    }
  });

  const distributionIndexes = Array.from(hostessAnchors.values());
  let cursor = 0;
  while (remainder > 0 && distributionIndexes.length > 0) {
    const rowIndex = distributionIndexes[cursor % distributionIndexes.length];
    baseRows[rowIndex].nextComision += 1;
    remainder -= 1;
    cursor += 1;
  }

  for (const row of baseRows) {
    await dbQuery('UPDATE detalle_cuentas SET comision = ? WHERE id_detalle_cuenta = ?', [
      row.nextComision,
      row.id_detalle_cuenta
    ]);
  }

  await dbQuery('UPDATE cuentas SET total_comision = ? WHERE id_cuenta = ?', [
    remainingCommission,
    cuentaId
  ]);

  return remainingCommission;
}

export async function procesarAnulacionCuentaCanal(
  solicitud: { id_cuenta?: string; solicitud_id?: string; monto?: number },
  accion: 'confirmar' | 'rechazar',
  contexto: ContextoOperacion
) {
  const dbQuery = resolverTransaccion(contexto);
  const now = getNowInBusinessTimezone();
  const requestedAmount = Number(solicitud.monto || 0);
  const cuentaInfo = (await dbQuery('SELECT total FROM cuentas WHERE id_cuenta = ? LIMIT 1', [
    solicitud.id_cuenta
  ])) as Array<{ total: number }>;

  const currentTotal = Number(cuentaInfo[0]?.total || 0);
  const remainingTotal = Math.max(0, currentTotal - requestedAmount);
  const nextCuentaState = accion === 'confirmar' ? (remainingTotal > 0 ? 4 : 3) : 1;

  let nextCommissionTotal = 0;
  if (accion === 'confirmar') {
    nextCommissionTotal = await adjustCuentaCommission(
      solicitud.id_cuenta,
      currentTotal,
      remainingTotal,
      contexto
    );
  } else {
    const commissionRows = (await dbQuery(
      'SELECT COALESCE(SUM(comision), 0) as total FROM detalle_cuentas WHERE cuenta_id = ?',
      [solicitud.id_cuenta]
    )) as Array<{ total: number }>;
    nextCommissionTotal = Number(commissionRows[0]?.total || 0);
  }

  await dbQuery(
    'UPDATE cuentas SET total = ?, total_comision = ?, estado = ?, fecha_mod = ? WHERE id_cuenta = ?',
    [
      accion === 'confirmar' ? remainingTotal : currentTotal,
      nextCommissionTotal,
      nextCuentaState,
      now,
      solicitud.id_cuenta
    ]
  );

  if (solicitud.solicitud_id) {
    await dbQuery(
      'UPDATE solicitudes_anulacion_cuentas SET estado = ?, approved_by = ?, fecha_mod = ? WHERE id = ?',
      [accion === 'confirmar' ? 'aprobado' : 'rechazado', 'whatsapp', now, solicitud.solicitud_id]
    );
  }
}
