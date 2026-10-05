# Corte 13 — Cobro con venta sobre APIs públicas

Fecha: 2026-10-05. Base revisada: `6cd071d4`. Este corte no cierra las fases
5–7.

## Implementación

`POST /api/cuentas/:id/cobrar-con-venta` conserva permisos, normalización,
respuesta e idempotencia y llama a `workflows/cobrar-cuenta.ts`. El workflow
abre `enUnaUnidad`, pasa el mismo contexto opaco a Operación y Ventas y prepara
la respuesta antes del commit. No importa SQL, repositorios ni servicios
heredados.

Los participantes del cobro escriben a través de sus propietarios:

| Propietario | Operación                                                                  |
| ----------- | -------------------------------------------------------------------------- |
| Operación   | Cerrar cuenta, historial de habitación, liberar habitación y cerrar pedido |
| Clientes    | Descontar el saldo prepago de la cuenta                                    |
| Caja        | Validar caja activa y registrar los importes del cobro                     |
| Ventas      | Registrar cabecera, detalles y participantes de la venta                   |
| Inventario  | Consumir existencias cuando el detalle contiene una presentación           |
| Personal    | Registrar comisiones y propinas dentro de la misma transacción             |
| Identidad   | Actualizar disponibilidad de anfitrionas                                   |

El registro de ventas se extrae de `SaleService`; esa clase adapta a sus
consumidores restantes sin mantener una segunda implementación. Se retira
`AccountService.cobrarConVenta` y se migran su ruta y pruebas. El cobro simple
también utiliza el caso de uso de Operación. Caja y RoomManager tienen puentes
temporales explícitos para reutilizar las implementaciones de sus propietarios.

### Corrección de atomicidad

Antes, `TipRepository.register` abría una transacción independiente y
`SaleService` silenciaba su error. Ahora la propina de venta utiliza la misma
conexión y un fallo revierte el cobro completo. Este cambio de comportamiento es
deliberado: no se confirma un cobro que perdió parte de sus movimientos. El
registro independiente de propinas conserva su entrada y abre su propia unidad
utilizando la misma implementación de Personal.

Los avisos se recogen durante la unidad y se ejecutan después del commit. Un
error de envío se registra y no transforma un cobro confirmado en una respuesta
fallida. Esto no garantiza entrega: no se introduce un outbox.

## Control de dependencias

El clasificador reconoce automáticamente `modules/<nombre>` y también los
repositorios heredados que faltaban (Caja, Clientes, Personal, Identidad y
Operación). El control enumera todas las aristas cíclicas con claves estables;
el DFS anterior enumeraba algunos caminos y su resultado cambiaba al variar el
orden de recorrido. Una arista cíclica nueva ya no queda escondida dentro de un
ciclo conocido.

La misma clasificación se aplicó al código de `6cd071d4` y al corte actual: **25
aristas cíclicas en la base y 27 en el corte**. Las dos aristas de imports
añadidas son Operación → Clientes y Ventas → Identidad. Antes esas dependencias
existían como SQL directo sobre `clientes.saldo` y `usuarios`; ahora son
llamadas públicas. Se registran explícitamente, no se presentan como ciclos
resueltos. Queda pendiente elevar la coordinación necesaria para eliminar esos
ciclos.

El control tiene **30 excepciones: 27 aristas cíclicas y 3 consumidores del
puente** (SaleQueries, CashRegisterRepository y RoomManager). SaleService
conserva el único uso permitido de base para consumidores que aún entregan una
transacción. El workflow nuevo no usa el puente. Las cifras anteriores de 23
excepciones no son comparables directamente con esta medición ampliada.

Evidencia reproducida de ambos grafos:
[CORTE13_DEPENDENCIAS.json](CORTE13_DEPENDENCIAS.json). Hay pruebas negativas
para ciclos de todos los módulos nuevos y uno futuro, para módulo → workflow, y
para workflow → driver. HTTP → workflow está permitido.

## Propiedad y deuda restante

- Prepago pertenece a **Clientes**, sesiones a **Identidad**, marcas a
  **Asistencia**, comisiones y propinas a **Personal**. La decisión no significa
  que todos los escritores históricos hayan migrado.
- El consumo de prepago de ventas directas conserva el adaptador a `pagosMixtos`
  y su cierre de cuentas PREP-*. Las anulaciones siguen en
  SaleQueries/ServiceQueries. Deben migrarse sin duplicar sus movimientos.
- La pausa de ventas temporizadas conserva RoomManager. El cobro con venta arma
  una venta sin tiempo de habitación y no ejecuta esa rama.
- Auditoría conserva AuditRepository como infraestructura compartida. La
  extracción de su módulo corresponde a la fase 6.
- Las consultas de disponibilidad y elegibilidad de usuarios y la respuesta de
  cuenta mantienen sus JOIN entre dominios; son proyecciones de lectura
  explícitas, sin reemplazarlas por llamadas N+1.
- Se conservan los contratos de detalle de cuenta: no se añaden presentaciones
  ni shots donde el flujo previo no los transportaba. La llamada a Inventario
  conserva su comportamiento según los datos disponibles.
- Configuración mantiene una excepción transitoria C1: registro técnico común
  con validaciones de negocio aún centralizadas. Su casilla queda pendiente.

## Validación y límites del entorno

Las pruebas PostgreSQL se ejecutan únicamente contra la base local autorizada
por `vitest.postgres.config.ts`, con instantáneas restauradas entre casos. El
flujo de cobro verifica confirmación conjunta, rechazo de reintento sin duplicar
caja, rollback por venta inválida, propina confirmada, fallo de envío posterior
al commit y fallo tardío de propina sin movimientos ni avisos.

La prueba de rendimiento de cobro pasa su techo fijo de 25 consultas. El resto
de la suite amplia no se considera aprobado: la anulación encuentra una columna
faltante en el esquema local. `pnpm db:plan` rechaza actualizarlo porque la
migración aplicada `001_consolidated.sql` cambió respecto a su checksum. No se
reconcilió ni se forzó el historial de la base.

La primera ejecución de la línea base dejó pasar un envío real de WhatsApp desde
anticipos. Se añadió un setup de PostgreSQL que simula los transportes Twilio y
Expo para que las pruebas de persistencia no envíen mensajes reales.

No se ha desplegado este corte ni se considera validada la estructura final.
