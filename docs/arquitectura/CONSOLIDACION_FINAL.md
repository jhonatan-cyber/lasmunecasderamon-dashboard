# Consolidación del monolito modular

Fecha: 2026-10-05. Este documento describe el estado actual; los documentos de
fases anteriores conservan el historial de la migración.

## Límites y entradas

La aplicación conserva un único despliegue de Next.js y una base PostgreSQL. Los
dominios viven en `modules/`: Identidad, Inventario, Clientes, Operación,
Ventas, Caja, Personal, Asistencia, Agenda, Comunicaciones, Auditoría, Reportes
y Configuración. Salud proporciona la consulta técnica de disponibilidad.

Cada módulo ofrece una entrada de servidor `index.ts` y contratos seguros para
cliente `contracts.ts`. Los consumidores externos acceden a estas entradas; los
repositorios y adaptadores interiores son privados. Las rutas HTTP validan
autorización y entrada, y delegan los casos de uso. La UI usa HTTP y contratos.

La coordinación de cobro con venta, registro y anulaciones de ventas, prepago,
autenticación presencial, eliminación de usuarios y autorizaciones por WhatsApp
vive en `workflows/`. Un workflow consume APIs públicas y `ContextoOperacion`;
no recibe ni ejecuta SQL arbitrario. Los módulos no importan workflows.

Se retiraron los servicios y repositorios de dominio de `lib/services` y
`lib/repositories`. Los adaptadores heredados de transacciones y habitación
quedan exclusivamente como ayudas de pruebas que ejercitan las implementaciones
actuales. La infraestructura técnica compartida continúa en `lib/database`,
`lib/transaccion`, `lib/cache`, `lib/api` y utilidades puras.

## Propiedad de datos

El manifiesto [propietarios-tablas.json](./propietarios-tablas.json) asigna un
propietario a cada tabla de negocio. Las escrituras cruzadas se sustituyeron por
operaciones públicas del propietario, incluidos saldo prepago, cuentas PREP,
usuarios biométricos, sesiones, asistencias, ventas temporizadas, comisiones y
propinas.

Reportes, agenda y consultas operativas mantienen proyecciones SQL de lectura
entre tablas. Esa lectura no concede permiso para escribir datos del otro
dominio. Instrumentación de consultas, sincronización y mantenimiento explícito
de la base son infraestructura técnica global, identificada en el control; no
son casos de uso de negocio ni permisos de escritura para módulos externos.

La migración `060_push_tokens_propietario_comunicaciones.sql` copia los tokens
heredados a `push_tokens` sin sobrescribir tokens registrados ni alterar el dato
anterior. Comunicaciones registra, consulta y elimina tokens en su propia tabla.
La migración es aditiva y compatible con la reversión del código anterior.

## Transacciones y efectos

`enUnaUnidad` abre una transacción y entrega un contexto opaco a los
participantes. Sólo los archivos de infraestructura autorizados pueden
resolverlo al ejecutor PostgreSQL. Cobros, anulaciones, prepago y las
operaciones de varios propietarios comparten ese contexto.

La limpieza automática de temporizadores confirma ventas, servicios, sesiones de
cuentas, disponibilidad y habitaciones en una unidad. Los avisos SSE se publican
después de confirmar. Las pruebas de efectos comprueban también que un fallo del
commit no publica estados inexistentes.

## Configuración y controles

Las reglas de asistencia, inventario, ventas y comunicaciones viven en su
módulo. Configuración agrega esas definiciones mediante contratos puros; los
validadores genéricos se comparten sin dependencias de servidor. Defaults,
categorías, alias y validaciones del endpoint se conservan.

`pnpm arquitectura:limites` verifica imports privados, reexportaciones de
persistencia, UI y workflows sin driver, infraestructura transaccional
autorizada, propiedad de tablas y ausencia de ciclos de ejecución. El parser usa
el AST de TypeScript: los comentarios, imports sólo de tipos y rutas HTTP no
generan ciclos ficticios. Las excepciones registradas quedaron vacías.

El diagnóstico actual registra cero ciclos, cero escritores de negocio en tablas
ajenas y cero rutas HTTP con SQL directo. Estos controles estáticos no
sustituyen las pruebas de comportamiento.

El build usa `webpackBuildWorker` y `webpackMemoryOptimizations`, opciones
documentadas en la guía de memoria de Next.js instalada. Permiten liberar
memoria entre compilaciones de servidor y cliente. No cambian el despliegue
único de la aplicación.

## Validación

Las comprobaciones se realizan sobre el árbol de trabajo del 2026-10-05:

- `arquitectura:limites`: cero hallazgos y cero excepciones.
- Diagnóstico: cero ciclos, cero tablas con escritores de distintos dominios y
  cero rutas HTTP con SQL directo.
- TypeScript: sin errores con `tsconfig.typecheck.json` y sin caché incremental.
- Unitarias: 1.745 pruebas aprobadas en 185 archivos, con dos pruebas de
  hardware omitidas. La ejecución completa aprobó 1.736 pruebas y detectó un
  fixture de envases con un mock incompleto de zona horaria; tras corregirlo,
  las nueve pruebas de ese archivo aprobaron en una ejecución específica.
- ESLint completo: cero errores; un aviso previo por `console.info` en
  `instrumentation.ts`.
- PostgreSQL: suite completa de 23 archivos y 185 pruebas aprobadas; después del
  ajuste final del cron y la limpieza automática, las tres pruebas de
  temporizadores se repitieron y aprobaron.
- Efectos del cron: dos pruebas verifican contexto compartido y ausencia de
  SSE/push si falla el commit; las pruebas de limpieza automática comprueban la
  misma garantía.
- Build de producción: aprobado con `next build --webpack` y
  `NODE_OPTIONS=--max-old-space-size=6144`, incluida la comprobación completa de
  TypeScript, las 217 páginas y la generación del service worker con 502
  entradas de precaché.

Las pruebas de PostgreSQL se ejecutan sólo contra la base local autorizada y
restauran sus fixtures; los transportes externos están simulados. La migración
060 se aplicó localmente. Para otro entorno debe ejecutarse el runner habitual
de migraciones antes de desplegar el nuevo código.

Las verificaciones se ejecutaron secuencialmente: los primeros intentos
simultáneos agotaron la memoria disponible y no se cuentan como aprobados. No se
ejecutó la suite E2E de navegador ni se realizó un despliegue.
