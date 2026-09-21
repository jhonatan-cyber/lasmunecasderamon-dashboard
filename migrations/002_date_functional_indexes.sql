-- Performance: functional indexes for DATE() queries (sargable)
-- Estas queries usan WHERE DATE(fecha_crea) BETWEEN ? AND ? que no usa índice B-tree normal
-- Los índices funcionales permiten que el planner use el índice aun con DATE()
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_crea_date ON ventas ((fecha_crea::date));
CREATE INDEX IF NOT EXISTS idx_servicios_fecha_crea_date ON servicios ((fecha_crea::date));
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha_date ON asistencias ((fecha::date));
CREATE INDEX IF NOT EXISTS idx_anticipos_fecha_crea_date ON anticipos ((fecha_crea::date));
CREATE INDEX IF NOT EXISTS idx_logins_last_login_date ON logins ((last_login::date));
CREATE INDEX IF NOT EXISTS idx_horas_extras_fecha_crea_date ON horas_extras ((fecha_crea::date));
CREATE INDEX IF NOT EXISTS idx_propinas_fecha_crea_date ON propinas ((fecha_crea::date));
