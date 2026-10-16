# Verificación del dashboard en navegador — 16/10/2026

## Entorno y alcance

Chrome real automatizado con Playwright, aplicación de producción en
`127.0.0.1:3105`, base PostgreSQL exclusiva de QA. Los registros comerciales,
usuarios y movimientos creados durante esta revisión pertenecen a esa base. No
se probaron equipos biométricos, impresoras físicas ni envíos externos de
mensajes.

Se revisaron 41 rutas como administrador en 1440 y 390 píxeles (82
comprobaciones), y otras 50 comprobaciones con anfitriona, garzón, cajero y
barman. Se capturaron pantallas, excepciones JavaScript, errores de consola,
respuestas HTTP fallidas y dimensiones del documento. Estas 132 comprobaciones
no registraron incidencias después de las correcciones de esta revisión. Esto
verifica los recorridos ejecutados; no constituye una garantía sobre todas las
combinaciones posibles de datos y permisos.

## Cobertura por módulo

| Módulo                            | Pruebas realizadas                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Acceso y navegación               | Inicio de sesión, rutas por perfil, escritorio/móvil, cambio de tema                                                       |
| Dashboard y reportes              | Carga de páginas, gráficos, estados vacíos y adaptación móvil                                                              |
| Pedidos y ventas                  | Selección de presentación del bar, precio, carrito, pago efectivo, creación y listado                                      |
| Privados                          | Habitación, anfitriona disponible, producto incluido, confirmación y creación                                              |
| Cuentas                           | Creación, ampliación y cobro efectivo desde móvil; persistencia de dos botellas a $5.000 y total $10.000                   |
| Caja                              | Apertura, retiro, detalle y formularios móviles                                                                            |
| Bodega y categorías               | Alta de categoría y producto con presentación, precio de compra y stock                                                    |
| Compras                           | Creación, proveedor, cantidades y comprobante de códigos en pantalla                                                       |
| Transferencias y bar              | Solicitud de transferencia y recepción con un usuario barman                                                               |
| Limpieza                          | Alta de artículo, ingreso, transferencia y aceptación de recepción                                                         |
| Clientes                          | Alta, búsqueda, exportación Excel y formulario móvil                                                                       |
| Usuarios                          | Validación de campos obligatorios y formulario móvil                                                                       |
| Roles                             | Creación, edición, desactivación, activación y eliminación desde el navegador; regresiones de protección del administrador |
| Asistencia                        | Registro masivo de presencia de trabajadores de prueba                                                                     |
| Personal                          | Creación de hora extra y solicitud de anticipo; carga de propinas, comisiones, gratificaciones y nómina                    |
| Devoluciones y envases            | Carga de listados, filtros visibles, estados vacíos y adaptación móvil                                                     |
| Configuración, perfil y auditoría | Carga de páginas y adaptación móvil; selector del perfil                                                                   |
| Notificaciones                    | Historial real, marcar como leído y persistencia después de recargar                                                       |
| Ayuda                             | Búsqueda, apertura de preguntas y navegación por enlaces internos                                                          |

## Errores adicionales encontrados y corregidos

1. CSP: la compilación dinámica de Zod generaba errores de política de seguridad
   en el cliente. Se desactivó su JIT en la inicialización del cliente.
2. Inicio de sesión: texto «Bien venido» corregido a «Bienvenido».
3. Perfil: selector de usuario desbordado en móvil; ahora se adapta al ancho
   disponible.
4. Notificaciones: la página mostraba registros ficticios y acciones sin
   persistencia. Se conectó al historial real y se agregó marcado de lectura
   limitado al destinatario.
5. Ayuda: enlaces y contactos ficticios reemplazados por navegación real e
   instrucciones útiles.
6. Instrumentación: el arranque biométrico podía incorporarse al runtime Edge
   durante desarrollo. Se limitó explícitamente al runtime Node.
7. Registro de operaciones: reconstruir un `Request` con otro constructor de
   runtime provocaba errores 500 en operaciones POST de producción. Se conserva
   el cuerpo mediante `clone()` y se aíslan sus cabeceras.
8. Roles: el formulario enviaba campos distintos a los persistidos, la edición
   apuntaba a una ruta sin PUT y activar/desactivar intentaba leer JSON
   inexistente. Se normalizaron los campos, se corrigió la ruta y se separaron
   los cambios de estado. Se protege el rol administrador y los roles con
   usuarios asignados.
9. Cuentas: se usaba el catálogo general con precio cero en lugar del catálogo
   del bar. Se reutiliza el selector de venta y se preservan presentación,
   formato, consumo, precio, cantidad, comisión y anfitrionas, evitando fusionar
   líneas distintas.

## Evidencia reproducible

Scripts en `tests/e2e/browser-review.cjs`, `browser-review-actions.cjs` y
`browser-review-inspect.cjs`. Exigen un estado de conexión a una base cuyo
nombre empiece por `qa_browser_`; las credenciales y sesiones se mantienen fuera
del repositorio.

Capturas y resultados locales: `D:/DEV/lasmunecasderamon/_tmp/browser-review/`.
`results.json` contiene las 82 comprobaciones de administrador; las carpetas
`role-*` contienen las otras 50. `actions.json` registra los flujos operativos y
sus resultados. Los archivos `auth.json` contienen sesiones privadas y no deben
publicarse.

## Resultado final

La compilación completa de producción terminó correctamente: 234 páginas
generadas y 536 entradas del service worker. El chequeo de tipos pasó y ESLint
terminó sin errores (una advertencia por el `console.log` de instrumentación).

Los 34 escenarios operativos registrados en `actions.json` pasaron, incluyendo
los ciclos completos de Roles y Cuentas. Se repitieron siete pantallas
modificadas en escritorio y móvil sobre la compilación final: otras 14
comprobaciones sin errores de JavaScript, consola, HTTP ni desbordamientos
horizontales. Total: 146 comprobaciones de páginas, además de los escenarios
operativos.

En móvil, el panel flotante de temporizadores puede cubrir controles del
contenido; las pruebas operativas usan su botón existente «Ocultar
temporizadores» antes de continuar. Se verificó esta interacción mediante
controles visibles, sin forzar clics a través del panel.

Las 44 pruebas de regresión específicas pasaron en una ejecución final de cinco
archivos con un solo trabajador. Cubren el registro POST y su cuerpo/cabeceras,
la lectura de notificaciones limitada al destinatario, el contrato y ciclo de
Roles, y los datos de inventario y precios de Cuentas. Evidencia de compilación:
`D:/DEV/lasmunecasderamon/_tmp/browser-review-build-complete.log`; pruebas
unitarias: `browser-review-unit-final.log`; repetición de flujos:
`browser-review-final-flows-repeat.log`; repaso final de pantallas:
`browser-review-final-scan.log`.

Se detuvo el servidor de QA y se restauró el servidor original de desarrollo en
el puerto 3000, con su configuración habitual. `GET /login` respondió HTTP 200.
Al arrancar esa configuración, la conexión al equipo biométrico informó
`DeviceConnectionError` y reintentos; la integración física queda pendiente de
comprobar con el equipo disponible. No se presenta esa integración como validada
por las pruebas del dashboard.
