'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface FinancialTotals {
  totalSueldos: number;
  totalAportes: number;
  totalDescuentos: number;
  totalFinal: number;
  semanasConDescuento: number;
  montoDescuento: number;
}

interface AttendanceFinancialSummaryProps {
  userName: string;
  userNick: string;
  totals: FinancialTotals;
}

export function AttendanceFinancialSummary({
  userName,
  userNick,
  totals,
}: AttendanceFinancialSummaryProps) {
  const { totalSueldos, totalAportes, totalDescuentos, totalFinal, semanasConDescuento, montoDescuento } = totals;

  return (
    <Card>
      <CardContent className='p-6'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* User Info */}
          <div className='flex flex-col space-y-2'>
            <h4 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
              Información del Usuario
            </h4>
            <div className='space-y-1'>
              <div className='text-lg font-semibold text-gray-900 dark:text-white'>
                {userName}
              </div>
              <div className='text-sm text-gray-600 dark:text-gray-400'>@{userNick}</div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className='flex flex-col space-y-2'>
            <h4 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
              Resumen Financiero
            </h4>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600 dark:text-gray-400'>Total sueldos:</span>
                <span className='text-lg font-bold dark:text-white'>
                  {formatCurrencyNoDecimals(totalSueldos)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600 dark:text-gray-400'>Total aportes:</span>
                <span className='text-lg font-bold dark:text-white'>
                  {formatCurrencyNoDecimals(totalAportes)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600 dark:text-gray-400'>Descuento habitación:</span>
                <span className='text-lg font-bold dark:text-white'>
                  {formatCurrencyNoDecimals(totalDescuentos)}
                </span>
              </div>
              <div className='flex items-center justify-between border-t pt-2 dark:border-gray-700'>
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Total a pagar:</span>
                <span className='text-lg font-bold text-green-600 dark:text-green-500'>
                  {formatCurrencyNoDecimals(totalFinal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Discount info banner */}
        {semanasConDescuento > 0 && (
          <div className='mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50'>
            <div className='flex items-start gap-2'>
              <Info className='w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0' />
              <div className='text-sm text-blue-800 dark:text-blue-200'>
                <p className='font-medium mb-1'>Información del Descuento por Habitación:</p>
                <ul className='space-y-1 text-xs'>
                  <li>• <strong>Semanas con descuento:</strong> {semanasConDescuento}</li>
                  <li>• <strong>Monto por semana:</strong> {formatCurrencyNoDecimals(montoDescuento)}</li>
                  <li>• <strong>Total descuento:</strong> {formatCurrencyNoDecimals(totalDescuentos)}</li>
                  <li>• <em>El descuento se aplica una vez por semana, no por cada día de asistencia</em></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
