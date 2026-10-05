# Módulos y datos

## Estado actual — 2026-10-05

La propiedad vigente está definida en
[propietarios-tablas.json](arquitectura/propietarios-tablas.json) y se comprueba
con `pnpm arquitectura:limites`. Cada módulo escribe sus tablas mediante su
infraestructura privada. Reportes y consultas operativas pueden leer
proyecciones entre tablas; esas lecturas no autorizan escrituras cruzadas.

| Módulo propietario | Tablas                                                                                                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| agenda             | `eventos`                                                                                                                                                                                                                                                                                                                       |
| asistencia         | `asistencias`, `asistencia_desafios`, `biometric_devices`, `biometric_device_records`, `biometric_events`, `biometric_plantillas`, `kiosk_devices`                                                                                                                                                                              |
| auditoria          | `audit_logs`, `error_logs`                                                                                                                                                                                                                                                                                                      |
| caja               | `cajas`, `retiros_caja`, `solicitudes_cierre_caja`                                                                                                                                                                                                                                                                              |
| clientes           | `clientes`, `clientes_prepago_movimientos`, `solicitudes_devolucion_saldo`                                                                                                                                                                                                                                                      |
| comunicaciones     | `notificaciones`, `push_tokens`                                                                                                                                                                                                                                                                                                 |
| configuracion      | `configuraciones`, `backups`                                                                                                                                                                                                                                                                                                    |
| identidad          | `usuarios`, `roles`, `permissions`, `role_permissions`, `logins`, `codigos`                                                                                                                                                                                                                                                     |
| inventario         | `categorias`, `productos`, `producto_champagne_tiers`, `compras`, `detalle_compras`, `inventario_presentaciones`, `inventario_unidades`, `inventario_movimientos`, `inventario_movimiento_unidades`                                                                                                                             |
| operacion          | `cuentas`, `cuentas_usuarios`, `detalle_cuentas`, `habitaciones`, `pedidos`, `pedidos_usuarios`, `detalle_pedidos`, `detalle_pedidos_anfitrionas`, `servicios`, `detalle_servicios`, `detalle_servicios_clientes`, `solicitudes_servicios`, `solicitudes_anulacion_servicios`, `solicitudes_anulacion_cuentas`, `servicio_logs` |
| personal           | `anticipos`, `anticipo_historial`, `comisiones`, `detalle_comisiones`, `propinas`, `detalle_propinas`, `horas_extras`, `gratificaciones`                                                                                                                                                                                        |
| ventas             | `ventas`, `detalle_ventas`, `ventas_usuarios`, `solicitudes_anulacion_ventas`, `devoluciones_ventas`, `detalle_devoluciones_ventas`, `venta_logs`                                                                                                                                                                               |

Reportes y Salud no poseen tablas de negocio. `query_logs`, `sync_operations` y
el registro de migraciones pertenecen a infraestructura técnica. Mantenimiento y
backups globales tienen escritores técnicos explícitos en el control.

Cobro y venta, anulaciones, prepago, eliminación de usuarios, sesión presencial,
liquidación de asistencias y limpieza de temporizadores comparten
`ContextoOperacion` cuando participan varios propietarios. Los participantes
reciben operaciones públicas concretas, sin acceso al ejecutor de otro módulo.
Los avisos de limpieza automática se envían después del commit.

La excepción C1 de configuración quedó retirada: cada propietario publica las
claves de negocio en contratos puros y Configuración compone el registro. El
detalle y la validación se registran en
[CONSOLIDACION_FINAL.md](arquitectura/CONSOLIDACION_FINAL.md).

## Referencia histórica de la migración

Las secciones siguientes conservan el inventario y las decisiones de cortes
anteriores. Sus estados parciales y rutas retiradas no describen el estado
actual.

Fecha: 2026-10-04. Inventario de referencia de Fase 0; no es un censo
actualizado después de las migraciones de Personal y Asistencia. Los escritores
de las tablas migradas deben verificarse contra el código actual antes de usar
este documento como criterio de cierre.

El diagnóstico se regeneró sobre el árbol de trabajo el 2026-10-04 con
`pnpm arquitectura`. La foto actual registra 204 rutas HTTP, 35 rutas con SQL
directo, 92 archivos con SQL fuera de repositorios, 13 tablas con más de un
escritor y 5 ciclos entre dominios. El detalle generado está en
[`FASE0_DIAGNOSTICO.md`](arquitectura/FASE0_DIAGNOSTICO.md) y
[`analisis.json`](arquitectura/analisis.json); la propiedad de las tablas aún
requiere validar los escritores y decisiones abiertas de este documento.

Este documento responde al punto 6 del
[plan de monolito modular](PLAN_MONOLITO_MODULAR.md): qué tabla pertenece a qué
módulo, quién la escribe hoy y qué estrategia se usará para corregirlo.

Los datos provienen de `pnpm arquitectura`
(`scripts/arquitectura/analisis.mjs`), regenerado tras el corte 12d. Esa
referencia sirve para localizar trabajo heredado; los datos generados el
2026-10-05 reflejan el árbol de trabajo actual, pero no certifican aún un censo
manual completo de propietarios. El analizador reconoce como repositorios tanto
`lib/repositories/` como los archivos `*Repositorio.ts` y `repositorio.ts`
dentro de `modules/`. El inventario completo, con autores y tablas, está en
`docs/arquitectura/analisis.json` y en el
[diagnóstico](arquitectura/FASE0_DIAGNOSTICO.md).

**Desde el corte 12d el censo reporta 0 rutas con SQL directo.** Ninguna ruta de
`app/api` escribe en la base ni importa `lib/database/db`: el SQL vive en
`modules/<mod>/…/repositorio.ts`. Lo que queda por vaciar es `lib/`, donde
siguen los escritores de ventas, servicios, caja, nómina, agenda, comunicaciones
y auditoría.

## 1. Estrategia

Se conserva el esquema físico. No se parte la base, no se renombran tablas ni se
tocan migraciones aplicadas (§9). El orden es:

1. **Encapsular las escrituras primero.** Cada tabla queda con un módulo que
   expone operaciones de negocio en vez de SQL abierto.
2. **Dejar las lecturas cruzadas declaradas**, sólo en Reportes, mientras no
   exista una consulta pública que las sustituya sin provocar N+1.
3. **No introducir cambios de esquema** para simular separación. Las tablas de
   unión, auditoría y `sync_operations` se registran aquí aunque no pertenezcan
   a un dominio claro.

## 2. Tablas por módulo propietario

Módulo es el dominio de la tabla §4 del plan. «Estado» describe quién la escribe
hoy.

| Módulo                   | Tablas                                                                                                                                                                                                                                                      | Estado                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidad y acceso       | `usuarios`, `logins`, `roles`, `permissions`, `role_permissions`                                                                                                                                                                                            | **Escritura partida.** `logins` la escriben `CashRegisterRepository` y `auth/AuthQueries`. Desde el corte 12b `usuarios`, `permissions` y `role_permissions` tienen su escritor en `modules/identidad`, aunque la capa heredada siga duplicando parte de la escritura                                                     |
| Catálogo e inventario    | `productos`, `categorias`, `inventario_unidades`, `inventario_presentaciones`, `inventario_movimientos`, `codigos`, `producto_champagne_tiers`                                                                                                              | **Inventario íntegro en el módulo.** Escrituras y lecturas de las tablas de inventario viven en `modules/inventario`; `inventario_unidades` tiene 4 escritores, todos en el módulo (consumo, transferencias, envases y unidades)                                                                                          |
| Clientes                 | `clientes`, `clientes_prepago_movimientos`                                                                                                                                                                                                                  | **En fase 7 parcial (corte 27).** Fichas, recarga y devolución en `modules/clientes`; `ClientService` ya no importa `ClientRepository`. Consumo/restitución conservan escritores heredados                                                                                                                                |
| Operación                | `pedidos`, `pedidos_usuarios`, `detalle_pedidos`, `detalle_pedidos_anfitrionas`, `servicios`, `detalle_servicios`, `detalle_servicios_clientes`, `habitaciones`, `cuentas`, `detalle_cuentas`, `cuentas_usuarios`, `solicitudes_servicios`, `servicio_logs` | **En migración (cortes 14–22, fase 7 parcial en 25).** Servicios completos con lecturas y borrado en el módulo; `ServiceQueries.ts` eliminado y `ServiceService` sin `ServiceRepository`. Temporizador/solicitud/edición/alta de cuentas en el módulo; cobro, borrado y pausas con `RoomManager` directo siguen heredados |
| Ventas                   | `ventas`, `detalle_ventas`, `ventas_usuarios`, `venta_logs`, `devoluciones_ventas`, `detalle_devoluciones_ventas`, `devoluciones_ventas_usuarios`, `solicitudes_anulacion_ventas`                                                                           | **En fase 7 parcial (corte 24).** Escrituras, lecturas y borrado en `modules/ventas`; `SaleService` ya no importa `SaleRepository` y cayeron los inserts muertos. El adaptador conserva delegación para suites heredadas                                                                                                  |
| Caja                     | `cajas`, `retiros_caja`, `logins` (parcial)                                                                                                                                                                                                                 | **Casi íntegro (corte 23).** Movimientos y cierres por API pública; los adaptadores `getCurrentCajaId`/`updateBalances` se eliminaron sin llamadores. Quedan lecturas y escrituras propias en `CashRegisterRepository` (apertura, cierres, resúmenes) pendientes de fase 6                                                |
| Personal y liquidaciones | `horas_extras`, `anticipos`, `anticipo_historial`, `solicitudes_anticipos`, `comisiones`, `detalle_comisiones`, `propinas`, `detalle_propinas`, `gratificaciones`, `asistencias`                                                                            | **En fase 7 parcial (corte 28).** Escrituras y lecturas de propinas y comisiones de venta en el módulo; `TipService` sin `TipRepository`. Nómina (`PayrollRepository`), agregados y gratificaciones siguen en `lib/`                                                                                                      |
| Asistencia               | `asistencias`, `asistencia_desafios`, `kiosk_devices`, `biometric_devices`, `biometric_plantillas`, `biometric_device_records`                                                                                                                              | Las tablas biométricas las escribe `lib/biometric/` (15 archivos) sin pasar por repositorios                                                                                                                                                                                                                              |
| Agenda                   | calendario y eventos                                                                                                                                                                                                                                        | Sin tabla propia en el esquema actual; se confirma en fase 0                                                                                                                                                                                                                                                              |
| Comunicaciones           | `notificaciones`, `audit_logs`, `error_logs`, `query_logs`                                                                                                                                                                                                  | Limpia: sin escritores fuera de su repositorio                                                                                                                                                                                                                                                                            |
| Configuración            | `configurations`, `backups`                                                                                                                                                                                                                                 | **Íntegro en el módulo desde el corte 12b:** escrituras y lecturas viven en `modules/configuracion`; `backups` la escribe además `lib/database/maintenance.ts`                                                                                                                                                            |
| Infraestructura          | `_migrations`                                                                                                                                                                                                                                               | Los runners de migraciones; se mantienen fuera del grafo de módulos                                                                                                                                                                                                                                                       |
| Salud                    | ninguna                                                                                                                                                                                                                                                     | **Módulo de infraestructura pura, nacido en el corte 12d.** No es dueño de ninguna tabla de negocio: sondea al driver para responder si el proceso vive. Existe para que `app/api/health` deje de importar `lib/database/db`, la última ruta que lo hacía                                                                 |

## 3. Censo histórico de escritores (no equivale a dominios propietarios)

Estas son las tablas que hoy aceptan escrituras desde más de un repositorio. Es
la lista que gobierna el orden de las fases 4 y 5: varios repositorios dentro
del mismo módulo son compatibles con un único propietario; las infracciones son
escritores de dominios distintos.

| Tabla                            | Repositorios que la escriben                                                                                                                                                                                                    | Módulos implicados          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `clientes`                       | `ClientRepository`, `cuenta/CuentaQueries`, `sale/SaleQueries`, `service/ServiceQueries`                                                                                                                                        | clientes, operación, ventas |
| `inventario_unidades`            | `modules/inventario/anulaciones/repositorio`, `modules/inventario/bar/consumoRepositorio`, `modules/inventario/envases/repositorio`, `modules/inventario/transferencias/repositorio`, `modules/inventario/unidades/repositorio` | inventario                  |
| `inventario_movimientos`         | `modules/inventario/anulaciones/repositorio`, `modules/inventario/bar/consumoRepositorio`, `modules/inventario/transferencias/repositorio`                                                                                      | inventario                  |
| `inventario_movimiento_unidades` | `modules/inventario/bar/consumoRepositorio`                                                                                                                                                                                     | inventario                  |
| `detalle_propinas`               | `PayrollRepository`, `TipRepository`, `sale/SaleQueries`                                                                                                                                                                        | personal, ventas            |
| `cajas`                          | `CashRegisterRepository`, `service/ServiceQueries`                                                                                                                                                                              | caja, operación             |
| `clientes_prepago_movimientos`   | `sale/SaleQueries`, `service/ServiceQueries`                                                                                                                                                                                    | clientes, ventas            |
| `comisiones`                     | `sale/SaleQueries`, `service/ServiceQueries`                                                                                                                                                                                    | personal, ventas            |
| `detalle_comisiones`             | `PayrollRepository`, `sale/SaleQueries`                                                                                                                                                                                         | personal, ventas            |
| `cuentas`                        | `ClientRepository`, `cuenta/CuentaQueries`                                                                                                                                                                                      | clientes, operación         |
| `habitaciones`                   | `TimerRepository`, `cuenta/CuentaQueries`                                                                                                                                                                                       | operación                   |
| `logins`                         | `CashRegisterRepository`, `auth/AuthQueries`                                                                                                                                                                                    | caja, identidad             |
| `servicios`                      | `TimerRepository`, `service/ServiceQueries`                                                                                                                                                                                     | operación                   |
| `ventas`                         | `TimerRepository`, `sale/SaleQueries`                                                                                                                                                                                           | ventas, operación           |
| `asistencias`                    | `PayrollRepository`, `auth/AuthQueries`                                                                                                                                                                                         | personal, asistencia        |

Nota sobre `inventario_unidades`: con las transferencias (corte 2), los envases
(corte 3), las unidades de catálogo (corte 4), las lecturas (corte 5), la
reversión por anulación (corte 8) y productos y compras (corte 9) migrados en la
fase 4, los cinco escritores son repositorios de `modules/inventario`. Con el
corte 10 **la capa heredada de inventario desapareció**: `inventoryTypes.ts` y
`inventoryHelpers.ts` se mudaron a `modules/inventario/tipos.ts` y
`modules/inventario/helpers.ts`, y `lib/repositories/inventory/` ya no existe.
Las constantes de estado de unidad son vocabulario del módulo
(`modules/inventario/estados.ts`), igual que `ResumenEnvases` y el resto de los
DTO en `contracts.ts`. Cuatro guardas en
`tests/unit/scripts/modulo-inventario-guardas.test.ts` impiden que la
dependencia vuelva: el módulo no lee la capa heredada, nadie fuera vuelve a usar
`InventoryRepository`, la UI no importa la API de servidor y el directorio
eliminado no reaparece.

Nota sobre `detalle_propinas`, `detalle_comisiones` y sus cabeceras: la
propiedad quedó decidida (D5 resuelta — §8 de
[FASE0_DECISIONES](arquitectura/FASE0_DECISIONES.md)): dueño único **Personal**,
y ventas y operación escribirán vía la API pública de Personal dentro de la
misma transacción en la fase 5. El estado «escritura partida» de estas filas
describe el código de hoy, no el objetivo.

La tabla anterior conserva los escritores observados en la referencia de Fase 0;
las migraciones de `horas_extras`, anticipos y Asistencia pueden haber reducido
algunos de esos accesos. No se debe interpretar ese censo histórico como
evidencia de que las escrituras cruzadas siguen activas sin revisar el HEAD.

## 4. Escrituras fuera de repositorios

El indicador histórico de 64 archivos mezcla uso del driver, lecturas y
escrituras fuera de repositorios; no significa 64 escritores de negocio. Los que
mandan son:

| Archivo                                      | Tablas que escribe                                                                                                                                                                           | Migrará en                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `lib/services/SaleService.ts`                | ~~`comisiones`, `detalle_comisiones`, `detalle_ventas`, `pedidos`, `ventas_usuarios`~~ → delega a `modules/ventas` desde el corte 14 (registro y anulación)                                  | fase 5 ✔ parcial                                |
| `lib/services/ServiceService.ts`             | ~~`comisiones`, `detalle_comisiones`, `detalle_servicios`, `detalle_servicios_clientes`~~ → delega a `modules/operacion` desde el corte 16 (alta, edición y anulación)                       | fase 5 ✔ parcial                                |
| `lib/business/pagosMixtos.ts`                | ~~`clientes`, `clientes_prepago_movimientos`, `cuentas`~~ → recarga/devolución delegan a `modules/clientes` desde el corte 18 (el consumo de ventas directas conserva el adaptador heredado) | fase 5 (prepago: un solo propietario) ✔ parcial |
| `lib/biometric/*` (15 archivos)              | `biometric_devices`, `biometric_plantillas`, `biometric_device_records`                                                                                                                      | fase 3                                          |
| `lib/services/RoomManager.ts`                | `habitaciones`, `servicios`, `usuarios`, `ventas`                                                                                                                                            | fase 5                                          |
| `lib/integrations/whatsappPendingActions.ts` | `cuentas`, `detalle_cuentas`, `solicitudes_anulacion_cuentas`, `ventas`                                                                                                                      | fase 6                                          |

**Ninguno de estos archivos es una ruta de `app/api`.** Es el indicador 3 del
plan (§9, «SQL en controladores HTTP»): valía 36 en la referencia de Fase 0 y
desde el corte 12d vale **cero**. Las dos filas que lo alimentaban
(`app/api/cron/check-timers/route.ts` y `app/api/configurations/route.ts`) ya no
escriben: el cron compone `modules/operacion/temporizadores` y la ruta de
configuración llama a `modules/configuracion`.

## 5. Transacciones que no se pueden partir

`lib/services/AccountService.ts` mantiene la transacción compartida de cobrar
cuenta y crear venta. Es el requisito explícito del plan (§6) y **el flujo que
más riesgo tiene si se toca**. Otros lugares con `withTransaction` que exigen la
mismas precauciones: `SaleService`, `ServiceService`, `WithdrawalService`,
`PurchaseService`, `CuentaQueries` y `SaleQueries`.

El cobro con venta ya compartía `trx` antes del corte 13. No todos sus
participantes respetaban esa unidad: el registro de propinas abría otra. En el
corte 13 el workflow usa un contexto opaco para cobro, venta, caja, prepago,
conceptos de Personal y lectura de la respuesta; las propinas ahora confirman o
revierten con la venta. No generalizar esta garantía a los flujos heredados de
anulación, servicio y cierre de caja.

## 6. Decisiones vigentes del corte 13 (2026-10-05)

- **Prepago: Clientes.** `clientes.saldo` y `clientes_prepago_movimientos`
  pertenecen al mismo propietario. Caja registra el impacto del medio de pago;
  no administra el saldo del cliente. El cobro usa `consumirPrepagoCuenta`
  dentro de la unidad compartida. La restitución de anulaciones y el consumo de
  ventas directas conservan adaptadores/escritores heredados pendientes.
- **Asistencias: Asistencia.** Confirmado: `PayrollRepository` modifica
  `estado/fecha_pago` y `auth/AuthQueries` inserta marcas. Deben delegar en
  operaciones públicas de Asistencia; Personal conserva las reglas de
  liquidación, no la propiedad de la marca. Es una decisión, no una migración
  completada.
- **Logins: Identidad.** Confirmado: `CashRegisterRepository` cierra sesiones al
  cerrar caja. Esa acción debe pasar por Identidad en la misma transacción; Caja
  sigue siendo propietaria del cierre financiero.
- **Configuración: excepción transitoria C1.** Se conserva el registro central
  existente para mantener validaciones y formularios. Responsable: fase 6.
  Retiro: Asistencia, Inventario, Ventas y Comunicaciones publican la validación
  de sus claves y el registro técnico deja de decidir reglas de negocio. Mover
  el registro a `modules/configuracion` no cierra esa tarea.

El detalle del flujo implementado, las lecturas cruzadas preservadas y la
validación del corte están en [FASE5_COBRO.md](arquitectura/FASE5_COBRO.md).
