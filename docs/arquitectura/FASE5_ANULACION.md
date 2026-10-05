# Corte 14 — Anulación de ventas sobre APIs públicas

Fecha: 2026-10-05. No cierra las fases 5–7; retira un tercio del puente
transaccional y migra la transacción de ventas que la fase 4 dejó pendiente.

## Implementación

`modules/ventas/anulaciones/servicio.ts` expone `actualizarEstadoVenta`,
`aprobarAnulacionVenta`, `solicitarAnulacionVenta` y `procesarAnulacionVenta`.
Cada una abre `enUnaUnidad`, coordina a los propietarios con el mismo
`ContextoOperacion` y ejecuta los efectos (auditoría, SSE) después del commit.
El SQL propio de Ventas (`ventas`, `detalle_ventas`, `devoluciones_ventas`,
`detalle_devoluciones_ventas`, `solicitudes_anulacion_ventas`,
`ventas_usuarios`) vive en `anulaciones/repositorio.ts`.

Nuevas operaciones de propietario, mismo SQL que el heredado:

| Propietario | Operación                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Clientes    | `leerPrepagoConsumidoPorVenta`, `restituirPrepagoPorAnulacion`                                             |
| Caja        | `registrarMovimientoCobro` con deltas negativos (ya existía)                                               |
| Personal    | `revertir/ajustarComisionesPorAnulacion`, `revertir/ajustarPropinasPorAnulacion`                           |
| Inventario  | `revertirStockAnulacion` (ya existía)                                                                      |
| Identidad   | `actualizarDisponibilidad` (ya existía)                                                                    |
| Operación   | `liberarHabitacionPorAnulacion` (SQL de `RoomManager.resumeRoomLogic`), `reabrir/marcarPedidoPorAnulacion` |

`SaleService` delega conservando firmas, `SecurityAlertService` y respuestas;
`SaleQueries` queda en lecturas + delegación (−670 líneas) y pierde el import al
puente. Excepción `puente-transaccional-heredado` retirada para `SaleQueries`;
quedan `CashRegisterRepository` y `RoomManager`, usados por llamadores de
servicios, cuentas y temporizadores todavía heredados.

## Cambios deliberados de comportamiento

- `processAnulacion` corre en **una sola unidad** (antes eran dos transacciones:
  solicitud y ajuste). Si el ajuste falla, la solicitud no queda marcada como
  confirmada.
- Auditoría (`ANULADO`, `ANULACION_PARCIAL`, `FINALIZADO`) y `sale_cancelled` se
  emiten **después del commit**. Antes el log usaba otra conexión (sobrevivía al
  rollback) y el evento SSE se programaba antes de confirmar.
- La segunda anulación total de la misma venta sigue sin duplicar plata ni stock
  (guarda `estadoAnterior === 0`), igual que antes.

## Control de dependencias

`puente-transaccional-heredado`: 3 → 2. `sin-ciclos`: 27 aristas, sin altas ni
bajas (las direcciones ventas → caja/clientes/personal/operacion/identidad ya
estaban exceptuadas; ventas → inventario no es cíclica).
`modulo-solo-api-publica`, `infra-transaccional-autorizada` y
`workflow-sin-persistencia` pasan: la orquestación vive en el módulo (precedente
`registrarVenta`), no en un workflow, porque `lib/services` no puede importar
workflows.

## Validación

- `pnpm typecheck`: limpio.
- `pnpm arquitectura:limites`: 29/29 (2 puentes + 27 ciclos), sin novedades.
- `pnpm test:unit`: 1739 + 2 omitidas.
- `pnpm test:postgres`: 165/165, incluido el `bar-shots-flow` que fallaba por
  datos base: el resumen de shots es global al bar, así que el test ahora afirma
  deltas en vez de totales absolutos.
- `eslint` sobre los 15 archivos tocados: sin hallazgos.

## Deuda restante

- `CashRegisterRepository.updateBalances/getCurrentCajaId` y
  `RoomManager.updateHostessServiceStatus/resumeRoomLogic/pauseConflictingServices`
  siguen con puente para `ServiceQueries`, `CuentaQueries`, `ClientRepository`,
  anticipos y temporizadores.
- `SaleQueries.rawInsert/insertDetail/insertUserRelation/delete/getAll/getById`
  siguen como lecturas/adaptadores; `ServiceQueries` (anulaciones de servicios)
  es el próximo candidato al mismo tratamiento.
