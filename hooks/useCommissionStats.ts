import { useStats } from './useStats';

interface CommissionStats {
    total_comisiones: number;
    comision_ventas: number;
    comision_servicios: number;
    promedio_comision: number;
    cantidad_comisiones: number;
    comision_minima: number;
    comision_maxima: number;
    porcentaje_ventas: number;
    porcentaje_servicios: number;
}

const useCommissionStats = () => {
    return useStats<CommissionStats>({
        endpoint: '/api/commissions',
        params: { stats: true }
    });
};

export default useCommissionStats;
