-- 038) Auditoría del backfill de gratificaciones.solicitante_id (037) ------------
-- Qué quedó atrás y qué decidimos:
--
-- La 037 agregó la columna pero NO rellenó datos: las filas anteriores quedaron
-- con solicitante_id NULL. Y rellenarlas sería inventar: la atribución real de
-- esas filas es irrecuperable en dos sentidos distintos:
--
--   1) Filas anteriores al flujo de solicitudes (introducido el 2026-04-20):
--      las creó un administrador a mano; nunca existió "solicitante".
--
--   2) Filas creadas POR el flujo con un admin delante: en el flujo del cajero
--      el beneficiario es el trabajador y el id de quien pidió se descartaba
--      (la posición 4 de request() era device_date). Quien apretó el botón pudo
--      ser un admin revisando la pantalla; la fila no conserva ese dato.
--
-- Decisión: NO fabricamos atribuciones. El GET muestra "—" para esas filas y el
-- modal omite el bloque: la ausencia es informativa ("no se sabe quién pidió
-- esto"), no un defecto de datos. Las filas nuevas sí quedan siempre atribuidas:
-- el POST del admin firma con su sesión (service.create) y el del cajero con
-- requestedBy (service.request).
--
-- Detectar si una fila histórica pudo ser creada por un admin (se ejecuta en
-- cada `db:migrate` sobre bases que aún no tienen la 038 y el NOTICE queda en
-- el log; después persiste en _postgres_migrations la constancia de corrida):
-- Las pistas son del entorno, no de la fila: al 2026-09-27 este despliegue es
-- mono-operación (un solo usuario con rol administrador), así que cualquier
-- creación directa fuera del flujo de solicitudes provino de ese admin. Con
-- varios admins esta consulta devolvería más filas que la trivial: igual solo
-- es un inventario para revisión humana, no repara nada.
DO $audit$
DECLARE
  pre_flujo     int;
  por_flujo     int;
  total_legacy  int;
  admins        int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'gratificaciones'
  ) THEN
    RAISE NOTICE '[038] tabla gratificaciones no existe: nada que auditar';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO admins
  FROM usuarios u
  JOIN roles r ON r.id_rol = u.rol_id
  WHERE LOWER(r.nombre) = 'administrador';

  SELECT COUNT(*) INTO total_legacy
  FROM gratificaciones WHERE solicitante_id IS NULL;

  -- Sin huella en antipo_historial: creación directa (admin u operador de la época).
  SELECT COUNT(*) INTO pre_flujo
  FROM gratificaciones g
  WHERE g.solicitante_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM anticipo_historial h
      WHERE h.anticipo_id = g.id AND h.accion = 'solicitud'
    );

  -- Con huella: pasó por el flujo de solicitudes, pero el solicitante se descartó.
  SELECT COUNT(*) INTO por_flujo
  FROM gratificaciones g
  WHERE g.solicitante_id IS NULL
    AND EXISTS (
      SELECT 1 FROM anticipo_historial h
      WHERE h.anticipo_id = g.id AND h.accion = 'solicitud'
    );

  IF total_legacy = 0 THEN
    RAISE NOTICE '[038] sin filas historicas sin solicitante: nada que auditar';
    RETURN;
  END IF;

  RAISE NOTICE '[038] auditoria del backfill de solicitante_id (037)';
  RAISE NOTICE '[038] administradores en la base: %', admins;
  IF admins <= 1 THEN
    RAISE NOTICE '[038] despliegue mono-admin: las % fila(s) de creacion directa fuera del flujo provienen del unico admin', pre_flujo;
  ELSE
    RAISE NOTICE '[038] multiples admins: revisar manualmente las % fila(s) de creacion directa', pre_flujo;
  END IF;
  RAISE NOTICE '[038] filas que pasaron por el flujo de solicitudes sin solicitante registrado: %', por_flujo;
  RAISE NOTICE '[038] total de filas sin solicitante: %', total_legacy;
  RAISE NOTICE '[038] decision: no se fabrica atribucion; las filas se muestran como sin solicitante';
END $audit$;
