/**
 * Foto del baucher de un pago con transferencia.
 *
 * La app del garzón y la pantalla de entradas la mandan como data URL dentro
 * del payload; el servidor la guarda como archivo y en la fila de la operación
 * solo queda el nombre. Estas constantes son el contrato compartido: el esquema
 * del pedido, la validación de entradas y el formulario que adjunta el archivo
 * tienen que aceptar exactamente lo mismo.
 *
 * Sin imports de servidor a propósito: la pantalla de entradas valida el archivo
 * antes de mandarlo y no puede arrastrar sharp al bundle del cliente.
 */
export const BAUCHER_FOTO_MAX_CHARS = 4_000_000;

const BAUCHER_DATA_URL = /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Tipos de archivo que el formulario puede convertir a base64. */
export const BAUCHER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Peso máximo del archivo original. Base64 crece ~4/3 y se suma la cabecera del
 * data URL, así que se descuenta ese margen para que nunca supere el tope de
 * caracteres que valida el servidor.
 */
export const BAUCHER_ARCHIVO_MAX_BYTES = Math.floor(((BAUCHER_FOTO_MAX_CHARS - 64) * 3) / 4);

/** `true` si el valor es una imagen aceptable como baucher. */
export function esBaucherDataUrlValido(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= BAUCHER_FOTO_MAX_CHARS &&
    BAUCHER_DATA_URL.test(value)
  );
}
