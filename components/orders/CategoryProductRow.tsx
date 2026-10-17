'use client';
import { NativeSelect } from '@/components/ui/native-select';

import { bottleMixerUnits } from '@/lib/sales/productConfiguration';
import { useState } from 'react';
import { resolverVentaProducto, type SaleChoice } from '@/lib/sales/saleChoice';
import { esCortoAnfitriona, permiteAnfitriona } from '@/lib/sales/hostessShortPrices';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { HostessMultiSelect } from '@/components/orders';
import { IndividualHostessSelect, RoomSelect } from '@/components/shared/selects';
import {
  isChampagneProduct,
  getHostessLimit,
  isExpensiveDrink
} from '@/components/orders/productModalRules';

interface CategoryProductRowProps {
  product: any;
  cantidades: { [key: string]: number };
  onCantidadChange: (id: string, value: string) => void;
  onAgregarProducto: (producto: any) => void;
  champagneHostessSelections: { [key: string]: string[] };
  onChampagneHostessChange: (productId: string, hostessIds: string[]) => void;
  otherProductHostessSelections: { [key: string]: string[] };
  onOtherProductHostessChange: (productId: string, hostessIds: string[]) => void;
  habitaciones: any[];
  roomSelections: { [key: string]: string };
  onRoomChange: (productId: string, roomId: string) => void;
  productosCategoria: any[];
  debouncedSearchValues: { [key: string]: string };
  setHostessSearchValues: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  availableHostesses: any[];
  getAvailableHostessesForChampagne: (productId: string) => any[];
  getAvailableHostessesForOtherProducts: (productId: string) => any[];
  requiresRoom: (product: any) => boolean;
}

export function CategoryProductRow({
  product: original,
  cantidades,
  onCantidadChange,
  onAgregarProducto,
  champagneHostessSelections,
  onChampagneHostessChange,
  otherProductHostessSelections,
  onOtherProductHostessChange,
  habitaciones,
  roomSelections,
  onRoomChange,
  productosCategoria,
  debouncedSearchValues,
  setHostessSearchValues,
  availableHostesses,
  getAvailableHostessesForChampagne,
  getAvailableHostessesForOtherProducts,
  requiresRoom
}: CategoryProductRowProps) {
  const [choice, setChoice] = useState<SaleChoice>('botella');
  const venta = resolverVentaProducto(original, choice);
  const p = original.opciones_venta
    ? {
        ...original,
        unidades_acompanamiento: bottleMixerUnits(original),
        precio: venta.precio,
        price: venta.precio,
        comision: venta.comision,
        commission: venta.comision,
        tipo_venta: venta.esShot ? 'shot' : 'botella',
        shot_anfitriona: esCortoAnfitriona(venta.tipoVenta)
      }
    : original;
  const id = String(p.id_producto || p.id);
  const isChampagne = isChampagneProduct(p);
  const hasComm = permiteAnfitriona(venta.tipoVenta);
  const needsRoom = !venta.esShot && requiresRoom(p);

  return (
    <TableRow key={id}>
      <TableCell>
        {p.nombre || p.name}
        {venta.tieneShot && (
          <NativeSelect
            aria-label={`Formato de ${p.nombre || p.name}`}
            className='mt-2 block w-full rounded-md border bg-background p-2 text-sm'
            value={venta.tipoVenta}
            onChange={e => {
              setChoice(e.target.value as SaleChoice);
              onCantidadChange(id, '1');
            }}
          >
            {venta.opciones.map(o => (
              <option key={o.value} value={o.value}>
                {o.nombre} - {formatCurrencyNoDecimals(o.precio)}
              </option>
            ))}
          </NativeSelect>
        )}
      </TableCell>
      <TableCell className='text-center'>{formatCurrencyNoDecimals(p.price || p.precio)}</TableCell>
      <TableCell className='text-center'>
        {formatCurrencyNoDecimals(p.commission || p.comision || 0)}
      </TableCell>
      <TableCell className='text-center'>
        <div className='flex items-center justify-center gap-2'>
          <Button
            size='sm'
            variant='outline'
            aria-label='Disminuir'
            onClick={() => {
              const currentCantidad = cantidades[id] || 1;
              if (currentCantidad > 1) {
                onCantidadChange(id, (currentCantidad - 1).toString());
              }
            }}
            className='w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200'
            disabled={(cantidades[id] || 1) <= 1}
          >
            <Minus className='h-3 w-3' />
          </Button>
          <span className='w-8 text-center'>{cantidades[id] || 1}</span>
          <Button
            size='sm'
            variant='outline'
            aria-label='Aumentar'
            onClick={() => {
              const currentCantidad = cantidades[id] || 1;
              if (currentCantidad < (venta.esShot ? 99 : Number(p.stock_bar ?? 99)))
                onCantidadChange(id, (currentCantidad + 1).toString());
            }}
            className='w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200'
          >
            <Plus className='h-3 w-3' />
          </Button>
        </div>
      </TableCell>
      <TableCell className='text-center'>
        {needsRoom ? (
          <div className='space-y-2'>
            <RoomSelect
              habitaciones={habitaciones}
              eligibleRoomIds={(habitaciones || [])
                .filter(
                  h =>
                    (h.estado ?? h.status) !== 0 &&
                    (h.comision_anfitriona === 0 || !h.comision_anfitriona)
                )
                .map(h => String(h.id ?? h.id_habitacion))}
              value={roomSelections[id] || ''}
              onChange={roomId => onRoomChange(id, roomId)}
              placeholder='Seleccionar habitación'
              className='w-full'
            />
            {roomSelections[id] && (
              <div className='text-xs text-green-600 font-medium'>✓ Habitación asignada</div>
            )}
          </div>
        ) : (
          <div className='text-xs text-gray-400'>-</div>
        )}
      </TableCell>
      <TableCell className='text-center'>
        {hasComm ? (
          isChampagne ? (
            <ChampagneHostessSection
              id={id}
              selections={champagneHostessSelections[id] || []}
              onChange={onChampagneHostessChange}
              searchValue={debouncedSearchValues[id] || ''}
              onSearchChange={searchValue => {
                setHostessSearchValues(prev => ({ ...prev, [id]: searchValue }));
              }}
              hostessLimit={getHostessLimit(
                productosCategoria.find(p => String(p.id_producto || p.id) === id) || p
              )}
              availableHostesses={getAvailableHostessesForChampagne(id)}
            />
          ) : (
            <OtherHostessSection
              id={id}
              selections={otherProductHostessSelections[id] || []}
              onChange={onOtherProductHostessChange}
              cantidad={cantidades[id] || 1}
              availableHostesses={getAvailableHostessesForOtherProducts(id)}
              hostessSearchValue={debouncedSearchValues[id] || ''}
              onHostessSearchChange={searchValue => {
                setHostessSearchValues(prev => ({ ...prev, [id]: searchValue }));
              }}
              product={p}
            />
          )
        ) : (
          <div className='text-xs text-gray-400'>Sin comisión</div>
        )}
      </TableCell>
      <TableCell className='text-center'>
        <Button
          size='icon'
          variant='outline'
          aria-label='Agregar producto'
          className='rounded-full bg-black text-white hover:scale-110 transition-all duration-200'
          onClick={() => {
            onAgregarProducto({
              ...p,
              cantidad: cantidades[id] || 1,
              selectedHostesses: !hasComm
                ? []
                : isChampagne
                  ? champagneHostessSelections[id] || []
                  : otherProductHostessSelections[id] || [],
              isChampagne: isChampagne,
              selectedRoom: roomSelections[id] || null,
              requiresRoom: needsRoom
            });
          }}
          disabled={!venta.esShot && Number(p.stock_bar ?? 99) < (cantidades[id] || 1)}
        >
          <Plus className='h-4 w-4' />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ChampagneHostessSection({
  id,
  selections,
  onChange,
  hostessLimit,
  searchValue,
  onSearchChange,
  availableHostesses
}: {
  id: string;
  selections: string[];
  onChange: (productId: string, hostessIds: string[]) => void;
  hostessLimit: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  availableHostesses: any[];
}) {
  return (
    <div className='space-y-2'>
      <div className='w-full'>
        <HostessMultiSelect
          anfitrionas={availableHostesses}
          value={selections}
          onChange={selectedIds => onChange(id, selectedIds)}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          maxSelection={hostessLimit}
        />
      </div>
      <div className='text-xs text-gray-500'>
        {selections.length} de {hostessLimit} seleccionadas
      </div>
    </div>
  );
}

function OtherHostessSection({
  id,
  selections,
  onChange,
  cantidad,
  availableHostesses,
  hostessSearchValue,
  onHostessSearchChange,
  product
}: {
  id: string;
  selections: string[];
  onChange: (productId: string, hostessIds: string[]) => void;
  cantidad: number;
  availableHostesses: any[];
  hostessSearchValue: string;
  onHostessSearchChange: (value: string) => void;
  product: any;
}) {
  if (isExpensiveDrink(product) || cantidad > 1) {
    return (
      <div className='space-y-2'>
        <HostessMultiSelect
          anfitrionas={availableHostesses}
          value={selections}
          onChange={selectedIds => onChange(id, selectedIds)}
          searchValue={hostessSearchValue}
          onSearchChange={onHostessSearchChange}
          maxSelection={cantidad}
        />
        <div className='text-xs text-gray-500'>
          {selections.length} de {cantidad} seleccionadas
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <IndividualHostessSelect
        anfitrionas={availableHostesses}
        value={selections[0] || ''}
        onChange={selectedValue => {
          onChange(id, selectedValue ? [selectedValue] : []);
        }}
        placeholder={
          availableHostesses.length === 0
            ? 'No hay anfitrionas disponibles'
            : 'Seleccionar anfitriona'
        }
        className='w-full'
      />
      {selections.length > 0 ? (
        <div className='text-xs text-green-600 font-medium'>
          ✓ Asignada:{' '}
          {(() => {
            const hostessId = selections[0];
            const hostess = availableHostesses.find(
              h => String(h.id || h.id_usuario) === hostessId
            );
            return hostess?.nick || hostess?.name || hostess?.nombre || hostessId;
          })()}
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
