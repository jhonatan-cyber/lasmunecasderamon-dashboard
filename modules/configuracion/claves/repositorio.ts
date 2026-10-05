/**
 * Infraestructura del módulo Configuración para la tabla `configuraciones`. SQL
 * privado: nadie fuera de `modules/configuracion` importa este archivo (§5).
 *
 * Estas consultas vivían dentro de `/api/configurations` y del tablero del kiosko,
 * que mezclaban adaptación, consulta y efectos de caché.
 */
import { query } from '@/lib/database/db';
import type { FilaConfiguracion } from '../contracts';

/** Todas las claves, ordenadas como las pintan las pantallas. */
export async function listarConfiguraciones(): Promise<FilaConfiguracion[]> {
  return await query<FilaConfiguracion[]>(`
    SELECT id, clave, valor, descripcion, categoria, tipo
    FROM configuraciones
    ORDER BY categoria, clave
  `);
}

/** Valor de una clave, o `null` si no existe. */
export async function obtenerValorConfiguracion(clave: string): Promise<string | null> {
  const rows = await query<{ valor: string }[]>(
    'SELECT valor FROM configuraciones WHERE clave = ? LIMIT 1',
    [clave]
  );
  return rows[0]?.valor ?? null;
}

/**
 * Guarda el valor de una clave: la inserta si no existe y la actualiza si existe.
 *
 * Categoría y tipo salen del registro de claves, no de la fila: son una propiedad
 * de la clave, no de quién la escribió. Antes salían de ternarios anidados y
 * `impuesto_iva`, `moneda`, `ambiente` y `timezone` quedaban bajo `empresa`
 * aunque el volcado base las pone en `facturacion` y `sistema`.
 */
export async function guardarConfiguracion(
  clave: string,
  valor: string,
  definicion: { categoria: string; tipo: string } | null
): Promise<void> {
  const [existing] = await query<{ id: number }[]>(
    'SELECT id FROM configuraciones WHERE clave = ? LIMIT 1',
    [clave]
  );

  if (!existing) {
    await query(
      'INSERT INTO configuraciones (id, clave, valor, categoria, tipo, fecha_crea, fecha_mod) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [
        crypto.randomUUID(),
        clave,
        String(valor),
        definicion?.categoria ?? 'sistema',
        definicion?.tipo ?? 'text'
      ]
    );
  } else {
    await query('UPDATE configuraciones SET valor = ?, fecha_mod = NOW() WHERE clave = ?', [
      String(valor),
      clave
    ]);
  }
}
