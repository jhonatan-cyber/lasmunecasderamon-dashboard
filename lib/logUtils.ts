import { query } from './db';

export const initLogsTable = async () => {
    try {
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS servicio_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        servicio_id INT NOT NULL,
        tipo_evento VARCHAR(50) NOT NULL,
        descripcion TEXT,
        fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_id INT,
        INDEX (servicio_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
        await query(createTableQuery);
        console.log('[DB] Tabla servicio_logs inicializada');
    } catch (error) {
        console.error('[DB] Error al inicializar servicio_logs:', error);
    }
};

export const addServicioLog = async (servicioId: number, tipoEvento: string, descripcion: string, usuarioId?: number) => {
    try {
        await query(
            'INSERT INTO servicio_logs (servicio_id, tipo_evento, descripcion, usuario_id) VALUES (?, ?, ?, ?)',
            [servicioId, tipoEvento, descripcion, usuarioId || null]
        );
    } catch (error) {
        console.error('[DB] Error al añadir log:', error);
    }
};
