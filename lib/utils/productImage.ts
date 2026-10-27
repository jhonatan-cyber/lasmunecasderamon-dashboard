export const DEFAULT_PRODUCT_IMAGE = '/api/images/products/default.png';

/**
 * URL pública de la foto de un producto o presentación.
 *
 * Acepta varias candidatas (presentación, producto, fallback) y devuelve la
 * primera válida: las URLs absolutas se respetan tal cual y los nombres de
 * archivo se resuelven contra el endpoint de imágenes.
 */
export function productImageUrl(...fotos: Array<string | null | undefined>): string {
  for (const foto of fotos) {
    if (!foto || foto === 'default.png') continue;
    if (foto.startsWith('http') || foto.startsWith('blob:') || foto.startsWith('/')) return foto;
    return `/api/images/products/${foto}`;
  }
  return DEFAULT_PRODUCT_IMAGE;
}
