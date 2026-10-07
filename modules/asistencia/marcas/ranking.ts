export interface HistorialAsistencia {
  id_usuario: string;
  nick: string;
  nombre_completo: string;
  rol: string;
  primera_fecha: string;
  ultima_fecha: string;
  fechas_presentes: string[];
}

/** Calendario martes a domingo, por días completos y sin duplicar marcas. */
export function calcularRankingAsistencia(
  historial: HistorialAsistencia[],
  hasta: string,
  desde?: string
) {
  const usuarios = historial
    .map(({ fechas_presentes, ...usuario }) => {
      const inicio = desde && desde > usuario.primera_fecha ? desde : usuario.primera_fecha;
      const presentes = new Set(fechas_presentes);
      let asistencias = 0;
      let faltas = 0;
      for (
        const dia = new Date(`${inicio}T00:00:00Z`);
        dia.toISOString().slice(0, 10) <= hasta;
        dia.setUTCDate(dia.getUTCDate() + 1)
      ) {
        if (dia.getUTCDay() === 1) continue;
        if (presentes.has(dia.toISOString().slice(0, 10))) asistencias++;
        else faltas++;
      }
      return { ...usuario, desde: inicio, hasta, asistencias, faltas };
    })
    .filter(u => u.desde <= u.hasta);
  const maxAsistencias = Math.max(0, ...usuarios.map(u => u.asistencias));
  const maxFaltas = Math.max(0, ...usuarios.map(u => u.faltas));
  return {
    periodo: { startDate: desde ?? null, endDate: hasta },
    criterio:
      'Martes a domingo. Falta: día laboral sin presencia. Cada usuario se evalúa desde su primera marca histórica o la fecha inicial, la que sea posterior. Se incluyen asistencias pagadas y solo días completos; no se descuentan permisos ni vacaciones.',
    usuarios_con_registros: usuarios.length,
    mas_asistencias: usuarios.filter(u => maxAsistencias > 0 && u.asistencias === maxAsistencias),
    mas_faltas: usuarios.filter(u => maxFaltas > 0 && u.faltas === maxFaltas)
  };
}
