-- Datos de prueba para el módulo de propinas
-- Este script inserta datos de prueba para demostrar la funcionalidad

-- Insertar propinas adicionales
INSERT INTO propinas (venta_id, propina, fecha_crea, estado) VALUES
(6, 3000, '2025-07-14 23:15:30', 1),
(7, 1800, '2025-07-14 21:45:12', 1),
(8, 2200, '2025-07-14 20:30:45', 1),
(9, 1500, '2025-07-14 19:20:18', 1),
(10, 900, '2025-07-14 18:10:30', 1),
(11, 4000, '2025-07-13 22:45:15', 0),
(12, 2500, '2025-07-13 21:30:20', 0),
(13, 1200, '2025-07-13 20:15:45', 0),
(14, 800, '2025-07-13 19:00:10', 0),
(15, 3500, '2025-07-12 23:30:25', 0);

-- Insertar detalles de propinas para diferentes usuarios
INSERT INTO detalle_propinas (propina_id, usuario_id, monto, fecha_crea, estado) VALUES
-- Usuario 1 (Pedro Sanchez) - Total: 6100
(6, 1, 3000, '2025-07-14 23:15:30', 1),
(7, 1, 1800, '2025-07-14 21:45:12', 1),
(8, 1, 1300, '2025-07-14 20:30:45', 1),

-- Usuario 2 (María González) - Total: 4200
(9, 2, 1500, '2025-07-14 19:20:18', 1),
(10, 2, 900, '2025-07-14 18:10:30', 1),
(11, 2, 1800, '2025-07-13 22:45:15', 0),

-- Usuario 3 (Carlos Rodríguez) - Total: 3800
(12, 3, 2500, '2025-07-13 21:30:20', 0),
(13, 3, 1300, '2025-07-13 20:15:45', 0),

-- Usuario 4 (Ana López) - Total: 2900
(14, 4, 800, '2025-07-13 19:00:10', 0),
(15, 4, 2100, '2025-07-12 23:30:25', 0),

-- Usuario 5 (Luis Martínez) - Total: 2100
(8, 5, 900, '2025-07-14 20:30:45', 1),
(13, 5, 1200, '2025-07-13 20:15:45', 0);

-- Actualizar algunos registros para mostrar diferentes estados
UPDATE propinas SET estado = 0 WHERE id_propina IN (4, 5, 11, 12, 13, 14, 15);
UPDATE detalle_propinas SET estado = 0 WHERE propina_id IN (4, 5, 11, 12, 13, 14, 15);