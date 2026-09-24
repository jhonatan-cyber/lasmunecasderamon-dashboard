-- 029) índices para listados de auditoría y errores -----------------------------
-- Ambos listados ordenan por fecha descendente sin índice (seq scan).
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_fecha_crea ON error_logs (fecha_crea DESC);
