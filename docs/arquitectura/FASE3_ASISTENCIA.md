# Fase 3 — Límites de identidad y Asistencia

Fecha: 2026-10-04. Estado: implementada.

## Qué entrega

| Tarea (§7, Fase 3)                                                  | Estado                                                                                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Contratos de identidad y permisos usados por los demás módulos      | `modules/identidad/contracts.ts` (`Actor`, `Permisos`, `Sesion`); Asistencia los consume sin importar `lib/auth`/`middleware` |
| Migrar ventana de asistencia, marcas, kioskos y equipos biométricos | `modules/asistencia/` con los cuatro subdominios; consumidores y tests migrados; los archivos viejos se borraron              |
| Centralizar arranque de listeners, poller y vigilancia de IP        | `modules/asistencia/procesos.ts`: `arrancarRecepcionBiometrica` / `detenerRecepcionBiometrica`, única API de arranque         |
| Preservar deduplicación de eventos y restricciones de ventana/dispo | El SQL de marcaje no cambió: mismas consultas, mismos tests; línea base intacta                                               |
| Evitar doble arranque al recargar módulos o en multi-instancia      | Guard en `globalThis` que sobrevive a la recarga (revisión del mecanismo previo, ver abajo)                                   |

## La estructura del módulo

```text
modules/asistencia/
  index.ts                       # API pública de servidor (server-only)
  contracts.ts                   # DTOs aptos para cliente (types/asistencia reexporta)
  procesos.ts                    # ciclo de vida de la recepción biométrica (R4)
  marcas/
    servicio.ts                  # 9 casos de uso; valida con zod y orquesta
    repositorio.ts               # SQL privado (el antiguo AttendanceQueries)
  kioskos/
    deviceAuth.ts                # credenciales de pantalla (kiosk_devices)
    attendanceChallenges.ts      # desafíos de un solo uso de presencia
  biometrico/                    # 31 archivos: lector de la puerta, alta,
                                 # recepción en vivo, poller, IP watch, adapters
modules/identidad/
  contracts.ts                   # tipos de identidad/permisos (sólo contratos)
```

Lo que no entró en el módulo, a propósito: `mjpegFrames.ts` es un parser de
vista previa que sólo consume la UI (`hooks/useBiometricPreview`) y se mudó a
`lib/utils/` — la regla `ui-consume-modulos-por-http` prohíbe que un hook
importa el interior de un módulo, y sacarlo es más honesto que crear una
excepción. `instrumentation.ts` sólo pide el arranque al módulo; no conoce
poller, listeners ni vigilante.

## Identidad como contrato, no como import

El ciclo heredado `asistencia ↔ identidad` existía porque las rutas de
asistencia importan `getAuth`/`isAdministrator` (identidad) y las rutas de
usuarios importan la biometría (asistencia). La Fase 3 no lo rompe — R3 prohíbe
romper ciclos dejando imports sueltos — sino que establece el contrato que el
plan pide: los módulos reciben un `Actor` ya verificado en sus parámetros y no
importan la implementación de la identidad. `modules/identidad/contracts.ts` es
el único punto del que beben tipos (§5: entre módulos sólo `index.ts` o
`contracts.ts`), y la verificación de permisos sigue en la ruta, antes de llamar
al módulo.

## El ciclo de vida de la recepción (riesgo R4)

Revisión del mecanismo previo, antes de cambiarlo, como exige R4:

- `recordPoller` ya guardaba su estado en `globalThis.__biometricPoller`:
  idempotente y resistente a recargas.
- `ipWatcher` guardaba con `if (timer) return` **de módulo**: un recarga creaba
  un segundo intervalo encima del viejo.
- `eventListener` registraba en un `Map` de módulo: al recargar, `encenderTodos`
  re-registraba sin ver si el anterior seguía vivo.

`procesos.ts` pone el guard en `globalThis.__asistenciaRecepcion`, de modo que
el arranque es único aunque el módulo se recargue, y ofrece el apagado ordenado
(`detenerRecepcionBiometrica`: listeners → poller → vigilante). Multi-instancia:
cada proceso Node enciende los suyos; una instancia que no deba escuchar se
apaga por flag de entorno (`BIOMETRIC_IP_WATCH` y `BIOMETRIC_POLLER_MS` ya
existen), no por código.

## Dos cambios en la puerta, probados fallando

1. **`ui-consume-modulos-por-http`**: un `route.ts` fuera de `app/api` es
   adaptador de servidor — `app/iclock/cdata` y `app/dahua/push` quedan fuera de
   `/api` a propósito (hablan HTTP plano, sin middleware: el propio comentario
   de la ruta lo explica). El test nuevo («un route handler fuera de app/api
   consume el módulo; una página no») falló contra la regla vieja y pasa con la
   nueva; una página sigue bloqueada.
2. **Mapa de dominios**: `modules/asistencia` y `modules/identidad` entran a
   `MODULO_POR_RUTA`, y el directorio (`@/modules/asistencia`) cuenta como
   arista igual que el `index.ts` — sin eso el grafo no veía los imports reales
   y el ciclo registrado `asistencia ↔ identidad` aparecía como «excepción
   obsoleta». Además, `app/api/notifications/kiosk` se reclasifica como
   adaptador de Asistencia: verifica `kiosk_devices` y difunde eventos de
   asistencia; con ella el único borde nuevo (comunicaciones → asistencia)
   habría formado un ciclo de cuatro dominios innecesario. La puerta queda en
   **26/26 excepciones, ninguna nueva ni obsoleta**.

## Comportamiento conservado

- Las 204 rutas no cambian de URL ni de permisos; sólo cambian imports y los
  nombres de caso de uso del servicio de marcas (`AttendanceService.getX` →
  `listarX`), mismos argumentos y mismo orden.
- El SQL de marcaje, la ventana (`asistencia_hora_inicio`/`fin`, defaults
  21–23), la deduplicación de eventos biométricos (reenvío no duplica), los
  desafíos de un solo uso y la autorización por dispositivo del kiosko están
  movidos **verbatim**: ni una consulta reescrita.
- La ruta `GET /api/kiosk/board` dejó de importar SQL de otro módulo: pide la
  ventana por la API pública (`consultarVentana`).
- `types/asistencia.ts` reexporta desde `modules/asistencia/contracts` para no
  romper a la UI.

## Deuda conocida, no tocada en esta fase

- `PayrollRepository` sigue escribiendo `horas_extras` (Fase 6) y las lecturas
  cruzadas de reportes/agenda siguen donde estaban.
- Las claves de configuración de la ventana siguen en el catálogo compartido
  (`lib/configuraciones/registroClaves.ts`): reubicarlas en el propietario es la
  Fase 6 («Reubicar reglas de configuración en su propietario»).
- El módulo asume hoy `ContextoOperacion` sólo donde ya existía; anticipos y la
  biometría siguen con transacciones propias hasta el workflow de la Fase 5.

## Incidencia de runtime y resolución

Con Turbopack, la importación del grafo de `lib/database/db` desde el chunk de
`instrumentation` se quedaba pendiente; las sondas cargaban `logger` pero no
`db`. La cadena incluía `pg`, `postgres.cjs`, `env` y `perfilConsultas`. El
comportamiento también existía antes de la migración, cuando `instrumentation`
importaba `recordPoller` directamente.

Se cambió `build` y `build:analyze` a `next build --webpack`, opción documentada
por la versión instalada de Next.js. Verificación en el entorno local:

- `pnpm build`: Webpack compiló, TypeScript terminó y se generaron 217 páginas.
- `pnpm start -- --port 3107`: servidor listo en 197 ms.
- `GET /api/kiosk/session`: HTTP 200.

Esto elimina el bloqueo observado durante el arranque del servidor. No valida la
conexión con un reloj biométrico físico; esa comprobación requiere el
dispositivo y su configuración de despliegue. La recepción es idempotente por
proceso, no un líder distribuido: las instancias que no deban escuchar deben
desactivarse con la configuración operativa correspondiente.

## Verificación

- Suite unitaria: **1710 aprobadas** (1702 −14 del servicio viejo +15 del
  servicio de marcas +6 del ciclo de vida +1 de la regla de route handlers). Los
  dos tests de ruta que mockeaban el interior del módulo ahora mockean la API
  pública.
- Suite postgres: **156 aprobadas** (desafíos, ciclo biométrico, línea base,
  repositorios).
- `pnpm arquitectura:limites`: 26/26 excepciones vigentes, ninguna nueva ni
  obsoleta.
- `pnpm typecheck`, ESLint y Prettier: sin errores en los 130 archivos tocados.
- `pnpm build` con Webpack y arranque productivo comprobados;
  `/api/kiosk/session` responde 200 y `server-only` no truena en el bundle de
  servidor.
