import { query } from './db';

/**
 * Genera un código de 4 dígitos aleatorio que no empiece por 0 (opcional, pero común)
 * o simplemente un código de 4 dígitos.
 */
export function generateRandomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Registra un nuevo código en la tabla codigos y retorna el nuevo código.
 */
export async function regenerateAttendanceCode(): Promise<string> {
  const newCode = generateRandomCode();
  try {
    // Insertar el nuevo código. La tabla debe tener fecha_crea con DEFAULT CURRENT_TIMESTAMP
    await query('INSERT INTO codigos (codigo) VALUES (?)', [newCode]);
    console.log(`[CodigoService] Nuevo código generado: ${newCode}`);
    return newCode;
  } catch (error) {
    console.error('[CodigoService] Error al regenerar código:', error);
    throw error;
  }
}
