'use client';

import { memo } from 'react';
import {
  CajaChartsSection,
  CajaFinancialDetails,
  ClientesSaldoList,
  CajaDetailsUserCards
} from '@/components/caja/details';
import type { CajaDetailsNumbers } from '@/components/caja/details/cajaDetailsModel';

interface CajaDetailsResumenTabProps {
  caja: any;
  imageVersion: string | number;
  isLoadingSummary: boolean;
  numeros: CajaDetailsNumbers;
  retirosSum: number;
  clientesSaldo: any[];
  loadingClientesSaldo: boolean;
  fuentes: {
    ventasTragosChicas: any;
    ventasChampagne: any;
    ventasBarras: any;
  };
  ventasPorProducto: any[];
}

/** Contenido del tab Resumen del modal de detalles de caja. */
export const CajaDetailsResumenTab = memo(function CajaDetailsResumenTab({
  caja,
  imageVersion,
  isLoadingSummary,
  numeros,
  retirosSum,
  clientesSaldo,
  loadingClientesSaldo,
  fuentes,
  ventasPorProducto
}: CajaDetailsResumenTabProps) {
  return (
    <div className='mt-0 space-y-8'>
      <CajaDetailsUserCards caja={caja} imageVersion={imageVersion} />

      <CajaChartsSection
        isLoading={isLoadingSummary}
        totalIngresos={numeros.totalIngresos}
        totalEgresos={numeros.totalEgresos}
        ventasTragos={fuentes.ventasTragosChicas?.total_venta || 0}
        ventasChampagne={fuentes.ventasChampagne?.total_venta || 0}
        ventasBarras={fuentes.ventasBarras?.total_venta || 0}
        servicios={caja?.servicios || 0}
        ventasPorProducto={ventasPorProducto}
        shotsCliente={fuentes.ventasBarras?.shots_cliente}
        shotsAnfitriona={fuentes.ventasBarras?.shots_anfitriona}
      />

      <CajaFinancialDetails
        isLoading={isLoadingSummary}
        prepagoCargado={numeros.prepagoCargado}
        prepagoConsumido={numeros.prepagoConsumido}
        ingresosReales={numeros.ingresosReales}
        devoluciones={Number(caja?.devoluciones || 0)}
        anticipos={Number(caja?.anticipo || 0)}
        retirosTotal={retirosSum}
        prepagoPendienteClientes={numeros.prepagoPendienteClientes}
        saldoClientesDescontado={numeros.saldoClientesDescontado}
        saldoClientesPorDevolver={numeros.saldoClientesPorDevolver}
        montoCierre={numeros.montoCierre}
        mostrarMontoCierre={Number(caja?.estado) === 0}
      />

      <div className='bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
        <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
          <h4 className='font-bold text-gray-900 dark:text-white'>
            Clientes con saldo prepago pendiente
          </h4>
          <span className='text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider'>
            {clientesSaldo.length} cliente{clientesSaldo.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className='p-4'>
          <ClientesSaldoList clientes={clientesSaldo} loading={loadingClientesSaldo} />
        </div>
      </div>
    </div>
  );
});
