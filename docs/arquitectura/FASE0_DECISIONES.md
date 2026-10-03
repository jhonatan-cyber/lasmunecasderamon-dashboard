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
resolver.

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

## 6. Lo que falta para dar Fase 0 por cerrada

El plan pide medir consultas y tiempos de flujos representativos con datos
reproducibles (§7, Fase 0). La infraestructura está: `perfilConsultas` expone
`x-lmr-consultas` y `?perfil=1` reinicia la cuenta. **Falta la medición en sí**,
que necesita `lasmunecas_test` con las migraciones al día. Depende de arreglar
la base de pruebas.

## 7. Siguiente paso

Fase 1 — contratos y restricciones. Los límites propuestos están validados por
el diagnóstico; falta crear la estructura mínima de módulos, el contrato
transaccional y el control automático de dependencias. El piloto de Horas extras
(fase 2) espera a que ese control esté en pie.
