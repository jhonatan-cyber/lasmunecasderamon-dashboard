import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }

  try {
    // Crear tabla de roles
    await query(`
      CREATE TABLE IF NOT EXISTS roles (
        id_rol INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        estado TINYINT DEFAULT 1 COMMENT '1: Activo, 0: Inactivo',
        fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_mod TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        fecha_baja TIMESTAMP NULL,
        INDEX idx_estado (estado),
        INDEX idx_nombre (nombre)
      )
    `);

    // Insertar roles básicos
    await query(`
      INSERT IGNORE INTO roles (nombre, descripcion, estado) VALUES
      ('Administrador', 'Acceso completo al sistema con todos los permisos', 1),
      ('Gerente', 'Gestión de personal, reportes y configuraciones', 1),
      ('Cajero', 'Gestión de caja, ventas y cobros', 1),
      ('Mesero', 'Gestión de pedidos y servicios básicos', 1),
      ('Anfitriona', 'Gestión de habitaciones y servicios especiales', 1),
      ('Garzon', 'Servicios de mesa y atención al cliente', 1)
    `);

    // Crear tabla de usuarios si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        rol_id INT,
        estado TINYINT DEFAULT 1,
        fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_mod TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_rol_id (rol_id),
        INDEX idx_estado (estado)
      )
    `);

    // Verificar que se crearon correctamente
    const roles = await query('SELECT * FROM roles');
    
    return res.status(200).json({
      success: true,
      message: "Tabla de roles configurada correctamente",
      data: {
        rolesCount: Array.isArray(roles) ? roles.length : 0,
        roles: roles
      }
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Error al configurar la tabla de roles",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
}

export default handler;
