# Corrección de los 28 hallazgos por módulo

Fecha: 16 de octubre de 2026. Esta lista corresponde a los 28 hallazgos de la
revisión de módulos; conserva las seis correcciones previas del dashboard.

| Nº  | Módulo                      | Corrección                                                                                                                                                                                                                                   |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Identidad                   | La edición del perfil propio tiene una lista de campos permitidos; no acepta rol, RUN, sueldo, descuentos ni estado. Actualizar una ficha tampoco introduce un estado de servicio por defecto.                                               |
| 2   | Identidad                   | Solo cambiar efectivamente el RUN reinicia la contraseña. El repositorio persiste el indicador de cambio obligatorio.                                                                                                                        |
| 3   | Identidad                   | Access y refresh validan usuario activo, rol vigente y versión de sesión en PostgreSQL. Cierre de sesión, cierre de caja para personal y cambios de credenciales revocan tokens. Logout también reconoce el refresh cuando expiró el acceso. |
| 4   | Operación / ventas          | La web cobra y crea la venta en una sola transacción mediante `cobrar-con-venta`, con clave de idempotencia y bloqueo contra doble clic.                                                                                                     |
| 5   | Ventas                      | PATCH rechaza la anulación directa y los estados inválidos. Se utiliza la solicitud de anulación con su aprobación.                                                                                                                          |
| 6   | Ventas / clientes           | La base para devolver prepago descuenta restituciones previas. Los pagos mixtos distribuyen solo el saldo que corresponde a medios externos.                                                                                                 |
| 7   | Ventas                      | La anulación bloquea la venta con `FOR UPDATE`; una segunda operación observa el estado ya anulado y no repite dinero ni inventario.                                                                                                         |
| 8   | Operación / servicios       | Un servicio cobrado conserva sus importes. Para corregir dinero se debe anular y registrar de nuevo. La edición de tiempo continúa disponible y no altera el IVA de otra caja.                                                               |
| 9   | Caja                        | El retiro exige y bloquea una caja abierta, incluso cuando llega un identificador explícito.                                                                                                                                                 |
| 10  | Caja / anticipos            | La comprobación del fondo disponible bloquea la caja dentro de la transacción para serializar egresos concurrentes.                                                                                                                          |
| 11  | Reportes / caja             | Los resúmenes dejan de restar nuevamente anticipos, retiros y devoluciones ya aplicados a los medios de pago. El cálculo compartido de caja, retiro y cierre usa el saldo neto.                                                              |
| 12  | Personal                    | El máximo de anticipo suma únicamente detalles de comisión y propina que siguen pendientes.                                                                                                                                                  |
| 13  | Personal                    | Los anticipos anulados no se deducen de nómina ni del saldo disponible.                                                                                                                                                                      |
| 14  | Auditoría / nómina          | El entregador de una liquidación es el usuario autenticado que ejecuta el pago.                                                                                                                                                              |
| 15  | Personal                    | Las horas extras exigen una tarifa numérica, finita y positiva antes de persistir.                                                                                                                                                           |
| 16  | Asistencia                  | Restricción única por usuario y fecha e inserción atómica con `ON CONFLICT` para QR, manual, masiva, biométrico y login.                                                                                                                     |
| 17  | Operación                   | El cron interpreta la hora empresarial con `parseBusinessDate`, respetando Santiago en servidores UTC.                                                                                                                                       |
| 18  | Operación                   | El aviso se activa durante los últimos cinco minutos, sin depender de una ventana de treinta segundos. Extender una cuenta reinicia sus indicadores de aviso.                                                                                |
| 19  | Inventario                  | La edición bloquea y comprueba que todos los códigos pertenecen al producto recibido; rechaza el conjunto completo si hay uno ajeno o inexistente.                                                                                           |
| 20  | Inventario                  | Una devolución parcial aplica la fracción al consumo que sigue pendiente, tanto en unidades como en mililitros.                                                                                                                              |
| 21  | Agenda                      | Los eventos de propina muestran el estado del detalle individual.                                                                                                                                                                            |
| 22  | Clientes                    | El historial incluye operaciones activas/pausadas y omite el movimiento de consumo que ya aparece mediante su venta o servicio asociado.                                                                                                     |
| 23  | Clientes / cuentas          | El cobro prepago escribe un movimiento asociado a la venta generada dentro de la misma transacción. La anulación puede restituirlo.                                                                                                          |
| 24  | Configuración               | Las referencias de stock y movimientos de limpieza son diferibles para permitir restaurar el respaldo dentro de una transacción.                                                                                                             |
| 25  | Reportes                    | El histórico conserva comisiones pagadas y mantiene los identificadores UUID como texto.                                                                                                                                                     |
| 26  | Reportes                    | Barra, champaña, tragos y shots excluyen ventas anuladas.                                                                                                                                                                                    |
| 27  | Comunicaciones              | Historial, pendientes y contador usan la misma regla de usuario o rol destinatario.                                                                                                                                                          |
| 28  | Asistencia / comunicaciones | `code_changed` se entrega únicamente al canal de kiosko, con una proyección que contiene solo el código.                                                                                                                                     |

## Verificación reproducible

- `pnpm exec vitest run --maxWorkers=2 --reporter=dot`: suite unitaria general.
- `pnpm exec vitest run --config vitest.module-review.config.ts`: regresiones de
  PostgreSQL en un esquema privado `test_review_*`, con transacciones y
  concurrencia reales. No trunca tablas del esquema público. Incluye cobro en
  efectivo y prepago, rollback completo, anulaciones concurrentes, saldos,
  stock, asistencia, sesiones, restauración, historial y reportes.
- `pnpm typecheck`: contratos TypeScript.
- `pnpm lint:full`: análisis estático completo.
- `pnpm arquitectura:limites`: fronteras entre módulos.
- `pnpm build`: compilación de producción.
- `pnpm db:plan`: estado de migraciones.

La compilación local se ejecuta con `CIRCLE_NODE_TOTAL=2` y
`NODE_OPTIONS=--max-old-space-size=4096`. Se desactiva la caché de Webpack
durante producción para reducir la memoria retenida; desarrollo conserva su
caché. La verificación de las 75 migraciones también pasó sobre una base
temporal nueva mediante `pnpm db:verify`.

## Resultados

- Producción: compilación correcta, TypeScript correcto y 234 páginas/rutas
  generadas.
- Suite general: 331 archivos y 2.596 casos ejecutados; 2.582 casos pasaron, dos
  se omitieron y doce conservaron expectativas anteriores del doble descuento de
  devoluciones. Se actualizaron esas aserciones y se repitieron los cuatro
  archivos de caja: **37/37 pruebas aprobadas**. Resultado consolidado: **2.594
  casos unitarios comprobados, dos omitidos y ningún fallo pendiente**;
  corresponde a la suite general más su repetición específica, no a una única
  corrida sin fallos.
- PostgreSQL: **24/24 pruebas aprobadas** sobre el código final, incluyendo
  concurrencia, rollback y devoluciones parciales sucesivas con pago mixto.
- Verificación estricta `pnpm typecheck`: sin errores.
- ESLint de los **77 archivos de código modificados**: cero errores y cero
  advertencias. El análisis completo anterior conservó 27 advertencias de
  consola en archivos ajenos a estas correcciones.
- Límites entre módulos: cero infracciones y cero excepciones.
- Migraciones: 75 verificadas en una base temporal nueva; plan local sin
  pendientes. Se conserva la advertencia previa por dos entradas históricas del
  libro de migraciones sin archivo.
- Los esquemas privados de pruebas se eliminaron al finalizar. Se restauró el
  archivo de análisis arquitectónico que regenera la suite.

La migración `075_revision_modulos_seguridad.sql` ya se aplicó a la base local.
En otros entornos debe aplicarse antes de servir esta versión. Los tokens
anteriores a la versión de sesión requieren iniciar sesión nuevamente.

Las pruebas de notificaciones sustituyen el transporte: no acreditan recepción
real de WhatsApp/push ni funcionamiento físico del lector biométrico. No se
repararon retroactivamente saldos históricos ni se ejecutaron pagos o
anulaciones de negocio sobre datos existentes.
