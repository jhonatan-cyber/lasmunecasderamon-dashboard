'use client';

import { HostessMultiSelect } from '@/components/orders';
import { getExplicitMaxAnfitrionas } from '@/components/orders';
import { isExpensiveDrink } from '@/components/orders/productModalRules';
import { IndividualHostessSelect } from '@/components/shared/selects';
import type { SaleProductItem } from '@/components/sales/product-modal/saleProductItems';

/**
 * Celda de anfitriona (compartida por tabla y tarjeta). Tres formas:
 *  - champagne → multi-select con el límite del producto;
 *  - bebida cara → una anfitriona por unidad (o el máximo explícito de
 *    Configuraciones > Comisiones);
 *  - resto → una sola anfitriona.
 * Sin comisión en la forma de venta elegida no se pide anfitriona.
 */
export function SaleProductHostess({
  item,
  availableHostesses
}: {
  item: SaleProductItem;
  availableHostesses: any[];
}) {
  if (!item.muestraAnfitriona) {
    return (
      <span className='inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs text-gray-400 dark:bg-white/5 dark:text-neutral-500'>
        Sin comisión
      </span>
    );
  }

  if (item.isChampagne) {
    return (
      <div className='space-y-2'>
        <div className='w-full'>
          <HostessMultiSelect
            anfitrionas={availableHostesses}
            value={item.champagneSelected}
            onChange={item.onChampagneSelect}
            searchValue={item.hostessSearch}
            onSearchChange={item.onHostessSearchChange}
            maxSelection={item.champagneHostessLimit}
          />
        </div>
        <div className='text-xs text-gray-500'>
          {item.champagneSelected.length} de {item.champagneHostessLimit} seleccionadas
        </div>
      </div>
    );
  }

  if (isExpensiveDrink(item.product)) {
    // Botella cara: tantas anfitrionas como unidades, salvo máximo
    // explícito por producto (Configuraciones > Comisiones).
    const maxExplicito = getExplicitMaxAnfitrionas(item.product ?? {});
    const limiteAnfitrionas = maxExplicito
      ? Math.min(item.cantidadActual, maxExplicito)
      : item.cantidadActual;
    return (
      <div className='space-y-2'>
        <HostessMultiSelect
          anfitrionas={availableHostesses}
          value={item.otherSelected}
          onChange={item.onOtherSelect}
          searchValue={item.hostessSearch}
          onSearchChange={item.onHostessSearchChange}
          maxSelection={limiteAnfitrionas}
        />
        <div className='text-xs text-gray-500'>
          {item.otherSelected.length || 0} de {limiteAnfitrionas} seleccionadas
        </div>
      </div>
    );
  }

  const assignedHostessId = item.otherSelected[0];
  const assignedHostess = assignedHostessId
    ? availableHostesses.find(h => String(h.id || h.id_usuario) === assignedHostessId)
    : undefined;
  return (
    <div className='space-y-2'>
      <IndividualHostessSelect
        anfitrionas={availableHostesses}
        value={assignedHostessId || ''}
        onChange={selectedValue => item.onOtherSelect(selectedValue ? [selectedValue] : [])}
        placeholder={
          availableHostesses.length === 0
            ? 'No hay anfitrionas disponibles'
            : 'Seleccionar anfitriona'
        }
        className='w-full'
      />
      {assignedHostessId ? (
        <div className='text-xs text-green-600 font-medium'>
          Asignada:{' '}
          {assignedHostess?.nick ||
            assignedHostess?.name ||
            assignedHostess?.nombre ||
            assignedHostessId}
        </div>
      ) : (
        <div className='text-xs text-gray-500'>
          {availableHostesses.length === 0
            ? 'Todas las anfitrionas están asignadas'
            : 'Una anfitriona por bebida'}
        </div>
      )}
    </div>
  );
}
