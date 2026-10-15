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
  if (item.hostessFormats?.length) {
    return (
      <div className='space-y-5'>
        {item.hostessFormats.map(format => (
          <div key={`${format.value}:${format.unitIndex ?? 0}`} className='space-y-2'>
            <p className='text-xs font-medium text-muted-foreground'>{format.label}</p>
            <SaleProductHostess
              availableHostesses={availableHostesses}
              item={{
                ...item,
                hostessFormats: undefined,
                muestraAnfitriona: true,
                isChampagne: format.value === 'botella' && item.isChampagne,
                opcionesTipo: [
                  {
                    ...item.opcionesTipo.find(option => option.value === format.value)!,
                    cantidad: format.cantidad
                  }
                ],
                cantidadActual: format.cantidad,
                champagneSelected: format.selected,
                otherSelected: format.selected,
                onChampagneSelect: format.onChange,
                onOtherSelect: format.onChange
              }}
            />
          </div>
        ))}
      </div>
    );
  }
  const esCorto = item.opcionesTipo.some(
    opcion => opcion.value !== 'botella' && opcion.cantidad > 0
  );
  const limiteCortos = Math.min(
    ...item.opcionesTipo
      .filter(opcion => opcion.value !== 'botella' && opcion.cantidad > 0)
      .map(opcion => opcion.cantidad)
  );
  if (!item.muestraAnfitriona) {
    return (
      <span className='inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs text-gray-400 dark:bg-white/5 dark:text-neutral-500'>
        Sin comisión
      </span>
    );
  }

  if (esCorto && limiteCortos > 1) {
    const seleccionadas = item.isChampagne ? item.champagneSelected : item.otherSelected;
    const onChange = item.isChampagne ? item.onChampagneSelect : item.onOtherSelect;
    return (
      <div className='space-y-1'>
        <div className='text-xs text-gray-500'>
          {Math.min(seleccionadas.length, limiteCortos)} de {limiteCortos} seleccionadas · Una
          anfitriona por unidad
        </div>
        <HostessMultiSelect
          anfitrionas={availableHostesses}
          value={seleccionadas.slice(0, limiteCortos)}
          onChange={ids => onChange(ids.slice(0, limiteCortos))}
          searchValue={item.hostessSearch}
          onSearchChange={item.onHostessSearchChange}
          maxSelection={limiteCortos}
        />
      </div>
    );
  }

  if (item.isChampagne && !esCorto) {
    return (
      <div className='space-y-1'>
        <div className='text-xs text-gray-500'>
          {item.champagneSelected.length} de {item.champagneHostessLimit} seleccionadas
        </div>
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
      </div>
    );
  }

  if (
    !esCorto &&
    (isExpensiveDrink(item.product) || (getExplicitMaxAnfitrionas(item.product) ?? 1) > 1)
  ) {
    // Botella cara: tantas anfitrionas como unidades, salvo máximo
    // explícito por producto (Configuraciones > Comisiones).
    const maxExplicito = getExplicitMaxAnfitrionas(item.product ?? {});
    const limiteAnfitrionas = maxExplicito ?? item.cantidadActual;
    return (
      <div className='space-y-1'>
        <div className='text-xs text-gray-500'>
          {item.otherSelected.length || 0} de {limiteAnfitrionas} seleccionadas
        </div>
        <HostessMultiSelect
          anfitrionas={availableHostesses}
          value={item.otherSelected}
          onChange={item.onOtherSelect}
          searchValue={item.hostessSearch}
          onSearchChange={item.onHostessSearchChange}
          maxSelection={limiteAnfitrionas}
        />
      </div>
    );
  }

  const assignedHostessId = (item.isChampagne ? item.champagneSelected : item.otherSelected)[0];
  const assignedHostess = assignedHostessId
    ? availableHostesses.find(h => String(h.id || h.id_usuario) === assignedHostessId)
    : undefined;
  return (
    <div className='space-y-1'>
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
            : esCorto
              ? 'Una anfitriona por corto'
              : 'Una anfitriona por bebida'}
        </div>
      )}
      <IndividualHostessSelect
        anfitrionas={availableHostesses}
        value={assignedHostessId || ''}
        onChange={selectedValue =>
          (item.isChampagne ? item.onChampagneSelect : item.onOtherSelect)(
            selectedValue ? [selectedValue] : []
          )
        }
        placeholder={
          availableHostesses.length === 0
            ? 'No hay anfitrionas disponibles'
            : 'Seleccionar anfitriona'
        }
        className='w-full'
      />
    </div>
  );
}
