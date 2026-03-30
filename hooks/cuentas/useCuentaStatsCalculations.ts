export function useCuentaStatsCalculations(cuentas: any[]) {
  // Cálculos de estadísticas - todas las agregaciones reutilizables
  
  const totalCuentas = cuentas.length;

  const cuentasActivas = cuentas.filter(
    c => c.estado === 1 || c.status === 1
  ).length;

  const cuentasCerradas = cuentas.filter(
    c => c.estado === 0 || c.status === 0
  ).length;

  const cuentasPagadas = cuentas.filter(
    c => c.estado === 2 || c.status === 2
  ).length;

  const totalIngresos = cuentas.reduce(
    (sum, cuenta) => sum + (Number(cuenta.total) || 0),
    0
  );

  const totalComisiones = cuentas.reduce(
    (sum, cuenta) => sum + (Number(cuenta.total_comision) || 0),
    0
  );

  const promedioVentaPorCuenta = totalCuentas > 0 ? totalIngresos / totalCuentas : 0;

  const totalPropinas = cuentas.reduce(
    (sum, cuenta) => sum + (Number(cuenta.propina) || 0),
    0
  );

  // Cálculos por estado
  const stats = {
    totalCuentas,
    cuentasActivas,
    cuentasCerradas,
    cuentasPagadas,
    totalIngresos,
    totalComisiones,
    promedioVentaPorCuenta,
    totalPropinas,
    ingresoNeto: totalIngresos - totalComisiones
  };

  return stats;
}
