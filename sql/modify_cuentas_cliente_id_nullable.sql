-- Modificar la columna cliente_id en la tabla cuentas para permitir valores NULL
-- Esto permite crear cuentas sin cliente asignado

ALTER TABLE cuentas 
MODIFY COLUMN cliente_id INT NULL COMMENT 'ID del cliente (opcional)';

-- Verificar la modificación
DESCRIBE cuentas;