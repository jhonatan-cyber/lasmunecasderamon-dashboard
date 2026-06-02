export type CuentaAnulacionRow = {
  id: string;
  monto: number;
  motivo: string | null;
  estado: string;
  fecha_crea: string;
  fecha_mod: string | null;
  requested_by_nombre: string | null;
  approved_by_nombre: string | null;
};

export const buildFinancialSummary = (cuenta: any, solicitudes: CuentaAnulacionRow[]) => {
  const totalActual = Number(cuenta?.total || 0);
  const totalAnuladoAprobado = solicitudes
    .filter(item => item.estado === 'aprobado')
    .reduce((sum, item) => sum + Number(item.monto || 0), 0);
  const totalAnulacionPendiente = solicitudes
    .filter(item => item.estado === 'pendiente')
    .reduce((sum, item) => sum + Number(item.monto || 0), 0);
  const totalAnulacionRechazada = solicitudes
    .filter(item => item.estado === 'rechazado')
    .reduce((sum, item) => sum + Number(item.monto || 0), 0);

  const totalOriginal = totalActual + totalAnuladoAprobado;

  return {
    total_original: totalOriginal,
    total_actual: totalActual,
    total_anulado_aprobado: totalAnuladoAprobado,
    total_anulacion_pendiente: totalAnulacionPendiente,
    total_anulacion_rechazada: totalAnulacionRechazada,
    tuvo_anulacion_parcial: totalAnuladoAprobado > 0 && totalActual > 0,
    fue_anulada_total: totalAnuladoAprobado > 0 && totalActual <= 0
  };
};
