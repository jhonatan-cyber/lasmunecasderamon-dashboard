# Módulos y datos

Fecha: 2026-10-03 Estado: Fase 0. Los límites son una propuesta pendiente de
validar con el piloto de Horas extras.

Este documento responde al punto 6 del
[plan de monolito modular](PLAN_MONOLITO_MODULAR.md): qué tabla pertenece a qué
módulo, quién la escribe hoy y qué estrategia se usará para corregirlo.

Los datos provienen de `pnpm arquitectura`
(`scripts/arquitectura/analisis.mjs`), regenerado sobre el commit `532a780a`. El
inventario completo, con autores y tablas, está en
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

| Módulo                   | Tablas                                                                                                                                                                                                                                                      | Estado                                                                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identidad y acceso       | `usuarios`, `logins`, `roles`, `permissions`, `role_permissions`                                                                                                                                                                                            | **Escritura partida.** `logins` la escriben `CashRegisterRepository` y `auth/AuthQueries`; `permissions` y `role_permissions` las escriben dos rutas de `app/api` directamente |
| Catálogo e inventario    | `productos`, `categorias`, `inventario_unidades`, `inventario_presentaciones`, `inventario_movimientos`, `codigos`, `producto_champagne_tiers`                                                                                                              | **Escritura partida.** `inventario_unidades` tiene 4 repositorios escritores (Bar, Envase, Transferencias, Unidad)                                                             |
| Clientes                 | `clientes`, `clientes_prepago_movimientos`                                                                                                                                                                                                                  | **Escritura muy partida.** `clientes` la escriben 4 repositorios, entre ellos `cuenta/CuentaQueries` y `sale/SaleQueries`                                                      |
| Operación                | `pedidos`, `pedidos_usuarios`, `detalle_pedidos`, `detalle_pedidos_anfitrionas`, `servicios`, `detalle_servicios`, `detalle_servicios_clientes`, `habitaciones`, `cuentas`, `detalle_cuentas`, `cuentas_usuarios`, `solicitudes_servicios`, `servicio_logs` | **Escritura partida.** `ventas`, `servicios`, `habitaciones` y `cajas` las escribe además `TimerRepository`                                                                    |
| Ventas                   | `ventas`, `detalle_ventas`, `ventas_usuarios`, `venta_logs`, `devoluciones_ventas`, `detalle_devoluciones_ventas`, `devoluciones_ventas_usuarios`, `solicitudes_anulacion_ventas`                                                                           | **Escritura partida.** `ventas` la escriben `TimerRepository` y `sale/SaleQueries`, y fuera de repositorios la escriben 3 archivos                                             |
| Caja                     | `cajas`, `retiros_caja`, `logins` (parcial)                                                                                                                                                                                                                 | **Escritura partida.** `cajas` la escriben `CashRegisterRepository`, `service/ServiceQueries` y `lib/services/WithdrawalService.ts`                                            |
| Personal y liquidaciones | `horas_extras`, `anticipos`, `anticipo_historial`, `solicitudes_anticipos`, `comisiones`, `detalle_comisiones`, `propinas`, `detalle_propinas`, `gratificaciones`, `asistencias`                                                                            | **Escritura partida.** `detalle_propinas` tiene 3 escritores; `asistencias` la escriben `PayrollRepository` y `auth/AuthQueries`                                               |
| Asistencia               | `asistencias`, `asistencia_desafios`, `kiosk_devices`, `biometric_devices`, `biometric_plantillas`, `biometric_device_records`                                                                                                                              | Las tablas biométricas las escribe `lib/biometric/` (15 archivos) sin pasar por repositorios                                                                                   |
| Agenda                   | calendario y eventos                                                                                                                                                                                                                                        | Sin tabla propia en el esquema actual; se confirma en fase 0                                                                                                                   |
| Comunicaciones           | `notificaciones`, `audit_logs`, `error_logs`, `query_logs`                                                                                                                                                                                                  | Limpia: sin escritores fuera de su repositorio                                                                                                                                 |
| Configuración            | `configurations`, `backups`                                                                                                                                                                                                                                 | `configurations` la escribe `app/api/configurations/route.ts` directamente                                                                                                     |
| Infraestructura          | `_migrations`                                                                                                                                                                                                                                               | Los runners de migraciones; se mantienen fuera del grafo de módulos                                                                                                            |

## 3. Los 13 casos de escritura cruzada

Estas son las tablas que hoy aceptan escrituras desde más de un repositorio. Es
la lista que gobierna el orden de las fases 4 y 5: **cada fila es un módulo que
todavía no es dueño de su propia tabla.**

| Tabla                          | Repositorios que la escriben                                                                              | Módulos implicados          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------- |
| `clientes`                     | `ClientRepository`, `cuenta/CuentaQueries`, `sale/SaleQueries`, `service/ServiceQueries`                  | clientes, operación, ventas |
| `inventario_unidades`          | `inventory/BarQueries`, `inventory/EnvaseQueries`, `inventory/TransferQueries`, `inventory/UnidadQueries` | inventario                  |
| `detalle_propinas`             | `PayrollRepository`, `TipRepository`, `sale/SaleQueries`                                                  | personal, ventas            |
| `cajas`                        | `CashRegisterRepository`, `service/ServiceQueries`                                                        | caja, operación             |
| `clientes_prepago_movimientos` | `sale/SaleQueries`, `service/ServiceQueries`                                                              | clientes, ventas            |
| `comisiones`                   | `sale/SaleQueries`, `service/ServiceQueries`                                                              | personal, ventas            |
| `detalle_comisiones`           | `PayrollRepository`, `sale/SaleQueries`                                                                   | personal, ventas            |
| `cuentas`                      | `ClientRepository`, `cuenta/CuentaQueries`                                                                | clientes, operación         |
| `habitaciones`                 | `TimerRepository`, `cuenta/CuentaQueries`                                                                 | operación                   |
| `logins`                       | `CashRegisterRepository`, `auth/AuthQueries`                                                              | caja, identidad             |
| `servicios`                    | `TimerRepository`, `service/ServiceQueries`                                                               | operación                   |
| `ventas`                       | `TimerRepository`, `sale/SaleQueries`                                                                     | ventas, operación           |
| `asistencias`                  | `PayrollRepository`, `auth/AuthQueries`                                                                   | personal, asistencia        |

Nota sobre `inventario_unidades`: cuatro escritores, pero los cuatro están
dentro del mismo módulo. No es un problema de propiedad entre dominios; es una
decisión interna del módulo inventario y **no bloquea** la fase 4.

Nota sobre `detalle_propinas`, `detalle_comisiones` y sus cabeceras: la
propiedad quedó decidida (D5 resuelta — §8 de
[FASE0_DECISIONES](arquitectura/FASE0_DECISIONES.md)): dueño único **Personal**,
y ventas y operación escribirán vía la API pública de Personal dentro de la
misma transacción en la fase 5. El estado «escritura partida» de estas filas
describe el código de hoy, no el objetivo.

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
  propietario entre Clientes y Caja y todavía no está decidido: **Caja** es lo
  coherente con el saldo, pero rompe la atomicidad del cobro.
- `asistencias` la escriben `PayrollRepository` (para nómina) y
  `auth/AuthQueries`. La lectura de nómina probablemente deba ser pública y de
  sólo lectura, pero requiere confirmación.
- `logins` la escriben caja e identidad. Probablemente sea identidad, pero hay
  que confirmar si el registro de apertura de caja es un evento de caja o de
  identidad.
