'use client';

import { toast } from 'sonner';
import {
  generarComprobantesPrepagoHTML,
  type DatosComprobantePrepago
} from '@/lib/business/comprobantePrepago';

/**
 * Imprime uno o más comprobantes de prepago, una página por cliente.
 *
 * Se usa un iframe oculto en vez de `window.open` porque el comprobante se
 * emite automáticamente después de la respuesta del servidor: un popup abierto
 * tras un `await` lo bloquea el navegador sin aviso.
 */
export function imprimirComprobantesPrepago(comprobantes: DatosComprobantePrepago[]): boolean {
  if (typeof window === 'undefined' || comprobantes.length === 0) return false;

  const logoUrl = `${window.location.origin}/img/system/logo2.png`;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'Comprobante de prepago');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  document.body.appendChild(iframe);

  const documento = iframe.contentWindow?.document;
  if (!documento) {
    iframe.remove();
    toast.error('No se pudo preparar el comprobante para imprimir');
    return false;
  }

  documento.open();
  documento.write(generarComprobantesPrepagoHTML(comprobantes, logoUrl));
  documento.close();

  let lanzado = false;
  const imprimir = () => {
    if (lanzado) return;
    lanzado = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      toast.error('No se pudo abrir la impresión del comprobante');
    } finally {
      // El diálogo de impresión puede tardar: el iframe se retira después.
      window.setTimeout(() => iframe.remove(), 60_000);
    }
  };

  iframe.addEventListener('load', () => window.setTimeout(imprimir, 200));
  // Respaldo por si el load ya ocurrió antes de suscribirse (documento escrito).
  window.setTimeout(imprimir, 600);

  return true;
}
