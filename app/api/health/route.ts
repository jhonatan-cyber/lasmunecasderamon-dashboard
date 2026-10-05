import { withPublicRoute } from '@/lib/api';
import { ApiResponse } from '@/lib/api';
import { obtenerReporteDeSalud } from '@/modules/salud';

export const GET = withPublicRoute(async () => {
  return ApiResponse.success(await obtenerReporteDeSalud(), 'API funcionando correctamente');
});
