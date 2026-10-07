# Seed de asistencia

Ejecutar `pnpm seed:asistencia --dry-run` para revisar la distribución y
`pnpm seed:asistencia` para cargarla en el PostgreSQL local configurado en
`.env`. Se bloquea su ejecución en producción y en servidores remotos.

Incluye todos los usuarios existentes excepto los de rol administrador o nick
administrador. El período va del 1 de enero del año actual hasta hoy, con fecha
de Bolivia. Distribuye aproximadamente 80% de asistencias y 20% de faltas sobre
días calendario, sin asumir horarios laborales que no están configurados. Las
faltas son días sin marca; no se crean registros con estado 0, ya que ese estado
identifica asistencias pagadas. Las marcas creadas quedan pendientes de pago y
participan en los cálculos habituales del módulo.

La distribución es determinista por usuario y fecha. Respeta todas las marcas
existentes, incluidas las pagadas, y repetirlo no duplica registros. Los
registros nuevos llevan origen `seed` e identificadores `seed-asistencia-*`.
Toda la carga se realiza en una transacción, sin modificar usuarios, roles ni
registros previos.
