import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import {
  checkWarehouseContainerAlerts,
  HORAS_ENVASE_SIN_CONFIRMAR
} from '@/lib/business/containerAlerts';

/**
 * Contador del control de envases: cuántos entregados esperan recepción del
 * almacén y cuántos llevan más de `HORAS_ENVASE_SIN_CONFIRMAR` horas.
 *
 * Además de responder, ejecuta el chequeo de la alerta: si el número de
 * atrasados cambió, se emite el evento `warehouse_container_alert` (y la
 * campana/push si creció). Así el panel mantiene la alerta viva aunque el cron
 * externo no corra, con una sola consulta ligera por petición.
 *
 * Lo ven las dos partes del control (`products/read`), igual que el historial.
 */
export const GET = withRoute({ auth: true, module: 'products', action: 'read' }, async () => {
  const resumen = await checkWarehouseContainerAlerts();
  return NextResponse.json({
    success: true,
    data: { ...resumen, umbral_horas: HORAS_ENVASE_SIN_CONFIRMAR }
  });
});
