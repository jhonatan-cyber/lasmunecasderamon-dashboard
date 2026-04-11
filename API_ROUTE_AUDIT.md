# API Route Audit

Fecha: 2026-04-11

## Estado actual

Auditoria cerrada para aliases legacy ya migrados.

Rutas canonicas vigentes:

- `/api/calendar/data`
- `/api/gratificaciones/me`
- `/api/attendance/user`
- `/api/commissions/[id]/details`

Rutas legacy retiradas del backend:

- `/api/calendar-data`
- `/api/mis-gratificaciones`
- `/api/asistencias/user`
- `/api/commissions/detalle/[id]`

## Verificacion aplicada antes del retiro

- Busqueda de referencias en web.
- Busqueda de referencias en movil.
- Actualizacion de consumidores a rutas canonicas.
- Limpieza de proteccion legacy en `proxy.ts`.
- Actualizacion de documentacion de seguimiento.

## Resultado

Se redujo duplicidad funcional y mezcla de naming espanol/ingles en puntos donde
ya existia ruta canonica estable.

Canonicas finales:

- Calendar data: `/api/calendar/data`
- Gratificaciones del usuario actual: `/api/gratificaciones/me`
- Asistencias por usuario: `/api/attendance/user`
- Detalle de comisiones: `/api/commissions/[id]/details`

## Pendiente

- Seguir revisando otras inconsistencias de naming base como `sales` vs
  `ventas`, `cashregister` vs `caja`, `servicios` vs dominios en ingles.
- Reducir superficie de cambios abiertos antes de refactors mas grandes.
