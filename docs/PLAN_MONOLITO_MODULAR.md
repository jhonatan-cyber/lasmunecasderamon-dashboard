# Plan de consolidación como monolito modular

Fecha: 2026-10-03  
Estado: implementación en curso. Fases 1, 2 y 3 cerradas; la fase 4 tiene todo
el SQL de inventario dentro de `modules/inventario`, incluido el consumo y su
reversión por anulación, y le queda el dueño de productos y compras. Revisión
del 2026-10-05: las casillas de la fase 0 y de la fase 4 reflejan el avance
real.

## 1. Objetivo y alcance

Consolidar la aplicación como un monolito modular: una aplicación Next.js, un
despliegue y una base PostgreSQL, con módulos de negocio que controlan sus datos
y exponen contratos explícitos.

La migración será incremental. Debe conservar rutas, permisos, respuestas HTTP,
comportamiento de la interfaz y reglas de negocio. No contempla microservicios,
bases separadas, reescritura del sistema ni adopción obligatoria de un ORM o un
bus de mensajes.

## 2. Diagnóstico basado en el repositorio

El proyecto es actualmente un monolito por capas con modularidad parcial:

- `pnpm-workspace.yaml` declara únicamente el paquete raíz; `package.json`
  compila y arranca la aplicación completa.
- `.github/workflows/deploy.yml` despliega la aplicación Next.js como una
  unidad.
- `app/api`, `components` y `hooks` tienen agrupaciones funcionales;
  `lib/services` y `lib/repositories` agrupan por capa técnica.
- `lib/database/db.ts` centraliza PostgreSQL, el pool y las transacciones.
- Horas extras tiene un flujo reconocible: `app/api/overtime/route.ts` →
  `OvertimeService` → `OvertimeRepository`.
- `SaleService` depende directamente de repositorios de caja, inventario,
  clientes, comisiones y propinas; también ejecuta SQL sobre habitaciones y
  pedidos.
- `app/api/ventas/anulacion/route.ts` mezcla adaptación HTTP, consultas SQL y
  validaciones de negocio.
- `AccountService.cobrarConVenta` conserva una transacción compartida para
  cobrar y crear la venta. Este comportamiento es un requisito de la migración.
- `instrumentation.ts` inicia procesos biométricos dentro de la aplicación.
  Deben integrarse en los límites propuestos, sin duplicar su arranque.
- La configuración ESLint revisada no establece restricciones de dependencias
  entre módulos.

Estas observaciones son una muestra inicial, no un inventario completo de todas
las dependencias ni una certificación del estado actual de los tests.

## 3. Principios obligatorios

1. Cada tabla y regla de negocio tendrá un módulo propietario.
2. Un módulo accederá a otro mediante su API pública; no importará sus
   repositorios ni ejecutará escrituras sobre sus tablas.
3. Los controladores HTTP autenticarán, validarán el transporte, llamarán casos
   de uso y traducirán resultados. El SQL quedará en infraestructura.
4. Compartir PostgreSQL y una transacción es válido. No se fragmentarán
   operaciones que hoy requieren atomicidad.
5. Los contratos de frontend no dependerán de tipos de repositorios ni expondrán
   credenciales, clientes SQL o detalles de persistencia.
6. Los componentes compartidos contendrán infraestructura o UI reutilizable, no
   decisiones de negocio de varios dominios.
7. Las dependencias permitidas se comprobarán automáticamente. Las excepciones
   tendrán motivo, responsable y condición de eliminación.
8. Cada etapa debe dejar la aplicación desplegable; los cambios de
   comportamiento se separarán de los movimientos de arquitectura.

## 4. Mapa inicial de módulos

Los siguientes límites son una propuesta. Se validarán contra tablas, claves
foráneas, consultas y flujos en la fase 0, antes de mover código.

| Módulo                   | Responsabilidad y código actual candidato                                                              | Contratos públicos orientativos                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Identidad y acceso       | Auth, usuarios, roles y permisos                                                                       | Autenticar, consultar actor, verificar permisos                           |
| Catálogo e inventario    | Productos, categorías, presentaciones, compras, stock, transferencias, envases y disponibilidad de Bar | Consultar catálogo, ingresar stock, consumir y revertir existencias       |
| Clientes                 | Datos de clientes; límites con prepago por definir en fase 0                                           | Consultar cliente, actualizar datos                                       |
| Operación                | Pedidos, cuentas, servicios, habitaciones, temporizadores y solicitudes de servicio                    | Abrir cuenta, registrar consumo, preparar cobro, cambiar estado operativo |
| Ventas                   | Registro y anulación de ventas, cálculos y reglas comerciales                                          | Registrar venta, solicitar y procesar anulación                           |
| Caja                     | Cajas, movimientos de efectivo y retiros; evaluar aquí la propiedad del saldo prepago                  | Validar caja, registrar movimiento, revertir movimiento                   |
| Personal y liquidaciones | Horas extras, anticipos, comisiones, propinas, gratificaciones y nómina                                | Registrar concepto, consultar saldos, liquidar                            |
| Asistencia               | Marcas, ventana horaria, kioskos, identidad de equipos y recepción biométrica                          | Registrar marca, configurar ventana, vincular dispositivo                 |
| Agenda                   | Calendario y eventos                                                                                   | Consultar y gestionar eventos                                             |
| Comunicaciones           | Notificaciones, SSE, push y adaptadores de WhatsApp/Twilio                                             | Publicar aviso, enviar comunicación                                       |
| Auditoría                | Registro y consulta de auditoría                                                                       | Registrar evento auditable, consultar historial autorizado                |
| Reportes                 | Lecturas agregadas y proyecciones para dashboard e informes                                            | Consultar indicadores e informes                                          |

Decisiones que deben quedar documentadas:

- Bar puede seguir siendo una interfaz operativa de inventario y ventas; una
  pestaña no exige un módulo independiente.
- Comisiones y propinas necesitan un único propietario, aunque ventas origine
  los movimientos.
- El prepago no debe quedar con dos propietarios entre Clientes y Caja.
- `configurations` es una entrada HTTP compartida: cada módulo debe validar y
  administrar sus claves. Secretos e infraestructura pueden tener un
  almacenamiento técnico común.
- Las integraciones de biometría pertenecen al contexto de Asistencia; los
  avisos que generan se envían mediante Comunicaciones.
- El tamaño de Operación y Personal se revisará con evidencia de acoplamiento,
  antes de dividirlos en módulos más pequeños.

## 5. Estructura objetivo

Ejemplo orientativo para un módulo; no es necesario crear carpetas vacías ni
interfaces sin uso:

```text
modules/
  personal/
    index.ts                 # API pública de servidor
    contracts.ts             # DTO y esquemas aptos para consumidores
    application/             # Casos de uso, por ejemplo horas extras
    domain/                  # Reglas y tipos internos cuando aporten valor
    infrastructure/          # SQL y adaptadores propios
  inventario/
  ventas/
  ...
workflows/
  cobrar-cuenta.ts           # Coordinación de varios módulos
shared/
  server/                   # DB, transacciones, logging y configuración técnica
  contracts/                # Tipos realmente transversales
app/api/                    # Adaptadores HTTP de Next.js
components/                 # UI; puede conservar su organización actual
hooks/                      # Consumo de API y estado de interfaz
tests/
  architecture/             # Restricciones de dependencias
  unit/
  postgres/
  e2e/
```

No se moverá toda la infraestructura compartida al comenzar. `lib/database`
puede seguir en su ubicación actual durante la transición.

Reglas de dependencia:

- `app/api` puede consumir APIs públicas de módulos y workflows.
- Un workflow puede coordinar APIs públicas; los módulos no importan workflows.
- Entre módulos solo se permiten imports desde `index.ts` o `contracts.ts`, y
  únicamente en las direcciones aprobadas.
- La API de servidor debe quedar protegida con `server-only`; `contracts.ts` no
  reexportará implementaciones de servidor, ni siquiera indirectamente.
- UI y hooks consumen HTTP y contratos seguros para cliente. Los componentes de
  servidor autorizados pueden consumir APIs públicas de servidor.
- Dentro de cada módulo se permiten imports internos. El dominio no depende de
  Next.js, React ni del driver PostgreSQL.
- Los repositorios son privados. Una reexportación pública de un repositorio no
  se considera encapsulación.
- Las dependencias entre módulos deben formar un grafo sin ciclos. La
  coordinación que provoque ciclos se eleva a un workflow.

## 6. Datos, transacciones y efectos externos

### Propiedad de tablas

Crear `docs/MODULOS_Y_DATOS.md` con tabla, propietario, lectores externos
actuales, escritores actuales, claves foráneas y estrategia de migración.
Incluir tablas de unión, auditoría, configuración y operaciones de
sincronización.

- Mantener inicialmente tablas, nombres, claves foráneas y migraciones globales.
- Encapsular primero las escrituras. No introducir cambios físicos de esquema
  para simular separación.
- Reportes puede tener lecturas cruzadas explícitamente registradas y de solo
  lectura. Preferir consultas públicas o vistas cuando reduzcan acoplamiento sin
  producir N+1.
- No reemplazar un JOIN eficiente por muchas llamadas sin medir consultas y
  latencia.

### Transacciones compartidas

Preservar los casos atómicos, especialmente cobro de cuenta + venta + caja +
consumo de stock.

1. El workflow abre una sola unidad de trabajo.
2. Las APIs participantes reciben un contexto transaccional opaco.
3. Solo la infraestructura autorizada resuelve ese contexto al cliente
   PostgreSQL. El contrato no expone una función SQL arbitraria.
4. Todos los cambios usan la misma conexión; los participantes no abren
   transacciones independientes.
5. El workflow confirma una vez o revierte todo.
6. Notificaciones e invalidaciones que anuncian el resultado se ejecutan después
   del commit, nunca antes.

No convertir descuentos de stock o movimientos de caja en eventos asíncronos si
requieren consistencia inmediata. Si se necesita entrega garantizada de un
efecto externo, evaluar un outbox transaccional con reintentos e idempotencia;
no incorporarlo como requisito para migrar todos los módulos.

Una falla de envío posterior al commit no debe presentarse como un cobro fallido
ni provocar un duplicado al reintentar. Preservar las garantías existentes de
sincronización offline e idempotencia.

## 7. Fases de implementación

### Fase 0 — Inventario y línea base

- [ ] Registrar el estado de lint, tipos, build y suites existentes sobre un
      commit identificado. **Parcial:** lint, tipos y unitarias registrados
      sobre `532a780a` en
      [la línea base](arquitectura/FASE0_DECISIONES.md#1-línea-base). Falta
      completar la referencia de build, integración y E2E sobre un commit
      identificado. Las verificaciones posteriores de PostgreSQL y build del
      piloto no sustituyen la línea base previa a la migración.
- [x] Separar errores previos de regresiones introducidas por la migración.
- [x] Mapear imports entre servicios, repositorios y rutas; registrar SQL fuera
      de repositorios.
- [x] Identificar escrituras cruzadas, transacciones, cachés, listeners y
      procesos periódicos.
- [x] Documentar propiedad de datos y matriz de dependencias propuesta.
- [x] Enumerar contratos HTTP y permisos que deben permanecer estables.
- [x] Medir consultas y tiempos de flujos representativos con datos
      reproducibles. Diez flujos, siete corridas medidas y una descartada;
      fixtures restaurados, cuatro conexiones precalentadas, conteos estables y
      latencias con mediana/rango. Método y muestras en
      [la validación complementaria](arquitectura/FASE0_VALIDACION.md).

**Evidencia de las tareas completadas:**
[diagnóstico de imports, SQL, procesos y contratos HTTP](arquitectura/FASE0_DIAGNOSTICO.md),
[propiedad de datos](MODULOS_Y_DATOS.md) y
[decisiones, errores previos y riesgos](arquitectura/FASE0_DECISIONES.md). El
cierre de las verificaciones pendientes se registra en
[la validación complementaria](arquitectura/FASE0_VALIDACION.md).

**Salida:** diagnóstico verificable, decisiones pendientes resueltas para el
piloto y mapa de riesgos. No mover archivos antes de esta línea base.

### Fase 1 — Contratos y restricciones

- [x] Crear la estructura mínima de módulos y registrar las reglas de
      dependencia.
- [x] Definir el contrato transaccional y los efectos posteriores al commit.
- [x] Configurar restricciones de imports, acceso al driver y ciclos. Elegir
      herramienta según el repositorio, sin asumir que ESLint básico cubre todo.
- [x] Integrar un comando de arquitectura en CI; su nombre y herramienta se
      definirán al implementarlo.
- [x] Bloquear incumplimientos nuevos y establecer una lista explícita de
      excepciones heredadas.
- [x] Verificar que imports relativos, alias e imports dinámicos no eludan las
      restricciones.

**Salida:** una dependencia prohibida introducida deliberadamente hace fallar el
control; los módulos migrados tienen límites comprobables.

**Estado 2026-10-04:** implementada en alcance reducido; evidencia y las 26
excepciones heredadas en [FASE1_LIMITES.md](arquitectura/FASE1_LIMITES.md).

### Fase 2 — Piloto: Horas extras

- [x] Migrar `OvertimeService` y `OvertimeRepository` al contexto de Personal,
      manteniendo el caso de uso pequeño.
- [x] Exponer operaciones y DTO públicos sin filtrar tipos SQL.
- [x] Adaptar rutas de horas extras, incluidos consumidores alternativos, sin
      cambiar URL ni permisos.
- [x] Evaluar adaptadores temporales en las rutas antiguas de imports; no fueron
      necesarios porque todos los consumidores se migraron.
- [x] Migrar consumidores y tests; eliminar adaptadores una vez sin referencias.

**Salida:** funcionalidad equivalente, repositorio privado, cero imports
prohibidos y tests de permisos, validación y persistencia aprobados. Revisar el
patrón antes de replicarlo.

**Estado 2026-10-04:** Horas extras completada; anticipos es una primera réplica
del patrón, aún sin participación en una transacción ajena. Ver
[FASE2_PILOTO.md](arquitectura/FASE2_PILOTO.md).

### Fase 3 — Límites de identidad y Asistencia

- [x] Establecer contratos de identidad y permisos usados por los demás módulos.
- [x] Migrar ventana de asistencia, marcas, kioskos y equipos biométricos.
- [x] Centralizar el arranque de listeners, poller y vigilancia de IP mediante
      una API de servidor de Asistencia.
- [x] Preservar deduplicación de eventos y restricciones de horarios y
      dispositivos.
- [x] Evitar duplicar procesos al recargar módulos o desplegar varias
      instancias; revisar el mecanismo existente antes de cambiarlo.

**Salida:** permisos equivalentes, una ruta de registro de marcas consistente y
procesos con ciclo de vida definido.

**Estado 2026-10-04:** migración implementada. La recepción es idempotente por
proceso; las instancias que no deban escuchar deben desactivarse por
configuración. El build de producción usa Webpack porque el chunk de
instrumentation con Turbopack bloqueaba la carga del módulo. Build y arranque
`next start` comprobados; la verificación no incluye conexión a un equipo
físico. Detalle en [FASE3_ASISTENCIA.md](arquitectura/FASE3_ASISTENCIA.md).

### Fase 4 — Catálogo e inventario

- [ ] Encapsular productos, presentaciones, compras, transferencias y envases.
      **Parcial:** transferencias, presentaciones, unidades, envases y sus
      lecturas viven en el módulo y las seis clases heredadas de inventario se
      borraron; productos y compras siguen en la capa heredada, aunque ya
      escriban inventario a través de la API del módulo.
- [x] Exponer consumo y reversión de stock mediante operaciones de negocio, no
      actualizaciones genéricas. El consumo expone `consumirStockBar` con
      contexto opaco (corte 1) y la reversión expone `revertirStockAnulacion`,
      con la misma idempotencia por suma y la misma ejecución en la transacción
      de la anulación (corte 8). La migración 058 añade el vínculo venta ↔
      movimiento y la trazabilidad de unidades que hacía falta.
- [x] Migrar Bar a esas APIs y separar sus contratos de tipos de
      `InventoryRepository`.
- [x] Preservar capacidad de botellas, ml por shot, existencias, alertas y
      permisos de recepción.
- [ ] Preparar las operaciones transaccionales que necesitarán ventas y
      anulaciones. **Parcial:** existe el puente `conContextoOperacionExistente`
      para adaptar la transacción heredada; ventas, productos, compras y la
      anulación de ventas lo usan, y las tres aristas están anotadas con su
      condición de retiro (la de la anulación, cuando la transacción de ventas
      se migre al contexto opaco en la fase 5).

**Salida:** escrituras de inventario bajo un único propietario, con flujos de
compras, transferencias, shots y envases validados.

**Avance inicial 2026-10-04:** el consumo de stock de ventas pasa por la API
pública `modules/inventario` con contexto transaccional opaco y su SQL reside en
la infraestructura privada del módulo. **Corte 2:** las transferencias completas
(`traspasarAlBar`, aceptar, rechazar, listar) también viven en el módulo, las
rutas `/api/transfers*` y `ProductService` las consumen, `TransferQueries` se
borró y la UI importa los DTO de inventario desde `contracts.ts` (las 4
excepciones `ui-no-infraestructura` se eliminaron; quedan 22 vigentes).

**Corte 3:** el control de envases bar → almacén (verificar, confirmar
recepción, historial) vive en `modules/inventario/envases` y `EnvaseQueries` se
borró. **Corte 4:** presentaciones y unidades de catálogo (alta, edición,
generación de unidades, estados, stock) viven en
`modules/inventario/presentaciones` y `modules/inventario/unidades`;
`PresentacionQueries` y `UnidadQueries` se borraron y
`lib/repositories/inventory/` ya no tiene escrituras — ProductRepository y
PurchaseService usan el puente de contexto con 2 excepciones anotadas.

**Corte 5:** las últimas lecturas (stock del bar, resumen de shots, catálogo
para venta, movimientos) viven en `modules/inventario` y se borraron
`BarQueries`, `CatalogoQueries`, `MovimientoQueries` y la fachada
`InventoryRepository`. Todo el SQL de inventario —lecturas y escrituras— está
hoy en el módulo; `lib/repositories/inventory/` sólo conserva helpers y tipos
puros. **Corte 6:** el resumen de envases de la alerta también vive en el
módulo. **Corte 7:** las constantes de estado de unidad pasaron a
`modules/inventario/estados.ts` como vocabulario del dominio, y se verificó que
la UI ya no importa nada de la capa heredada (los DTO llegan desde
`contracts.ts`). Productos y compras siguen en la capa heredada, pero ya
escriben inventario a través de la API del módulo. **Corte 8:** anular una venta
devuelve el stock consumido (`revertirStockAnulacion`), con la migración 058 que
enlaza cada movimiento de venta con su venta y con las unidades que tocó. Es lo
único que faltaba para cerrar la casilla de consumir y revertir; queda decidir
el dueño de productos y compras. Alcance y siguientes cortes en
[FASE4_INVENTARIO.md](arquitectura/FASE4_INVENTARIO.md). El censo regenerado del
árbol actual está en [MODULOS_Y_DATOS.md](MODULOS_Y_DATOS.md).

### Fase 5 — Operación, ventas y caja

Esta fase depende de los contratos de inventario, identidad y conceptos de
liquidación necesarios para registrar ventas.

Antes de migrar el flujo comercial hay que cerrar en
[MODULOS_Y_DATOS.md](MODULOS_Y_DATOS.md) la propiedad del prepago y confirmar el
tratamiento de escrituras actuales sobre `asistencias` y `logins`. Comisiones y
propinas ya tienen propietario objetivo Personal, documentado en
[FASE0_DECISIONES.md](arquitectura/FASE0_DECISIONES.md).

- [ ] Extraer el SQL que sigue en rutas de ventas y en servicios que acceden a
      tablas ajenas.
- [ ] Definir los contratos de Caja, Clientes y Personal que consume el flujo
      comercial.
- [ ] Crear el workflow de cobro de cuenta sobre APIs públicas, preservando una
      transacción común.
- [ ] Migrar creación y anulación de ventas, pedidos, servicios y liberación de
      habitaciones.
- [ ] Validar que movimientos de caja, prepago, stock, comisiones y propinas no
      se duplican.
- [ ] Mantener el orden y las condiciones de notificaciones, auditoría e
      invalidación de caché.

**Salida:** fallos intermedios revierten todos los cambios; no existen
escrituras cruzadas fuera de los propietarios; reintentos no duplican
operaciones.

### Fase 6 — Resto de módulos y lecturas agregadas

- [ ] Completar anticipos, comisiones, propinas, gratificaciones y nómina.
- [ ] Migrar Agenda, Comunicaciones y Auditoría con contratos mínimos.
- [ ] Reubicar reglas de configuración en su propietario.
- [ ] Documentar y acotar las lecturas cruzadas de Reportes y dashboard.
- [ ] Revisar cachés y consultas agregadas para evitar regresiones de
      rendimiento.

**Salida:** todos los dominios inventariados tienen propietario; no aparecen
servicios compartidos que concentren nuevamente el negocio.

### Fase 7 — Retirada del código de transición

- [ ] Eliminar adaptadores, reexportaciones antiguas y accesos heredados ya sin
      consumidores.
- [ ] Vaciar o reducir `lib/services`, `lib/repositories` y `lib/business` según
      sus responsabilidades finales.
- [ ] Actualizar README, mapa de módulos y guía de contribución.
- [ ] Convertir las restricciones transitorias en obligatorias para todo el
      código de producción.
- [ ] Validar build, despliegue y flujos críticos con la estructura final.

**Salida:** API pública documentada por módulo, grafo sin ciclos y sin
excepciones de escritura cruzada. Las excepciones de lectura de Reportes
permanecen explícitas y revisables.

## 8. Validación y criterios de aceptación

Comandos existentes que deben ejecutarse según el alcance de cada cambio:

```sh
pnpm lint:full
pnpm typecheck
pnpm test:unit
pnpm test:postgres
pnpm test:integration:all
pnpm test:e2e
pnpm build
```

Las suites con PostgreSQL, Redis, autenticación o servidor requieren sus
servicios y configuración de pruebas. No ejecutarlas contra producción. Añadir
el control de arquitectura a CI cuando exista; no se da por implementado en este
documento.

Pruebas prioritarias:

| Flujo                         | Garantía que debe verificarse                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| Horas extras                  | Mismos permisos, validaciones, cálculos y persistencia                                  |
| Cobro de cuenta               | Cuenta y venta confirman juntas; un fallo revierte ambas y sus movimientos              |
| Inventario y shots            | Consumo exacto, reversión correcta y control de concurrencia                            |
| Anulaciones                   | Stock, caja, comisiones y propinas coherentes tras aprobar o rechazar                   |
| Offline y reintentos          | Una misma intención no produce cobros ni consumos duplicados                            |
| Biometría y kioskos           | Eventos duplicados no duplican marcas; se respetan ventana y autorización               |
| Efectos posteriores al commit | Sin notificaciones de operaciones revertidas; un fallo externo no duplica el negocio    |
| Reportes y caché              | Mismos totales y visibilidad tras escrituras; sin incremento injustificado de consultas |

Cada PR debe demostrar: contrato conservado, ausencia de ciclos nuevos, pruebas
apropiadas aprobadas y desviaciones de rendimiento explicadas respecto a la
línea base. El movimiento de archivos por sí solo no demuestra modularidad.

## 9. Entrega, reversión y seguimiento

- Trabajar en PR pequeños por caso de uso o módulo. Separar cambios funcionales
  y cambios de esquema de los movimientos estructurales.
- Al mover código, mantener una sola implementación y adaptar imports antiguos
  hacia la nueva. No mantener dos rutas de escritura activas.
- Registrar por PR archivos migrados, consumidores pendientes, pruebas
  ejecutadas y excepciones eliminadas.
- Revertir código al último commit desplegable si una migración estructural
  falla. Si hay cambios de datos, definir compatibilidad de esquema antes del
  despliegue; no asumir que un rollback de código revierte datos.
- No borrar migraciones aplicadas ni alterar históricos durante esta
  consolidación.
- Definir responsables y estimaciones tras la fase 0; este documento no fija
  fechas sin medir el alcance.

Indicadores de avance:

1. Módulos con API pública y propietario de datos documentados.
2. Imports privados entre módulos y ciclos: objetivo cero.
3. SQL en controladores HTTP y escrituras en tablas ajenas: objetivo cero.
4. Excepciones heredadas y adaptadores pendientes: reducción por fase.
5. Flujos críticos con pruebas de atomicidad e idempotencia.
6. Latencia y número de consultas comparables con la línea base.

## 10. Primer bloque de trabajo

Empezar por la fase 0 y el piloto de Horas extras. El primer resultado
implementable será su límite modular, con rutas compatibles y controles de
arquitectura funcionando. Solo después se extenderá el patrón a los flujos de
mayor acoplamiento.
