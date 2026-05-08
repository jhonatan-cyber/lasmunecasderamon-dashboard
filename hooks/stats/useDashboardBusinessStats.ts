import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';

export interface DashboardBusinessStats {
  caja_id?: string | null;
  balance_total: number;
  total_ventas: number;
  cantidad_ventas: number;
  total_servicios: number;
  cantidad_servicios: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  total_propina: number;
  total_comision: number;
  total_iva: number;
  total_compras: number;
  monto_apertura: number;
  efectivo_en_caja: number;
  tiempo_abierta_horas?: number;
  tiempo_abierta_minutos?: number;
  fecha_apertura_raw?: string | null;
  usuario_id_apertura?: string | null;
}

export const useDashboardBusinessStats = () => {
  return useQuery<DashboardBusinessStats>({
    queryKey: queryKeys.cashRegister.stats(),
    queryFn: async () => {
      const response = await fetch('/api/caja-status');
      if (!response.ok) {
        throw new Error('Error al obtener métricas de caja para el dashboard');
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error en la respuesta del servidor');
      }
      return result.data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true
  });
};
