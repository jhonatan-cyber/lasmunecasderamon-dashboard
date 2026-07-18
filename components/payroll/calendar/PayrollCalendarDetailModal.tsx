'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface PayrollCalendarDetailModalProps {
  open: boolean;
  selectedItem: any;
  selectedItemType: 'venta' | 'servicio' | null;
  onOpenChange: (open: boolean) => void;
  formatDateToSpanish: (dateString: string) => string;
  formatTimeFromDate: (dateString: string) => string;
}

function renderDistributionBlock(
  title: string,
  colorClasses: string,
  content: string,
  textClass: string,
  valueClass: string
) {
  return (
    <div className={`p-4 border rounded-lg ${colorClasses}`}>
      <div className={`text-sm font-semibold mb-2 ${textClass}`}>{title}</div>
      <div className='space-y-2'>
        {content.split('|').map((item, idx) => {
          const [nombre, monto] = item.split(':');
          return (
            <div key={idx} className='flex justify-between items-center'>
              <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>{nombre}</span>
              <span className={`font-semibold ${valueClass}`}>
                {formatCurrencyCLP(parseFloat(monto) || 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PayrollCalendarDetailModal({
  open,
  selectedItem,
  selectedItemType,
  onOpenChange,
  formatDateToSpanish,
  formatTimeFromDate
}: PayrollCalendarDetailModalProps) {
  if (!selectedItem || !selectedItemType) return null;

  const detailTitle = selectedItemType === 'venta' ? 'Detalle de Venta' : 'Detalle de Servicio';
  const detailDate =
    selectedItem.fecha_crea || selectedItem.fechaVenta || selectedItem.fechaHoraServicio;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl w-full max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-lg font-semibold'>
            {detailTitle}
            <span className='ml-2 text-gray-500 font-normal'>{selectedItem.codigo}</span>
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <div className='grid grid-cols-2 gap-4 mb-4'>
            <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
              <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>Cliente</div>
              <div className='font-medium'>{selectedItem.cliente || 'N/A'}</div>
            </div>
            <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
              <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                Habitación
              </div>
              <div className='font-medium'>{selectedItem.habitacion || 'N/A'}</div>
            </div>
          </div>

          <div className='mb-4'>
            <div className='p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg'>
              <div className='text-xs text-purple-600 dark:text-purple-400 uppercase mb-2 font-semibold'>
                Anfitrionas Involucradas
              </div>
              <div className='flex flex-wrap gap-2'>
                {(selectedItem.anfitrionas || selectedItem.anfitriona || 'N/A')
                  .split(',')
                  .map((anfitriona: string, idx: number) => (
                    <span
                      key={idx}
                      className='px-3 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium'
                    >
                      {anfitriona.trim()}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {selectedItemType === 'venta' ? (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                  <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                    Precio Habitación
                  </div>
                  <div className='font-medium'>
                    {formatCurrencyCLP(selectedItem.precio || selectedItem.precioHabitacion || 0)}
                  </div>
                </div>
                <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-lg'>
                  <div className='text-xs text-green-600 dark:text-green-400 uppercase mb-1'>
                    Propina Total
                  </div>
                  <div className='font-medium text-green-600 dark:text-green-400'>
                    {formatCurrencyCLP(selectedItem.propina_total || selectedItem.propina || 0)}
                  </div>
                </div>
                <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                  <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                    Subtotal
                  </div>
                  <div className='font-medium'>
                    {formatCurrencyCLP(selectedItem.sub_total || selectedItem.subtotal || 0)}
                  </div>
                </div>
                <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
                  <div className='text-xs text-blue-600 dark:text-blue-400 uppercase mb-1'>
                    Comisión Total
                  </div>
                  <div className='font-medium text-blue-600 dark:text-blue-400'>
                    {formatCurrencyCLP(
                      selectedItem.comision_total ||
                        selectedItem.total_comision ||
                        selectedItem.comision ||
                        0
                    )}
                  </div>
                </div>
              </div>

              {selectedItem.distribucion_propina &&
                renderDistributionBlock(
                  'Distribución de Propina',
                  'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                  selectedItem.distribucion_propina,
                  'text-green-700 dark:text-green-300',
                  'text-green-600 dark:text-green-400'
                )}

              {selectedItem.comision_por_anfitriona &&
                renderDistributionBlock(
                  'Comisión por Anfitriona',
                  'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                  selectedItem.comision_por_anfitriona,
                  'text-blue-700 dark:text-blue-300',
                  'text-blue-600 dark:text-blue-400'
                )}

              <div className='p-4 bg-black text-white rounded-lg'>
                <div className='text-xs text-gray-400 uppercase mb-1'>Total Venta</div>
                <div className='text-2xl font-bold'>
                  {formatCurrencyCLP(selectedItem.total || 0)}
                </div>
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                  <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                    Tiempo
                  </div>
                  <div className='font-medium'>
                    {selectedItem.tiempo}
                    {selectedItem.tiempo && !selectedItem.tiempo.toString().includes('hrs')
                      ? ' min'
                      : ''}
                  </div>
                </div>
                <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                  <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                    Método de Pago
                  </div>
                  <div className='font-medium'>
                    {selectedItem.metodo_pago || selectedItem.metodoPago || 'N/A'}
                  </div>
                </div>
                <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                  <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                    Precio Habitación
                  </div>
                  <div className='font-medium'>
                    {formatCurrencyCLP(
                      selectedItem.precio_habitacion || selectedItem.precioHabitacion || 0
                    )}
                  </div>
                </div>
                <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                  <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                    Precio Servicio
                  </div>
                  <div className='font-medium'>
                    {formatCurrencyCLP(
                      selectedItem.precio_servicio || selectedItem.precioServicio || 0
                    )}
                  </div>
                </div>
                <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                  <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>IVA</div>
                  <div className='font-medium'>{formatCurrencyCLP(selectedItem.iva || 0)}</div>
                </div>
                <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                  <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                    Subtotal
                  </div>
                  <div className='font-medium'>
                    {formatCurrencyCLP(selectedItem.sub_total || selectedItem.subtotal || 0)}
                  </div>
                </div>
              </div>

              <div className='p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
                <div className='text-xs text-blue-600 dark:text-blue-400 uppercase mb-1'>
                  Comisión Total
                </div>
                <div className='text-xl font-bold text-blue-600 dark:text-blue-400'>
                  {formatCurrencyCLP(selectedItem.comision_total || 0)}
                </div>
              </div>

              {selectedItem.comision_por_anfitriona &&
                renderDistributionBlock(
                  'Comisión por Anfitriona',
                  'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                  selectedItem.comision_por_anfitriona,
                  'text-blue-700 dark:text-blue-300',
                  'text-blue-600 dark:text-blue-400'
                )}

              <div className='p-4 bg-black text-white rounded-lg'>
                <div className='text-xs text-gray-400 uppercase mb-1'>Total Servicio</div>
                <div className='text-2xl font-bold'>
                  {formatCurrencyCLP(selectedItem.total || 0)}
                </div>
              </div>
            </div>
          )}

          <div className='grid grid-cols-2 gap-4 mt-4'>
            <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
              <div className='text-xs text-gray-500 dark:text-gray-400 uppercase mb-1'>
                {selectedItemType === 'venta' ? 'Fecha de Venta' : 'Fecha y Hora'}
              </div>
              <div className='font-medium'>
                {detailDate ? formatDateToSpanish(detailDate) : 'N/A'}
              </div>
              <div className='text-sm text-gray-500'>
                {detailDate ? formatTimeFromDate(detailDate) : ''}
              </div>
            </div>
          </div>
        </div>

        <div className='shrink-0 border-t px-6 py-4'>
          <div className='flex justify-center'>
            <Button
              variant='outline'
              className='bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2'
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
