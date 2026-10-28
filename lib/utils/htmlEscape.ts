const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Escapa texto para interpolarlo dentro de un documento HTML armado como string.
 *
 * Los comprobantes y cierres de caja se imprimen en ventanas que heredan el
 * origen de quien las abre (`window.open('', '_blank')` y los Blob URLs), así
 * que un `<` sin escapar es ejecución same-origin, no un problema de
 * maquetación. El reemplazo es de una sola pasada: un `&lt;` de entrada queda
 * como `&amp;lt;` y no se reinterpreta como etiqueta.
 *
 * `null` y `undefined` se imprimen como texto vacío para que un campo opcional
 * de la base no rompa el documento.
 */
export function escaparHtml(texto: string | null | undefined): string {
  return String(texto ?? '').replace(/[&<>"']/g, caracter => ESCAPES[caracter]);
}
