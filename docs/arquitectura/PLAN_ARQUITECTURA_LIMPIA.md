# Plan de integración — Arquitectura limpia

> **Estado**: propuesto · **Creado**: 2026-10-27 · **Última revisión**:
> 2026-10-27 **Alcance**: `lasmunecasderamon-dashboard` (monolito modular
> Next.js + PostgreSQL) **Documento de seguimiento**: marcá `[x]` solo con la
> evidencia del criterio de aceptación observada. Una tarea sin evidencia queda
> `[ ]` con la nota al lado.

## 1. Punto de partida (medido, no estimado)

El proyecto **no es Clean Architecture**. Es un monolito modular con capas
(hexagonal-lite): tiene fronteras entre módulos verificadas por un gate, pero no
tiene puertos, ni inversión de dependencias, ni núcleo de dominio.

Evidencia de lo que **sí** está (no tocar, es el activo):

| Hecho                                                             | Valor                           | Cómo se comprueba                                |
| ----------------------------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| Módulos con API pública (`index.ts`) y contratos (`contracts.ts`) | 21 dominios                     | `modules/*/index.ts`                             |
| Rutas HTTP con SQL directo                                        | **0**                           | `docs/arquitectura/FASE0_DIAGNOSTICO.md` §1      |
| Tablas con más de un escritor                                     | **0**                           | ídem §2                                          |
| Ciclos entre dominios                                             | **0**                           | ídem §3                                          |
| Gate de dependencias                                              | **0 hallazgos / 0 excepciones** | `node scripts/arquitectura/limites.mjs --listar` |
| Adaptador HTTP único (auth, permisos, auditoría, validación)      | `lib/api/withRoute.ts`          | 210 de 230 `route.ts`                            |

Evidencia de lo que **falta** (la deuda que este plan paga):

| Deuda                                              | Hoy                                       | Meta                                              |
| -------------------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| Puertos de repositorio (`interface *Repository`)   | **0**                                     | ≥ 1 por módulo tocado                             |
| Inyección de dependencias (constructor/parámetro)  | **0**                                     | en cada caso de uso con puerto                    |
| Archivos con SQL fuera de repositorios             | **60**                                    | 0 en `modules/` y `lib/` (scripts/seed excluidos) |
| `servicio.ts` que escriben SQL                     | **4** (13 sentencias)                     | 0                                                 |
| `route.ts` que importan `@/lib/database`           | **3**                                     | 0                                                 |
| `route.ts` que importan `@/lib/business`           | **36** (13 ya son `schemas/`)             | solo `schemas/`                                   |
| `any` en `app/api`                                 | **74**                                    | 0                                                 |
| Núcleo de dominio (entidades/reglas puras)         | **inexistente**                           | `dominio.ts` por flujo con reglas                 |
| `servicio.ts` pasamanos (solo delegan al repo)     | mayoría (2.2 KB prom. vs 8.3 KB del repo) | con reglas propias o eliminados                   |
| Tests que mockean módulos en vez de inyectar fakes | **296 de 420 archivos**                   | fakes por puerto                                  |
| Rutas sin `withRoute`                              | **20**                                    | clasificadas y documentadas                       |

**Corrección de una lectura previa**: `lib/services/` y `lib/repositories/` ya
no existen. El stack legado está migrado; lo que queda son `lib/business`
(kernel compartido) y `lib/database` (infraestructura). Las regexes de
`scripts/arquitectura/limites.mjs` que apuntan a esos directorios (líneas
70-113) son código muerto.

## 2. Decisiones de diseño (fijas, para no re-litigar cada PR)

**D1 — Puertos explícitos, no abstracciones implícitas.** Cada repositorio
consumido por un servicio se declara como `interface` en `puertos.ts` del
submódulo. El repositorio concreto la implementa. El servicio depende del tipo,
nunca del archivo.

**D2 — Inyección por parámetro con default. Sin contenedor.**

```ts
export async function obtenerVenta(
  id: string,
  repo: VentasPort = VentasRepositorio
): Promise<Venta | null> { ... }
```

El default mantiene los 233 imports actuales desde `route.ts` funcionando; el
test pasa un fake. No se introduce Inversify/tsyringe: un contenedor en un
monolito con 21 dominios es ceremonia sin beneficio.

**D3 — Dominio puro = archivo sin imports de infraestructura.** Reglas (totales,
comisiones, pagos mixtos, vencimientos, cupos) viven en
`dominio.ts`/`calculos.ts` y no importan `pg`, `lib/database`, `lib/transaction`
ni `next/*`. Se testean sin base de datos.

**D4 — El SQL vive en infraestructura.** `repositorio.ts`, `consultas.ts`,
`infraestructura.ts` y `lib/database/*`. Los `servicio.ts` no contienen
`INSERT/UPDATE/DELETE/SELECT`.

**D5 — El `route.ts` traduce, no decide.** Valida esquema, llama API pública de
módulo o workflow, mapea errores a HTTP. No conoce tablas, ni el pool, ni
helpers de negocio.

**D6 — El gate es un trinquete, no un informe.** Cada regla nueva en
`limites.mjs` se agrega **con la deuda actual como excepción**, así el número
solo puede bajar. Una excepción que desaparece y no se borra hace fallar el
control (comportamiento ya implementado en
`scripts/arquitectura/limites.mjs:509`).

## 3. Fases

El orden no es negociable: **0 antes que A**, porque el trinquete impide que la
deuda vuelva a crecer mientras se paga. Cada fase deja el build verde.

### Fase 0 — Trinquete y saneamiento del gate (empezar acá)

Medir ya no alcanza: hoy el gate no mira el SQL ni el acceso a la base desde las
rutas, así que la deuda central no está protegida.

- [ ] **0.1** Agregar regla `sql-solo-infraestructura` a
      `scripts/arquitectura/limites.mjs`, reusando `escriturasDe()` de
      `scripts/arquitectura/propiedad.mjs`. Falla si un archivo fuera de
      `repositorio|consultas|registro|infraestructura|lib/database|scripts|seed`
      contiene escritura SQL. **DoD**: `--listar` muestra los 36 archivos
      actuales como excepciones y el control sigue en verde.
- [ ] **0.2** Agregar regla `rutas-sin-base-directa`: `app/api/**` no importa
      `@/lib/database/*`. **DoD**: 3 excepciones registradas
      (`monitoring/slow-queries`, `settings/database-clean`, `sync-operations`).
- [ ] **0.3** Agregar regla `servicio-sin-sql`: ningún `modules/**/servicio.ts`
      escribe SQL. **DoD**: 4 excepciones registradas con motivo y condición de
      salida.
- [ ] **0.4** Borrar de `MODULO_POR_RUTA` las entradas muertas:
      `lib/services/*`, `lib/repositories/*` (líneas 70-113) y todo el bloque
      `app/api/*` (116-132, es inalcanzable porque `moduloDe()` retorna `null`
      para `app/` en la línea 137). **DoD**: el grafo de ciclos y el conteo de
      hallazgos no cambian.
- [ ] **0.5** Regla de ESLint `no-explicit-any` en `app/api/**` como `warn` con
      `--max-warnings` fijado al valor actual (74), para que no crezca. **DoD**:
      `pnpm lint:full` verde y un `any` nuevo rompe CI.

**Riesgo de la fase**: agregar una regla sin baseline deja CI rojo en todo el
repo. El baseline se carga en el mismo PR que la regla.

### Fase A — Cerrar las fugas de persistencia (deuda barata, alto retorno)

12 archivos, mecánico, sin cambio de comportamiento.

- [ ] **A1** Mover a `repositorio.ts` las 13 sentencias SQL de
      `modules/caja/retiros/servicio.ts` (l.60),
      `modules/comunicaciones/push/servicio.ts` (l.56, 156),
      `modules/inventario/limpieza/servicio.ts` (l.70, 90, 95, 125, 139, 146) y
      `modules/inventario/reposicion/servicio.ts` (l.30, 41, 49, 55). **DoD**:
      los 4 servicios quedan sin SQL; tests existentes verdes; regla 0.3 sin
      excepciones.
- [ ] **A2** Sacar el acceso a base de
      `app/api/monitoring/slow-queries/route.ts`,
      `app/api/settings/database-clean/route.ts` y
      `app/api/sync-operations/route.ts` hacia `lib/database/maintenance.ts` o
      `modules/auditoria`. **DoD**: regla 0.2 sin excepciones.
- [ ] **A3** Mover el SQL de `lib/business/containerAlerts.ts`, `shotAlerts.ts`,
      `twilioConfig.ts` y `whatsappConfig.ts` a los módulos dueños
      (`inventario`, `comunicaciones`). **DoD**: `lib/business` solo con reglas
      puras y esquemas; regla 0.1 reduce el conteo en 4.
- [ ] **A4** Mover el SQL de `lib/middleware/auth.ts` al repositorio de
      `identidad`. **DoD**: la regla `negocio-sin-framework` sigue verde y el
      middleware no consulta tablas.
- [ ] **A5** Reducir los 36 imports de `@/lib/business` en `route.ts` a solo
      `lib/business/schemas/**` (13 ya lo son; quedan 23 por mover). **DoD**:
      ningún `route.ts` importa helpers de negocio.
- [ ] **A6** Eliminar los 74 `any` de `app/api` (empezar por los
      `{ params: any; user: any }` de `app/api/sales/route.ts:33`; el tipo
      correcto ya existe en `lib/api/withRoute.ts`). **DoD**:
      `grep -c ': any' app/api` = 0 y `pnpm typecheck` verde.

### Fase B — Puertos e inversión de dependencias (módulo piloto)

Piloto: **`modules/reportes/dashboard`** — es el módulo que más se parece a un
pasamanos hoy (`StatsService` son 11 métodos que solo reenvían) y es de solo
lectura, así que el riesgo de regresión es mínimo.

- [ ] **B1** Crear `modules/reportes/dashboard/puertos.ts` con `DashboardPort`
      (las 11 operaciones de `servicio.ts:1-47`).
- [ ] **B2** Hacer que `StatsRepository` implemente el puerto explícitamente
      (`class StatsRepository implements DashboardPort`).
- [ ] **B3** Inyectar el puerto en `StatsService` con default (patrón D2).
      **DoD**: `pnpm typecheck` verde sin tocar los consumidores.
- [ ] **B4** Escribir los tests de `StatsService` con un fake del puerto, sin
      `vi.mock` del módulo. **DoD**: el archivo de test no importa
      `repositorio.ts` ni mockea `@/modules`.
- [ ] **B5** Repetir B1-B4 en un módulo de escritura (`modules/ventas/registro`)
      para validar que el patrón funciona cuando hay transacción
      (`ContextoOperacion`). **DoD**: el fake del puerto no necesita PostgreSQL.

**Criterio de salida de la fase**: existe un patrón escrito y copiable. Sin
esto, la fase C produce 21 estilos distintos.

### Fase C — Núcleo de dominio (la parte que de verdad falta)

- [ ] **C1** Extraer a `modules/ventas/dominio.ts` las reglas hoy enterradas en
      `lib/business/`: `saleTotals.ts`, `pagosMixtos.ts`, `ventaRepartos.ts`,
      `salesUtils.ts`. **DoD**: el archivo no importa infraestructura y los
      tests corren sin base de datos.
- [ ] **C2** Extraer reglas de `modules/operacion/cuentas` (apertura, cierre,
      temporizadores) a `dominio.ts`.
- [ ] **C3** Extraer reglas de `modules/personal/nomina` (cálculo de nómina,
      horas extras, gratificaciones) a `dominio.ts`.
- [ ] **C4** Para cada regla extraída, un test de tabla (entrada → salida) sin
      mocks. **DoD**: cada `dominio.ts` tiene su
      `tests/unit/modules/<dominio>/dominio.test.ts`.
- [ ] **C5** Reemplazar en `servicio.ts` el cálculo inline por la llamada al
      dominio, manteniendo el repositorio como única fuente de datos. **DoD**:
      suite completa verde + `pnpm test:integration:legacy-db`.

**No hacer**: mover todo de una. Cada bloque de C es un PR con su commit de
work-unit; si el cálculo de nómina se rompe, el `git bisect` tiene que caer en
un commit chico.

### Fase D — Asistencia biométrica (la deuda más grande y más aislada)

14 archivos de `modules/asistencia/biometrico/` con SQL inline
(`enrollmentService`, `eventListener`, `identificacionFacial`, `recordPhotos`,
`recordPoller`, `deviceAuth`, `ipDiscovery`, `processBiometricEvent`, etc.).

- [ ] **D1** Clasificar cada archivo: ¿adaptador de dispositivo (habla con el
      hardware) o aplicación? Los adaptadores van a `adapters/` (ya existe la
      carpeta) y conservan su ciclo de vida; la aplicación va a `servicio.ts`.
- [ ] **D2** Extraer las 6 tablas (`biometric_devices`, `biometric_plantillas`,
      `biometric_device_records`, `biometric_events`, `asistencia_desafios`,
      `kiosk_devices`) a repositorios por tabla.
- [ ] **D3** Formalizar el ciclo de vida de los 3 procesos periódicos
      (`ipWatcher`, `recordPoller`, `setInterval` de `notifications/kiosk`) con
      arranque/parada explícitos, como pide el §5 del diagnóstico. **DoD**: no
      queda `setInterval` sin función de limpieza.

**Por qué al final**: es la zona con hardware real detrás. Un refactor acá se
prueba contra el dispositivo, no contra un test. No la mezcles con A/B/C.

### Fase E — Contratos HTTP y errores

- [ ] **E1** Clasificar las 20 rutas sin `withRoute` (`/api/auth/login`,
      `/api/whatsapp/webhook`, `/api/csp-violation`, SSE, imágenes, swagger…).
      Envolver las que correspondan; documentar las excepciones legítimas con un
      comentario que explique por qué.
- [ ] **E2** Definir un mapeo único de error de dominio → HTTP en `lib/api/`
      (`DomainError` → 400/404/409) y eliminar los `try/catch` que devuelven 500
      a mano en `route.ts`.
- [ ] **E3** Mover los esquemas zod de `lib/business/schemas/**` (26 archivos) a
      `modules/<dominio>/contracts.ts` cuando solo los usa un dominio; dejar en
      `lib/business/schemas` únicamente los compartidos. **DoD**:
      `modules/*/contracts.ts` sigue siendo seguro para cliente (regla
      `contratos-sin-servidor` verde).

### Fase F — Tests y cobertura de reglas

- [ ] **F1** Bajar los 296 `vi.mock('@/modules/...')`: cada mock que exista solo
      para esquivar el repositorio se reemplaza por un fake del puerto (D1/D2).
      **DoD**: `grep -rc "vi.mock('@/modules" tests/unit | ...` decreciente y
      registrado en §4.
- [ ] **F2** Un test de contrato por puerto: verifica que el repositorio
      concreto cumple la interfaz (`satisfies` en tiempo de compilación) y que
      el fake la cumple.
- [ ] **F3** Un test por `S#` de cada caso de uso nuevo, con el efecto
      observable completo (salida, código, fila persistida), no solo el retorno.

## 4. Tablero de seguimiento

Actualizá la columna **Actual** al cerrar cada fase. El comando es la fuente de
verdad: si el número no sale del comando, no cuenta.

| Métrica                                             | Baseline 2026-10-27 | Actual | Meta                        | Comando                                                       |
| --------------------------------------------------- | ------------------- | ------ | --------------------------- | ------------------------------------------------------------- |
| Archivos con SQL fuera de repositorios              | 60                  | —      | 0 (`modules/`,`lib/`)       | `pnpm arquitectura` → §1                                      |
| `servicio.ts` con escrituras SQL                    | 4                   | —      | 0                           | `grep -l "INSERT INTO\|UPDATE .* SET" modules/**/servicio.ts` |
| `route.ts` importando `@/lib/database`              | 3                   | —      | 0                           | grep sobre `app/api/**`                                       |
| `route.ts` importando `@/lib/business` (no schemas) | 36 (13 son schemas) | —      | 0                           | ídem                                                          |
| `any` en `app/api`                                  | 74                  | —      | 0                           | grep `: any`                                                  |
| Puertos declarados en `modules/`                    | 0                   | —      | ≥ 1 por módulo migrado      | `grep -r "interface .*Port\|interface .*Repository" modules/` |
| `dominio.ts` puros (sin imports de infra)           | 0                   | —      | 3 (ventas, cuentas, nómina) | `pnpm arquitectura:limites`                                   |
| `vi.mock('@/modules/*')` en tests                   | 296                 | —      | ≤ 50                        | grep en `tests/unit`                                          |
| Hallazgos del gate                                  | 0                   | —      | 0                           | `node scripts/arquitectura/limites.mjs`                       |
| Excepciones registradas                             | 0                   | —      | máx. 12 y decreciente       | `node scripts/arquitectura/limites.mjs --listar`              |

**Cómo medir sin mentirte**: en PowerShell usá `Select-String -LiteralPath`
cuando el path pueda contener `[id]` o `[filename]`. Con `-Path`, esos corchetes
se leen como clase de caracteres y el archivo se saltea en silencio: medir así
dio 181 imports y 66 `any` cuando los reales son 233 y 74.

**Definición de terminado** (las cuatro juntas, verificables):

1. `pnpm arquitectura` reporta 0 archivos con SQL fuera de repositorios en
   `modules/` y `lib/` (scripts y seeds excluidos).
2. `pnpm arquitectura:limites` falla si alguien agrega un `servicio.ts` con SQL,
   una ruta que importa la base o un `any` nuevo en `app/api`.
3. Los tres `dominio.ts` corren sus reglas en tests sin base de datos, y las
   rutas que las usan no las reimplementan.
4. `modules/reportes/dashboard` y `modules/ventas/registro` demuestran el patrón
   puerto + inyección + fake, copiados por al menos un módulo más.

## 5. Registro de avance

| Fecha      | Fase | Tarea       | Evidencia    | Nota                   |
| ---------- | ---- | ----------- | ------------ | ---------------------- |
| 2026-10-27 | —    | Plan creado | Este archivo | Baseline medido a mano |

## 6. Riesgos y trampas

| Riesgo                             | Por qué importa                                                           | Mitigación                                     |
| ---------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| Big-bang refactor                  | 2133 archivos, 420 tests; el `git bisect` se vuelve inútil                | Una fase por PR, una tarea por commit          |
| Puertos decorativos                | `interface` + única implementación + cero fakes = ceremonia               | Ningún puerto sin su test con fake (F2)        |
| `dominio.ts` que importa `pg`      | Repite el problema con otro nombre                                        | Regla en el gate, no confianza                 |
| Inyección rota por default         | Si el default es la instancia concreta, el test sigue mockeando el módulo | DoD de B4: el test no importa `repositorio.ts` |
| Gate sin baseline                  | CI rojo en todo el repo el día que se agrega la regla                     | La regla y su baseline van en el mismo PR      |
| Tocar biometría temprano           | Se prueba contra hardware, no contra tests                                | Fase D al final, aislada                       |
| `anything`/deuda cosmética primero | Se paga lo visible y no lo caro                                           | Orden 0 → A → B → C → D → E → F                |

## 7. Fuera de alcance

- Contenedor de inyección de dependencias.
- Microservicios o separación de despliegue.
- Reescritura de la capa de datos fuera de PostgreSQL.
- Cambios de UI/UX: este plan es de fronteras internas, no de producto.
- RDD/review gates: son política de entrega, no arquitectura.
