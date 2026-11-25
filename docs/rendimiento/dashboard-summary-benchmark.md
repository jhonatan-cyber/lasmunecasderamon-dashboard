# Umbrales del benchmark del resumen de personal

`pnpm benchmark:dashboard` ejecuta la medición directa de
`StatsQueries.getUserDashboardSummary` contra PostgreSQL local. El benchmark
hace 3 calentamientos y mide 30 ejecuciones; informa mediana y p95.

Por defecto solo informa resultados y no falla por latencia. Para aplicar
límites, configura uno o ambos máximos en milisegundos:

```powershell
$env:DASHBOARD_SUMMARY_MAX_MEDIAN_MS = '350'
$env:DASHBOARD_SUMMARY_MAX_P95_MS = '375'
pnpm benchmark:dashboard
```

Los valores del ejemplo son ilustrativos, no son valores predeterminados ni una
línea base recomendada. Ejecuta el benchmark varias veces en el entorno
objetivo, con datos y carga representativos; establece límites con margen sobre
la variación normal antes de usarlos en CI. Al configurar un límite, el test
falla si su métrica lo supera. Los valores vacíos se ignoran y los valores que
no sean números positivos finitos producen un error de configuración.

La medición directa requiere PostgreSQL local. El comando completo también
ejecuta el benchmark general del dashboard, que requiere Redis local.
