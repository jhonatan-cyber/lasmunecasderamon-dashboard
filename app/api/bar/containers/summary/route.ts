import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import {
  checkWarehouseContainerAlerts,
  HORAS_ENVASE_SIN_CONFIRMAR
} from '@/lib/business/containerAlerts';

export const GET = withRoute({ auth: true, module: 'products', action: 'read' }, async () => {
  const resumen = await checkWarehouseContainerAlerts();
  return NextResponse.json({
    success: true,
    data: { ...resumen, umbral_horas: HORAS_ENVASE_SIN_CONFIRMAR }
  });
});
