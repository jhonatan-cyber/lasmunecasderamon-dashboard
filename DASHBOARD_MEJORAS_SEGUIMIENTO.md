# Dashboard: Mejoras y Seguimiento

## Objetivo

Convertir el módulo `dashboard` en un centro de control más útil para operación,
supervisión y toma de decisiones, priorizando mejoras de alto impacto con
implementación incremental.

## Estado General

- Fecha de creación: 2026-05-06
- Responsable: Codex
- Estado global: Realizado

## Criterios de Éxito

- El dashboard debe responder rápidamente qué está pasando ahora.
- Debe mostrar prioridades operativas antes que métricas decorativas.
- Debe reducir clics hacia acciones frecuentes.
- Debe servir mejor según el rol del usuario.
- Debe permitir seguimiento claro del avance técnico.

## Prioridades

### Fase 1: Alto impacto / Bajo esfuerzo

#### 1. Alertas operativas

- Prioridad: Alta
- Estado: Realizado
- Impacto: Alto
- Esfuerzo: Bajo
- Objetivo: Mostrar incidencias o pendientes críticos en la parte superior del
  dashboard.
- Alcance:
  - Caja abierta
  - Pedidos pendientes
  - Servicios por vencer
  - Habitaciones ocupadas
  - Devoluciones pendientes
- Entregables:
  - Componente visual de alertas
  - Estados vacíos y loading
  - Links directos a resolución
- Criterio de aceptación: El usuario puede identificar y abrir cualquier
  pendiente crítica desde el dashboard.
- Checklist:
  - [x] Definir fuentes de datos
  - [x] Diseñar componente de alertas
  - [x] Implementar loading/skeleton
  - [x] Agregar accesos directos
  - [x] Validar con datos reales

#### 2. Reorganización de KPIs

- Prioridad: Alta
- Estado: Realizado
- Impacto: Alto
- Esfuerzo: Bajo
- Objetivo: Agrupar los indicadores en bloques más comprensibles.
- Alcance:
  - Ventas
  - Operación
  - Personal
- Entregables:
  - Nueva jerarquía visual
  - Tarjetas con agrupación consistente
- Criterio de aceptación: Un usuario nuevo entiende la estructura del dashboard
  en menos de 10 segundos.
- Checklist:
  - [x] Inventariar KPIs actuales
  - [x] Definir agrupación final
  - [x] Reordenar layout
  - [x] Revisar responsive

#### 3. Comparativas simples en métricas

- Prioridad: Alta
- Estado: Realizado
- Impacto: Alto
- Esfuerzo: Bajo
- Objetivo: Añadir contexto a los números usando comparativas.
- Alcance:
  - Hoy vs ayer
  - Semana actual vs anterior
  - Tendencia positiva/negativa
- Entregables:
  - Variación porcentual o absoluta en tarjetas
  - Indicadores visuales de tendencia
- Criterio de aceptación: Ningún KPI principal se muestra sin contexto
  comparativo.
- Checklist:
  - [x] Definir comparativas por tarjeta
  - [x] Implementar cálculo
  - [x] Añadir iconografía/estados
  - [x] Validar consistencia numérica

#### 4. Acciones rápidas

- Prioridad: Alta
- Estado: Realizado
- Impacto: Alto
- Esfuerzo: Bajo
- Objetivo: Reducir navegación hacia tareas frecuentes.
- Alcance:
  - Nueva venta
  - Pedidos
  - Cuentas
  - Caja
  - Privados
- Entregables:
  - Bloque de shortcuts
  - Accesos según permisos/rol
- Criterio de aceptación: Las 5 acciones más usadas están disponibles desde el
  dashboard.
- Checklist:
  - [x] Definir acciones prioritarias
  - [x] Validar permisos
  - [x] Implementar bloque visual
  - [x] Verificar mobile

#### 5. Pendientes accionables

- Prioridad: Alta
- Estado: Realizado
- Impacto: Alto
- Esfuerzo: Medio
- Objetivo: Mostrar listas breves de elementos pendientes con acceso directo.
- Alcance:
  - Pedidos
  - Solicitudes
  - Anulaciones
  - Revisiones operativas
- Entregables:
  - Listado resumido
  - Estado vacío
  - CTA por fila
- Criterio de aceptación: El usuario puede resolver pendientes sin ir a buscar
  el módulo manualmente.
- Checklist:
  - [x] Definir datasets
  - [x] Diseñar lista resumida
  - [x] Implementar links de resolución
  - [x] Validar orden y prioridad

### Fase 2: Alto impacto / Esfuerzo medio

#### 6. Dashboard por rol

- Prioridad: Alta
- Estado: Realizado
- Impacto: Alto
- Esfuerzo: Medio
- Objetivo: Adaptar el contenido según el rol del usuario.
- Alcance:
  - Administrador
  - Cajero
  - Operación
- Entregables:
  - Configuración por rol
  - Vistas diferenciadas o bloques condicionales
- Criterio de aceptación: Cada rol ve primero la información más útil para su
  trabajo.
- Checklist:
  - [x] Definir reglas por rol
  - [x] Mapear widgets por rol
  - [x] Implementar condicionales
  - [x] Validar permisos y UX

#### 7. Actividad en tiempo real

- Prioridad: Media
- Estado: Realizado
- Impacto: Alto
- Esfuerzo: Medio
- Objetivo: Mostrar un feed reciente de eventos importantes.
- Alcance:
  - Ventas
  - Pedidos
  - Cierres
  - Anulaciones
  - Inicio/fin de servicios
- Entregables:
  - Timeline o feed
  - Refresh o actualización en vivo
- Criterio de aceptación: El dashboard refleja actividad reciente sin salir a
  otros módulos.
- Checklist:
  - [x] Definir eventos visibles
  - [x] Definir fuente de datos
  - [x] Implementar componente
  - [x] Validar rendimiento

#### 8. Estado general del local

- Prioridad: Media
- Estado: Realizado
- Impacto: Alto
- Esfuerzo: Medio
- Objetivo: Dar visibilidad rápida del estado operativo.
- Alcance:
  - Habitaciones libres/ocupadas
  - Servicios activos
  - Pedidos abiertos
  - Personal en turno
- Entregables:
  - Widget resumen operativo
- Criterio de aceptación: El usuario entiende el estado del local con una sola
  mirada.
- Checklist:
  - [x] Identificar indicadores
  - [x] Crear modelo visual
  - [x] Integrar con datos en vivo

### Fase 3: Valor adicional

#### 9. Rankings y top performers

- Prioridad: Media
- Estado: Realizado
- Impacto: Medio
- Esfuerzo: Medio
- Objetivo: Mostrar rendimiento resumido de productos, habitaciones o personal.
- Checklist:
  - [x] Definir rankings prioritarios
  - [x] Crear visualización
  - [x] Validar utilidad real

#### 10. Resumen financiero del día

- Prioridad: Media
- Estado: Realizado
- Impacto: Medio
- Esfuerzo: Medio
- Objetivo: Consolidar ventas, caja, retiros, anticipos y propinas en un bloque
  ejecutivo.
- Checklist:
  - [x] Definir métricas
  - [x] Validar consistencia
  - [x] Diseñar visualización

#### 11. Forecast y anomalías

- Prioridad: Baja
- Estado: Realizado
- Impacto: Alto
- Esfuerzo: Alto
- Objetivo: Proyectar cierre del día y detectar comportamientos fuera de lo
  normal.
- Checklist:
  - [x] Definir fórmula inicial
  - [x] Identificar anomalías útiles
  - [x] Evaluar viabilidad técnica

## Orden Recomendado de Implementación

1. Alertas operativas
2. Reorganización de KPIs
3. Acciones rápidas
4. Pendientes accionables
5. Comparativas simples
6. Dashboard por rol
7. Actividad en tiempo real
8. Estado general del local

## Seguimiento

### Bitácora

- 2026-05-06: Documento inicial creado con backlog priorizado.
- 2026-05-06: Tarea `Alertas operativas` implementada en dashboard con endpoint,
  hook, componente visual y accesos directos a caja, pedidos, solicitudes y
  servicios.
- 2026-05-06: Tarea `Reorganización de KPIs` implementada con nueva sección
  agrupada y sin duplicar urgencias operativas.
- 2026-05-06: Tarea `Acciones rápidas` implementada con shortcuts del día a día
  ligados a permisos reales y estado de caja.
- 2026-05-06: Tarea `Pendientes accionables` implementada con listas resumidas
  de pedidos y solicitudes, más acceso directo al módulo de resolución.
- 2026-05-06: Tarea `Comparativas simples en métricas` implementada en los KPIs
  con tendencias vs ayer y contexto semanal para que los números principales no
  aparezcan aislados.
- 2026-05-06: Tarea `Dashboard por rol` implementada con composiciones
  diferenciadas para administrador y cajero, priorizando foco ejecutivo y flujo
  operativo según uso real.
- 2026-05-06: Tarea `Actividad en tiempo real` implementada con feed reciente de
  ventas, servicios, pedidos y logins, con refresco periódico.
- 2026-05-06: Tarea `Estado general del local` implementada con widget de
  capacidad, servicios activos, pedidos abiertos, cobertura del equipo y caja.
- 2026-05-06: Tarea `Rankings y top performers` implementada con bloques de
  productos, habitaciones y personal destacados del día.
- 2026-05-06: Tarea `Resumen financiero del día` implementada con consolidado de
  ventas, servicios, propinas, anticipos, retiros, devoluciones y neto estimado.
- 2026-05-06: Tarea `Forecast y anomalías` implementada con proyección simple de
  cierre diario y señales automáticas de desvíos operativos o comerciales.

### Bloqueos

- Ninguno por ahora.

### Decisiones

- Empezar por mejoras visibles de alto impacto antes de cambios grandes de
  arquitectura.
- Favorecer mejoras compatibles con permisos y roles existentes.
- Consolidar los nuevos widgets sobre un endpoint común de insights para
  mantener consistencia de datos y menor duplicación.

## Notas Técnicas

- Revisar `app/dashboard/page.tsx` y componentes asociados antes de dividir el
  trabajo.
- Reutilizar hooks o APIs existentes cuando sea posible.
- Priorizar una estructura modular para permitir widgets por rol.
- Validar cada fase en desktop y mobile.
