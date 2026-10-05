# Módulos y datos

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
(`scripts/arquitectura/analisis.mjs`), regenerado sobre el commit `532a780a`.
Esa referencia sirve para localizar trabajo heredado; los datos generados el
2026-10-04 reflejan el árbol de trabajo actual, pero no certifican aún un censo
manual completo de propietarios. El analizador reconoce como repositorios tanto
`lib/repositories/` como los archivos `*Repositorio.ts` y `repositorio.ts`
dentro de `modules/`. El inventario completo, con autores y tablas, está en
`docs/arquitectura/analisis.json` y en el
[diagnóstico](arquitectura/FASE0_DIAGNOSTICO.md).

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

| Módulo                   | Tablas                                                                                                                                                                                                                                                      | Estado                                                                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidad y acceso       | `usuarios`, `logins`, `roles`, `permissions`, `role_permissions`                                                                                                                                                                                            | **Escritura partida.** `logins` la escriben `CashRegisterRepository` y `auth/AuthQueries`; `permissions` y `role_permissions` las escriben dos rutas de `app/api` directamente                                                   |
| Catálogo e inventario    | `productos`, `categorias`, `inventario_unidades`, `inventario_presentaciones`, `inventario_movimientos`, `codigos`, `producto_champagne_tiers`                                                                                                              | **Inventario íntegro en el módulo.** Escrituras y lecturas de las tablas de inventario viven en `modules/inventario`; `inventario_unidades` tiene 4 escritores, todos en el módulo (consumo, transferencias, envases y unidades) |
| Clientes                 | `clientes`, `clientes_prepago_movimientos`                                                                                                                                                                                                                  | **Escritura muy partida.** `clientes` la escriben 4 repositorios, entre ellos `cuenta/CuentaQueries` y `sale/SaleQueries`                                                                                                        |
| Operación                | `pedidos`, `pedidos_usuarios`, `detalle_pedidos`, `detalle_pedidos_anfitrionas`, `servicios`, `detalle_servicios`, `detalle_servicios_clientes`, `habitaciones`, `cuentas`, `detalle_cuentas`, `cuentas_usuarios`, `solicitudes_servicios`, `servicio_logs` | **Escritura partida.** `ventas`, `servicios`, `habitaciones` y `cajas` las escribe además `TimerRepository`                                                                                                                      |
| Ventas                   | `ventas`, `detalle_ventas`, `ventas_usuarios`, `venta_logs`, `devoluciones_ventas`, `detalle_devoluciones_ventas`, `devoluciones_ventas_usuarios`, `solicitudes_anulacion_ventas`                                                                           | **Escritura partida.** `ventas` la escriben `TimerRepository` y `sale/SaleQueries`, y fuera de repositorios la escriben 3 archivos                                                                                               |
| Caja                     | `cajas`, `retiros_caja`, `logins` (parcial)                                                                                                                                                                                                                 | **Escritura partida.** `cajas` la escriben `CashRegisterRepository`, `service/ServiceQueries` y `lib/services/WithdrawalService.ts`                                                                                              |
| Personal y liquidaciones | `horas_extras`, `anticipos`, `anticipo_historial`, `solicitudes_anticipos`, `comisiones`, `detalle_comisiones`, `propinas`, `detalle_propinas`, `gratificaciones`, `asistencias`                                                                            | **Escritura partida.** `detalle_propinas` tiene 3 escritores; `asistencias` la escriben `PayrollRepository` y `auth/AuthQueries`                                                                                                 |
| Asistencia               | `asistencias`, `asistencia_desafios`, `kiosk_devices`, `biometric_devices`, `biometric_plantillas`, `biometric_device_records`                                                                                                                              | Las tablas biométricas las escribe `lib/biometric/` (15 archivos) sin pasar por repositorios                                                                                                                                     |
| Agenda                   | calendario y eventos                                                                                                                                                                                                                                        | Sin tabla propia en el esquema actual; se confirma en fase 0                                                                                                                                                                     |
| Comunicaciones           | `notificaciones`, `audit_logs`, `error_logs`, `query_logs`                                                                                                                                                                                                  | Limpia: sin escritores fuera de su repositorio                                                                                                                                                                                   |
| Configuración            | `configurations`, `backups`                                                                                                                                                                                                                                 | `configurations` la escribe `app/api/configurations/route.ts` directamente                                                                                                                                                       |
| Infraestructura          | `_migrations`                                                                                                                                                                                                                                               | Los runners de migraciones; se mantienen fuera del grafo de módulos                                                                                                                                                              |

## 3. Los 13 casos de escritura cruzada

Estas son las tablas que hoy aceptan escrituras desde más de un repositorio. Es
la lista que gobierna el orden de las fases 4 y 5: **cada fila es un módulo que
todavía no es dueño de su propia tabla.**

| Tabla                          | Repositorios que la escriben                                                                                                                                                      | Módulos implicados          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `clientes`                     | `ClientRepository`, `cuenta/CuentaQueries`, `sale/SaleQueries`, `service/ServiceQueries`                                                                                          | clientes, operación, ventas |
| `inventario_unidades`          | `modules/inventario/bar/consumoRepositorio`, `modules/inventario/envases/repositorio`, `modules/inventario/transferencias/repositorio`, `modules/inventario/unidades/repositorio` | inventario                  |
| `detalle_propinas`             | `PayrollRepository`, `TipRepository`, `sale/SaleQueries`                                                                                                                          | personal, ventas            |
| `cajas`                        | `CashRegisterRepository`, `service/ServiceQueries`                                                                                                                                | caja, operación             |
| `clientes_prepago_movimientos` | `sale/SaleQueries`, `service/ServiceQueries`                                                                                                                                      | clientes, ventas            |
| `comisiones`                   | `sale/SaleQueries`, `service/ServiceQueries`                                                                                                                                      | personal, ventas            |
| `detalle_comisiones`           | `PayrollRepository`, `sale/SaleQueries`                                                                                                                                           | personal, ventas            |
| `cuentas`                      | `ClientRepository`, `cuenta/CuentaQueries`                                                                                                                                        | clientes, operación         |
| `habitaciones`                 | `TimerRepository`, `cuenta/CuentaQueries`                                                                                                                                         | operación                   |
| `logins`                       | `CashRegisterRepository`, `auth/AuthQueries`                                                                                                                                      | caja, identidad             |
| `servicios`                    | `TimerRepository`, `service/ServiceQueries`                                                                                                                                       | operación                   |
| `ventas`                       | `TimerRepository`, `sale/SaleQueries`                                                                                                                                             | ventas, operación           |
| `asistencias`                  | `PayrollRepository`, `auth/AuthQueries`                                                                                                                                           | personal, asistencia        |

Nota sobre `inventario_unidades`: con las transferencias (corte 2), los envases
(corte 3), las unidades de catálogo (corte 4) y las lecturas (corte 5) migrados
en la fase 4, los cuatro escritores son repositorios de `modules/inventario` y
`lib/repositories/inventory/` ya no contiene SQL: sólo quedan
`inventoryHelpers.ts` (mapeos, constantes de estado, EAN-13) e
`inventoryTypes.ts` como helpers y tipos puros. La propiedad que el plan pedía
está alcanzada para inventario; productos y compras siguen en la capa heredada
aunque escriban inventario a través del módulo.

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

90 archivos escriben tablas sin pasar por `lib/repositories/`. Los que mandan
son:

| Archivo                              | Tablas que escribe                                                                    | Migrará en                            |
| ------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------- |
| `lib/services/SaleService.ts`        | `comisiones`, `detalle_comisiones`, `detalle_ventas`, `pedidos`, `ventas_usuarios`    | fase 5                                |
| `lib/services/ServiceService.ts`     | `comisiones`, `detalle_comisiones`, `detalle_servicios`, `detalle_servicios_clientes` | fase 5                                |
| `lib/business/pagosMixtos.ts`        | `clientes`, `clientes_prepago_movimientos`, `cuentas`                                 | fase 5 (prepago: un solo propietario) |
| `app/api/cron/check-timers/route.ts` | `cuentas`, `habitaciones`, `servicios`, `ventas`                                      | fase 3 y 5                            |
| `app/api/configurations/route.ts`    | `configurations`                                                                      | fase 6                                |
| `lib/biometric/*` (15 archivos)      | `biometric_devices`, `biometric_plantillas`, `biometric_device_records`               | fase 3                                |
| `lib/services/RoomManager.ts`        | `habitaciones`, `servicios`, `usuarios`, `ventas`                                     | fase 5                                |

**36 de estos archivos son rutas de `app/api`.** Es el indicador 3 del plan (§9,
«SQL en controladores HTTP») y hoy vale 36; el objetivo es cero.

## 5. Transacciones que no se pueden partir

`lib/services/AccountService.ts` mantiene la transacción compartida de cobrar
cuenta y crear venta. Es el requisito explícito del plan (§6) y **el flujo que
más riesgo tiene si se toca**. Otros lugares con `withTransaction` que exigen la
mismacautionson: `SaleService`, `ServiceService`, `WithdrawalService`,
`PurchaseService`, `CuentaQueries` y `SaleQueries`.

La distinción importante: hoy `withTransaction` **envuelve** la operación, pero
cada participante abre y cierra su propia unidad de trabajo. La fase 6 quiere
que el workflow abra una sola unidad y la pase como contexto opaco (§6).

## 6. Lo que este documento deja abierto

- El prepago (`clientes_prepago_movimientos`) lo escriben `pagosMixtos`,
  `sale/SaleQueries` y `service/ServiceQueries`. El plan exige un único
  propietario entre Clientes y Caja y todavía no está decidido. Debe resolverse
  antes de la Fase 5; Caja parece coherente con el saldo, pero la elección debe
  preservar la atomicidad del cobro y considerar que la tabla incluye el saldo
  prepago propio del cliente.
- `asistencias` la escribían `PayrollRepository` (para nómina) y
  `auth/AuthQueries` en la referencia histórica. Asistencia ya migró marcas al
  módulo propietario; falta verificar y documentar si quedan escrituras actuales
  desde nómina o identidad y definir el contrato de lectura requerido.
- `logins` la escriben caja e identidad. Probablemente sea identidad, pero hay
  que confirmar si el registro de apertura de caja es un evento de caja o de
  identidad. La decisión y sus escritores actuales deben registrarse antes de
  cerrar el mapa de propiedad.
