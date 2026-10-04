# Fase 0 — Decisiones, línea base y mapa de riesgos

Fecha: 2026-10-03 Commit de línea base: `532a780a` Estado: Fase 0 completa. No
se movió ningún archivo de producción.

## 1. Línea base

Registrado sobre `532a780a`, con el árbol limpio.

| Comprobación   | Comando              | Resultado                                                     |
| -------------- | -------------------- | ------------------------------------------------------------- |
| Tipos          | `pnpm typecheck`     | **0 errores**                                                 |
| Suite unitaria | `pnpm test:unit`     | **1670/1670**, 175 archivos, 2 skipped                        |
| Lint           | `pnpm lint:full`     | **0 errores**, 1 warning (`instrumentation.ts:22`, `console`) |
| Formato        | `prettier --check .` | **424 archivos** con diferencias de estilo                    |
| Estilo SQL     | `pnpm arquitectura`  | ver §2                                                        |

Estas cifras son la referencia contra la que se mide la migración. Un fallo
posterior se compara contra ellas y no contra el estado del momento: lo que
aparezca de más es regresión de esta migración, lo que falte estaba ya roto.

**No se ejecutaron** `test:postgres`, `test:integration:all` ni `test:e2e` en
esta fase:

- `test:postgres` no corre porque `lasmunecasderamon_test` no tiene aplicadas
  las migraciones 053–057. Es un problema preexistente, ajeno a esta migración.
- `test:e2e` y las de integración requieren servidor y servicios levantados.

Queda como pendiente medirlos antes de la fase 5, donde el flujo transaccional
sí los necesita.

## 2. Diagnóstico cuantitativo

Generado por `pnpm arquitectura`. Detalle en `FASE0_DIAGNOSTICO.md` y
`analisis.json`.

| Indicador (§9 del plan)                | Valor actual | Objetivo        |
| -------------------------------------- | ------------ | --------------- |
| SQL en controladores HTTP              | **36 rutas** | 0               |
| Archivos con SQL fuera de repositorios | **90**       | módulo-local    |
| Tablas con más de un escritor          | **13**       | 1 propietario   |
| Ciclos entre dominios                  | **6**        | 0               |
| Procesos periódicos sin ciclo de vida  | **15**       | explícito       |
| Puntos de caché                        | **19**       | inventariados   |
| Rutas HTTP totales                     | 204          | 204 (no cambia) |

### Los 6 ciclos

| Ciclo                                                         | Lectura                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| asistencia → identidad → asistencia                           | Asistencia consulta permisos y permisos consulta asistencia                  |
| identidad → personal → identidad                              |                                                                              |
| identidad → personal → comunicaciones → identidad             |                                                                              |
| comunicaciones → ventas → comunicaciones                      |                                                                              |
| comunicaciones → operación → comunicaciones                   |                                                                              |
| identidad → personal → comunicaciones → operación → identidad | el más largo; cualquier coordinación que lo genere debe subir a `workflows/` |

## 3. Decisiones tomadas en Fase 0

**D1. El inventario de archivos lo decide git, no el sistema de archivos.** La
primera versión de la herramienta contaba `_tmp_real/` (127 archivos, ignorado
en `.gitignore:63`) y reportaba 173 archivos con SQL en lugar de 90. Un
diagnóstico que se infla con basura no sirve de línea base. La herramienta ahora
usa `git ls-files`.

**D2. El límite arquitectónico es el import del driver, no la llamada.**
Contando llamadas a `query(` salían 15 rutas con SQL en lugar de 36: las que
importan los símbolos y los reexportan no dejan rastro de llamada. `grep` da 36;
la herramienta da 36.

**D3. Los 15 procesos periódicos se inventarían ahora, no en la fase 3.**
Incluyen `lib/biometric/ipWatcher.ts` y `lib/biometric/recordPoller.ts`, que
arrancan desde `instrumentation.ts`. El plan pide un ciclo de vida definido en
la fase 3; tener el inventario evita descubrirlos tarde.

**D4. `inventario_unidades` con 4 escritores no bloquea la fase 4.** Los cuatro
repositorios son del módulo inventario. Es una decisión interna, no una
violación de propiedad entre dominios.

**D5. `detalle_propinas` y `detalle_comisiones` sí bloquean.** Los escriben
`sale/SaleQueries` (ventas) y `PayrollRepository`/`TipRepository` (personal). El
plan exige un único propietario de comisiones y propinas aunque ventas origine
los movimientos. Esta es la primera contradicción real entre módulos que hay que
resolver. **Resuelta el 2026-10-04 — ver §8: el dueño será Personal.**

## 4. Riesgos

| #   | Riesgo                                                               | Evidencia                                                                                 | Mitigación                                                                                                                           |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Romper la atomicidad del cobro con venta                             | `AccountService.ts` con `withTransaction`; 32 archivos con transacción                    | Migrar el flujo de cobro **después** de tener contratos de inventario, caja y personal; prueba de atomicidad antes de tocarlo (§8)   |
| R2  | Regresión de rendimiento al encapsular                               | Inventario ya resolvió 12→1 peticiones; `perfilConsultas` ya mide consultas por respuesta | Usar la cabecera `x-lmr-consultas` como métrica antes y después de cada fase; no aceptar reemplazos de JOIN por llamadas encadenadas |
| R3  | Ciclos que se resuelven moviendo archivos                            | 6 ciclos, uno de 4 eslabones                                                              | La coordinación que genere ciclo sube a `workflows/`; nunca se rompe un ciclo dejando un import directo                              |
| R4  | Doble arranque de procesos biométricos en despliegue multi-instancia | `ipWatcher` y `recordPoller` con `setInterval` desde `instrumentation.ts`                 | Fase 3: una sola API de arranque con ciclo de vida; revisar el mecanismo actual antes de cambiarlo                                   |
| R5  | Regla de arquitectura que pasa por alto imports dinámicos o alias    | §7 lo exige explícitamente                                                                | La herramienta ya resuelve `import()` dinámico y alias `@/`; el test `analisis-arquitectura` fija ese comportamiento                 |
| R6  | Migración que rompa un contrato HTTP                                 | 204 rutas, 19 sin `withRoute`                                                             | El inventario de contratos es parte del diagnóstico; cada fase compara contra él                                                     |

## 5. Hallazgo que no es un problema de seguridad

19 rutas no usan `withRoute`. La mayoría es legítima: webhooks de WhatsApp, SSE,
imágenes, swagger y login. Pero las de aprobación por token
(`/api/ventas/procesar-anulacion`, `/api/gratificaciones/aprobar`,
`/api/servicios/procesar-anulacion`, `/api/cuentas/procesar-anulacion`) **no
usan `withRoute` porque la autorización es el token de la solicitud**, no la
sesión del usuario.

Es un patrón legítimo y además es un segundo mecanismo de autorización que la
migración tiene que preservar: si al mover esas rutas se aplica `withRoute` por
costumbre, se rompe el flujo de aprobación. Queda registrado como contrato, no
como incidencia.

## 6. Línea base de consultas por flujo (§7, Fase 0)

Medido con el instrumentado que usa la aplicación
(`lib/database/perfilConsultas`), que es el mismo que responde en
`x-lmr-consultas`, no una métrica paralela. Corre en
`tests/postgres/linea-base-flujos.test.ts` sobre `lasmunecasderamon_test`,
siembra sus propios datos y los restaura al terminar.

| Flujo                               | Consultas | SQL distintos | Consulta más lenta | Techo |
| ----------------------------------- | --------- | ------------- | ------------------ | ----- |
| horas extras: listar                | 1         | 1             | 7                  | 4     |
| horas extras: crear                 | 2         | 2             | 6                  | 5     |
| **cobro de cuenta con venta**       | **15**    | 14            | ~50                | 25    |
| inventario: consumo sin existencias | 2         | 2             | 2                  | 5     |
| anulación: solicitar                | 2         | 2             | 2                  | 5     |
| **anulación: aprobar parcial**      | **32**    | 26            | ~69                | 50    |
| biometría: evento que registra      | 6         | 6             | 2                  | 11    |
| biometría: evento duplicado         | 4         | 4             | 2                  | 8     |

La columna de milisegundos se retiró a propósito. La primera versión de esta
tabla publicaba 185 ms para el cobro, con 160 ms en una sola consulta, y era un
error de contabilidad: el perfil cronometraba `pool.query()`, que empaqueta
abrir conexión y ejecutar, así que el establecimiento de la primera conexión
contra PostgreSQL —50 a 157 ms medidos— se le endosaba a la consulta que
casualmente iba primera.

Lo que se comprobó fue que **no faltaba ningún índice**: `cajas` tiene 0 filas,
`EXPLAIN (ANALYZE)` la resuelve en **0,049 ms** y ya existe `idx_cajas_estado`
sobre la columna del `WHERE`. Un plan de 0,05 ms no pide índices. Los
milisegundos además no eran reproducibles —47, 154 y 50 ms en corridas
distintas—, cosa que un índice faltante nunca sería.

Ahora `conexionMs` viaja separado en `x-lmr-consultas` y la línea base calienta
el pool antes de medir, porque una línea base debe reflejar el estado estable y
no el arranque. Queda un residuo sin explicar: en el contexto del test esa única
ejecución sigue midiendo ~50 ms y no se reproduce aislada (aislada da 1,0–1,3
ms).

Dos cosas que conviene leer aquí:

- **El cobro de cuenta cuesta 15 consultas.** Ese número sí es sólido, y es el
  flujo que el §6 del plan declara atómico y que la Fase 5 partirá en varios
  módulos: si al encapsularlo las consultas se multiplican, el techo de 25 lo
  detecta. El techo va sobre el conteo, no sobre el tiempo, precisamente porque
  el conteo no se ve afectado por el ruido de arranque.
- **Horas extras cuesta 1 consulta al listar y 2 al crear.** Es el módulo piloto
  del §7 y, con diferencia, el más barato de mover: el patrón se puede replicar
  sin tanto riesgo.
- **La anulación parcial es, con 32 consultas, el flujo más caro con diferencia
  —el doble que el cobro de cuenta.** No es un error de diseño: es la
  consecuencia directa de la garantía que el §8 del plan le pide. Repone
  proporcionalmente el total, la propina, la comisión y el sub-total de la
  venta, ajusta los detalles de venta, comisiones, propinas y el pedido, y
  devuelve el saldo a caja. Cada una de esas tablas es un escritor distinto y el
  flujo no se puede partir sin decidir quién es el dueño de cada una. Medirlo
  era justo lo que faltaba: sin este número, cualquiera que tocara la anulación
  descubriría el costo en producción.
- **La biometría cuesta 6 consultas al registrar y 4 al repetir.** La diferencia
  entre ambas es el camino corto del duplicado: no inserta asistencia. Es la
  garantía de que un evento repetido no duplica marcas, y ahora su costo está
  medido y acotado, no supuesto.

El techo es un 50% sobre lo medido más dos consultas de margen: bastante para
detectar una degradación estructural —el fallo que importa al partir un flujo—
sin fallar por un milisegundo. Lo que decide es siempre la comparación antes y
después de una misma migración, no el número absoluto.

El informe detallado se regenera en cada corrida de la suite. Como los
milisegundos cambian siempre, ese archivo está ignorado a propósito
(`.gitignore`) y lo que se versiona es esta tabla y los techos, que viven en el
test.

## 7. Siguiente paso

Fase 1 — contratos y restricciones. Los límites propuestos están validados por
el diagnóstico; falta crear la estructura mínima de módulos, el contrato
transaccional y el control automático de dependencias. El piloto de Horas extras
(fase 2) espera a que ese control esté en pie.

## 8. D5 resuelta: dueño único de comisiones y propinas

Fecha: 2026-10-04. Resuelve la contradicción de D5 antes de la Fase 5, que es
donde se necesita: el cobro crea comisiones y propinas y la anulación las repone
proporcionalmente, ambos dentro de transacciones que ya no se pueden partir sin
decidir quién escribe cada tabla.

**Decisión: `comisiones`, `detalle_comisiones`, `propinas` y `detalle_propinas`
tendrán un único propietario — el módulo Personal.** Ventas y Operación, que hoy
originan la mayoría de los movimientos, dejarán de ejecutar SQL sobre esas
cuatro tablas en la Fase 5 y las crearán, ajustarán y revertirán mediante la API
pública de Personal, dentro de la misma unidad transaccional (§6 del plan).

### El censo que respalda la decisión

La herramienta del diagnóstico contaba 2 escritores para `detalle_comisiones`
porque sólo mira `lib/repositories/`; los servicios escriben directo. Censo
manual completo sobre el código de producción:

`detalle_comisiones` — 6 archivos escritores, 3 dominios:

| Archivo                                      | Dominio   | Qué escribe                                                 |
| -------------------------------------------- | --------- | ----------------------------------------------------------- |
| `lib/services/SaleService.ts`                | ventas    | INSERT batch al cobrar (`batchInsertCommissions`)           |
| `lib/repositories/sale/SaleQueries.ts`       | ventas    | UPDATE monto proporcional y estado = 0 en anulaciones       |
| `lib/services/ServiceService.ts`             | operación | INSERT al registrar servicio                                |
| `lib/repositories/service/ServiceQueries.ts` | operación | UPDATE estado = 0 al anular servicio                        |
| `lib/repositories/CommissionRepository.ts`   | personal  | INSERT (`createWithDetail`; sin llamador de producción hoy) |
| `lib/repositories/PayrollRepository.ts`      | personal  | UPDATE estado = 0 al liquidar nómina                        |

`detalle_propinas` — 3 archivos escritores, 2 dominios:

| Archivo                                 | Dominio  | Qué escribe                                                                            |
| --------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `lib/repositories/TipRepository.ts`     | personal | INSERT de la distribución — llamado por `TipService` **y por `SaleService` al cobrar** |
| `lib/repositories/sale/SaleQueries.ts`  | ventas   | UPDATE monto proporcional (parcial) y DELETE (total) en anulaciones                    |
| `lib/repositories/PayrollRepository.ts` | personal | UPDATE estado = 0 al liquidar nómina                                                   |

Las cabeceras `comisiones` y `propinas` las mueven las mismas manos, en las
mismas direcciones: se registran al originarse, se ajustan en la anulación y se
cierran al liquidar.

Lectores: nómina (`PayrollRepository`), reportes (`StatsQueries`,
`VentasStatsRepository`, `CommissionReportQueries`), agenda (`EventQueries`,
`CalendarRepository`), anticipos (`lib/business/anticiposUtils.ts`, SQL dentro
de business — deuda que migra en la Fase 6) y los propios ajustes de
ventas/servicios.

### Por qué Personal

1. **El §4 del plan ya lo asigna**: «Personal y liquidaciones — horas extras,
   anticipos, comisiones, propinas, gratificaciones y nómina». La decisión
   formaliza el mapa; no lo inventa.
2. **El ciclo de vida es de liquidación, no de venta**: el concepto nace cuando
   una venta o servicio lo origina, se ajusta cuando el negocio corrige, se
   liquida en nómina y alimenta los saldos que Personal reporta. El evento
   disparador es de ventas; el concepto pertenece al empleado.
3. **Ventas ya delega el alta de propinas a Personal**: `SaleService` llama a
   `TipRepository.register` (repositorio de Personal) cuando la venta trae
   propina. La incoherencia real son las comisiones, que sí se insertan con SQL
   directo; la decisión alinea a comisiones con lo que propinas ya hace.
4. **La liquidación concentra las invariantes más duras**: `PayrollRepository`
   cierra detalle y cabecera en cascada con `NOT EXISTS` — reglas de negocio de
   Personal que no deberían tener un segundo dueño.
5. **No abre ciclos**: `ventas → personal` y `operación → personal` son aristas
   nuevas acíclicas; Personal no importa a ninguno de los dos.

Y lo que no es el dueño:

- **Ventas**: obligaría a nómina, reportes y agenda a pedir a ventas los saldos
  de sus propios empleados — invierte la dependencia natural (Personal ya agrega
  por `venta_id`, no al revés) y partiría el ciclo de vida en dos módulos.
- **Caja**: mueve efectivo, no conceptos de liquidación; duplicaría con las
  propinas el debate que tiene el prepago.
- **Un módulo nuevo de liquidaciones**: el §4 lo agrupa en Personal; partirla
  por tablas en vez de por dominio multiplica APIs sin ganancia.

### Qué implica para la Fase 5

- `SaleService`, `SaleQueries`, `ServiceService` y `ServiceQueries` pierden el
  SQL sobre las cuatro tablas y llaman la API pública de Personal recibiendo un
  `ContextoOperacion` — el patrón del piloto de horas extras, ya probado con
  commit y rollback reales.
- La reposición proporcional de la anulación pasa a ser una operación de negocio
  de Personal invocada por el workflow de anulación; el techo de 32 consultas
  (50) de la línea base vigila que la delegación no multiplique consultas.
- Las lecturas de reportes y agenda quedan como lecturas cruzadas declaradas de
  sólo lectura (§6 las admite) o migran a consultas públicas cuando no produzcan
  N+1.
- `lib/business/anticiposUtils.ts` se reubica cuando migre anticipos (Fase 6).
- Se registra la propiedad en `docs/MODULOS_Y_DATOS.md`.

### Cuándo se reabre

Sólo si aparece un consumidor cuyo dominio deba escribir estas tablas y cuya
dependencia con Personal genere ciclo. En ese caso la coordinación sube a
`workflows/` (§5) y la propiedad no cambia: se cambia quién coordina, no quién
es dueño.
