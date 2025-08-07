-- Esquema de base de datos para el módulo de asistencias

-- Tabla de asistencias
CREATE TABLE IF NOT EXISTS asistencias (
  id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  fecha DATE NOT NULL,
  hora_entrada TIME,
  hora_salida TIME,
  estado ENUM('presente', 'tardanza', 'ausente', 'medio_dia', 'salida_temprana') DEFAULT 'presente',
  observaciones TEXT,
  fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_mod TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  UNIQUE KEY unique_usuario_fecha (usuario_id, fecha)
);

-- Tabla de logins (sesiones de usuarios)
CREATE TABLE IF NOT EXISTS logins (
  id_login INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  fecha_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_logout TIMESTAMP NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  estado ENUM('activo', 'cerrado', 'expirado') DEFAULT 'activo',
  token_session VARCHAR(255),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- Tabla de códigos de verificación
CREATE TABLE IF NOT EXISTS codigos (
  id_codigo INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(4) NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT TRUE,
  fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion TIMESTAMP NULL,
  usado BOOLEAN DEFAULT FALSE
);

-- Índices para optimizar consultas
CREATE INDEX idx_asistencias_usuario_fecha ON asistencias(usuario_id, fecha);
CREATE INDEX idx_asistencias_fecha ON asistencias(fecha);
CREATE INDEX idx_asistencias_estado ON asistencias(estado);

CREATE INDEX idx_logins_usuario ON logins(usuario_id);
CREATE INDEX idx_logins_fecha ON logins(fecha_login);
CREATE INDEX idx_logins_estado ON logins(estado);
CREATE INDEX idx_logins_token ON logins(token_session);

CREATE INDEX idx_codigos_codigo ON codigos(codigo);
CREATE INDEX idx_codigos_activo ON codigos(activo);

-- Insertar códigos de verificación por defecto
INSERT IGNORE INTO codigos (codigo) VALUES 
('1234'),
('5678'),
('9012'),
('3456'),
('7890');

-- Procedimiento almacenado para registrar asistencia
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS RegistrarAsistencia(
  IN p_usuario_id INT,
  IN p_hora_entrada TIME,
  IN p_estado VARCHAR(20)
)
BEGIN
  DECLARE v_fecha DATE DEFAULT CURDATE();
  DECLARE v_hora_limite TIME DEFAULT '20:00:00';
  DECLARE v_hora_tardanza TIME DEFAULT '23:00:00';
  
  -- Verificar si ya existe una asistencia para hoy
  IF NOT EXISTS (SELECT 1 FROM asistencias WHERE usuario_id = p_usuario_id AND fecha = v_fecha) THEN
    -- Determinar el estado basado en la hora
    SET p_estado = CASE 
      WHEN p_hora_entrada <= v_hora_limite THEN 'presente'
      WHEN p_hora_entrada <= v_hora_tardanza THEN 'tardanza'
      ELSE 'ausente'
    END;
    
    -- Insertar asistencia
    INSERT INTO asistencias (usuario_id, fecha, hora_entrada, estado)
    VALUES (p_usuario_id, v_fecha, p_hora_entrada, p_estado);
  END IF;
END //
DELIMITER ;

-- Procedimiento almacenado para cerrar sesiones al cerrar caja
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS CerrarSesionesUsuarios()
BEGIN
  UPDATE logins 
  SET estado = 'cerrado', fecha_logout = NOW() 
  WHERE estado = 'activo';
END //
DELIMITER ; 