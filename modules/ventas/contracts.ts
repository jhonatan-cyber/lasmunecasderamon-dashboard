/**
 * Contratos del módulo de ventas — §5: «DTO y esquemas aptos para consumidores».
 *
 * Las solicitudes de anulación cruzan la frontera en tres direcciones: la ruta
 * de caja las crea, la página de confirmación las consulta por token y el flujo
 * de WhatsApp las procesa. Lo que sale de aquí es una fila con la venta y el
 * cliente ya resueltos, sin tipos del driver ni SQL.
 */

/** Solicitud de anulación con la venta y el cliente que la acompaña. */
export interface SolicitudAnulacion {
  id: string;
  token: string;
  estado: string;
  motivo: string | null;
  monto: number | null;
  solicitado_por: string | null;
  fecha_solicitud: string;
  venta_id: string;
  codigo: string;
  total: number;
  cliente_nombre: string;
}

/** Datos de la venta que la ruta necesita para validar y avisar por WhatsApp. */
export interface VentaParaAnulacion {
  codigo: string;
  total: number;
  cliente_nombre: string;
}

import type { z } from 'zod';
import type { SaleCreateSchema } from '@/lib/business/schemas';
export type EntradaRegistroVenta = z.input<typeof SaleCreateSchema> & {
  skip_client_prepago?: boolean;
  origen?: string;
  id_pedido?: string;
};
