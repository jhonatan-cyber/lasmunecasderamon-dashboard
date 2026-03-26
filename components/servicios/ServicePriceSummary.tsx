import React from 'react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface ServicePriceSummaryProps {
  subTotal: number;
  precioHabitacionTotal: number;
  iva: number;
  total: number;
  precioServicioTotal: number;
  numAnfitrionas: number;
  multiplicadorTiempo: number;
  precioServicio: number;
  precioHabitacion: number;
}

export const ServicePriceSummary = React.memo<ServicePriceSummaryProps>(({
  subTotal,
  precioHabitacionTotal,
  iva,
  total,
  precioServicioTotal,
  numAnfitrionas,
  multiplicadorTiempo,
  precioServicio,
  precioHabitacion
}) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
      <div className="flex justify-between text-sm">
        <span>Subtotal:</span>
        <span>{formatCurrencyNoDecimals(subTotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>Habitación:</span>
        <span>{formatCurrencyNoDecimals(precioHabitacionTotal)}</span>
      </div>
      {iva > 0 && (
        <div className="flex justify-between text-sm text-purple-600">
          <span>IVA (20%):</span>
          <span>{formatCurrencyNoDecimals(iva)}</span>
        </div>
      )}
      <div className="flex justify-between font-semibold text-lg border-t pt-2">
        <span>Total:</span>
        <span>{formatCurrencyNoDecimals(total)}</span>
      </div>
      {numAnfitrionas === 1 && (
        <div className="text-xs text-blue-600 font-medium mt-1">
          Comisión para anfitriona: {formatCurrencyNoDecimals(precioServicioTotal)}
        </div>
      )}
      {numAnfitrionas > 1 && (
        <div className="text-xs text-gray-500 border-t pt-2">
          <p>Desglose por anfitriona:</p>
          <p>• Servicio: {formatCurrencyNoDecimals(precioServicio)} × {numAnfitrionas}{multiplicadorTiempo > 1 ? ` × ${multiplicadorTiempo} (60min)` : ''}</p>
          <p>• Habitación: {formatCurrencyNoDecimals(precioHabitacion)} × {numAnfitrionas}{multiplicadorTiempo > 1 ? ` × ${multiplicadorTiempo} (60min)` : ''}</p>
          {iva > 0 && <p>• IVA: {formatCurrencyNoDecimals(iva)} (20% + ajuste para redondeo a $5.000)</p>}
          <p className="text-blue-600 font-medium mt-1">Comisión por anfitriona: {formatCurrencyNoDecimals(Math.floor(precioServicioTotal / numAnfitrionas))}</p>
        </div>
      )}
    </div>
  );
});

ServicePriceSummary.displayName = 'ServicePriceSummary';
