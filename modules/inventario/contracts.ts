/**
 * Contratos del módulo de inventario — §5: «DTO y esquemas aptos para consumidores».
 *
 * Aquí vive lo que el módulo comparte con quien está fuera: el servicio de ventas
 * consume estos tipos al pedir el consumo de existencias y la capa heredada
 * (`lib/repositories/inventory/`) los reexporta mientras dure la transición.
 * Ninguna fila SQL, tipo del driver ni implementación cruza este archivo.
 */

export interface ConsumoInventarioDetalle {
  presentacion_id?: string | null;
  cantidad?: number | null;
  tipo_venta?: string | null;
  shot_anfitriona?: boolean | null;
}

/**
 * Botella abierta que con esta venta quedó en el umbral de alerta (`shots_alerta`) y no
 * estaba antes: el aviso se emite después de confirmar la transacción de la venta.
 */
export interface ShotAlert {
  presentacion_id: string;
  nombre: string;
  ml_restante: number;
  shots_restantes: number;
}
