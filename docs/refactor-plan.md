# Refactor Plan

Objetivo: reducir duplicaciÃ³n, separar responsabilidades y hacer mÃ¡s mantenible el dashboard sin cambiar el comportamiento visible.

## Estado General

- Fase 1: completada
- Fase 2: completada
- Fase 3: completada
- Fase 4: completada
- Fase 5: activa

## Fase 1: Datos maestros compartidos

Estado: completada

Implementado:
- hook compartido para cargar y refrescar datos maestros
- clientes
- habitaciones
- anfitrionas
- categorÃ­as

Beneficio logrado:
- menos `useEffect` repetidos
- una sola polÃ­tica de refresh
- menos fetches manuales dispersos

## Fase 2: Disponibilidad reutilizable

Estado: completada

Implementado:
- extracciÃ³n de lÃ³gica reutilizable de habitaciones disponibles
- reutilizaciÃ³n de disponibilidad en modales y formularios
- validaciones ligadas a selecciÃ³n actual centralizadas en hooks

Beneficio logrado:
- reglas mÃ¡s consistentes
- menos duplicaciÃ³n en modales
- menos bugs por desalineaciÃ³n

## Fase 3: Componentes grandes

Estado: completada

Ya refactorizado:
- `CajaDetails`
- `OrderDetailModal`
- `NewPrivateRoomPageClient`
- `CategoryProductsModal`
- `SaleProductModal`
- `ServiceOrderFormNew`

Beneficio esperado:
- archivos mÃ¡s pequeÃ±os
- render mÃ¡s legible
- lÃ³gica mÃ¡s fÃ¡cil de testear

## Fase 4: Repositories

Estado: completada

Objetivo principal:
- `StatsRepository`
- `CuentaRepository`
- `ServiceRepository`

Siguiente enfoque recomendado:
- separar en capas:
  - queries
  - mappers
  - cÃ¡lculos de negocio
  - orquestaciÃ³n/flujo

Avance actual:
- extracciÃ³n de builders compartidos para tendencias en `StatsRepository`
- extracciÃ³n de mapeadores de servicios en `ServiceRepository`
- extracciÃ³n del resumen financiero de `CuentaRepository` a un helper puro
- `StatsRepository` empezÃ³ a delegar rankings, resumen financiero y anomalÃ­as en helpers
- `StatsRepository` ahora construye el payload de insights/composite con un helper Ãºnico
- `StatsRepository` tambiÃ©n delega `cajaStatsResult` y el mapeo de pendientes en helpers
- el paquete `lib/repositories/stats` quedÃ³ dividido en cÃ¡lculos puros y builders de payload
- el dominio `stats/` ya tiene un barrel de exports para imports mÃ¡s limpios
- `service/` y `hooks/shared/` tambiÃ©n quedaron con export barrels mÃ¡s limpios
- se eliminaron imports directos de hooks compartidos a favor del barrel
- `hooks/personal/` ahora tambiÃ©n funciona como punto de entrada Ãºnico para hooks y tipos pÃºblicos

Beneficio esperado:
- menos complejidad por archivo
- reglas de negocio mÃ¡s fÃ¡ciles de seguir
- cambios menos riesgosos

## Fase 5: ValidaciÃ³n

Estado: activa

DespuÃ©s de cada cambio importante:
- correr `tsc`
- revisar pantallas afectadas
- verificar que no haya regresiones visuales o de comportamiento

## Prioridad sugerida

1. Hook de datos maestros
2. Disponibilidad reutilizable
3. Componentes grandes
4. Repositories
5. ValidaciÃ³n final

