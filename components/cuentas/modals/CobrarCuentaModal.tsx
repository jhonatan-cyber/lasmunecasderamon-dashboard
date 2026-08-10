'use client';

import { useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { useCuentaCobro, useCuentaDetail } from '@/hooks/cuentas';
import { summarizeCuentaDetalles } from '@/lib/utils/cuentas';
import { ProductCartTable } from '../tables/ProductCartTable';
import { CreditCard, DollarSign, Loader2 } from 'lucide-react';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { calcularPropina } from '@/lib/business/saleTotals';

function formatFecha(fechaStr?: string) {
  if (!fechaStr) return '-';
  if (fechaStr.includes('T')) {
    const date = new Date(fechaStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  }
  const [fecha] = fechaStr.split(' ');
  if (!fecha) return '-';
  const [y, m, d] = fecha.split('-');
  return `${d}-${m}-${y}`;
}

function formatHora(fechaStr?: string) {
  if (!fechaStr) return '-';
  if (fechaStr.includes('T')) {
    const date = new Date(fechaStr);
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }
  const parts = fechaStr.split(' ');
  if (parts[1]) {
    const [h, m] = parts[1].split(':');
    return `${h}:${m}`;
  }
  return '-';
}

interface CobrarCuentaModalProps {
  open: boolean;
  onClose: () => void;
  cuenta: any;
  onCuentaCobrada?: () => void;
  onOrderStatusChange?: () => void;
}

export default function CobrarCuentaModal({
  open,
  onClose,
  cuenta,
  onCuentaCobrada,
  onOrderStatusChange
}: CobrarCuentaModalProps) {
  const cuentaId = cuenta ? String(cuenta.id_cuenta ?? cuenta.id ?? '') : null;
  const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));

  const {
    searchRoom,
    setSearchRoom,
    isCobrando,
    metodoPago,
    setMetodoPago,
    propina,
    setPropina,
    propinaActiva,
    setPropinaActiva,
    habitacionId,
    setHabitacionId,
    showError: showMetodoPagoError,
    setShowError: setShowMetodoPagoError,
    habitacionesFiltradas,
    handleCobrarCuenta: cobrosHandleCobrar,
    resetStates,
    isChampagneProduct
  } = useCuentaCobro();

  const { cuenta: cuentaCompleta, loading, hasFetched } = useCuentaDetail(cuentaId, open);

  const cuentaActual = cuentaCompleta ?? cuenta;

  const detalleResumen = useMemo(
    () => summarizeCuentaDetalles(cuentaActual?.detalles ?? []),
    [cuentaActual?.detalles]
  );

  const anfitrionasArray = useMemo(
    () => cuentaActual?.usuarios?.map((usuario: any) => usuario.usuario_nombre) || [],
    [cuentaActual?.usuarios]
  );

  const extra = useMemo(
    () => (cuentaActual?.total ?? 0) - (cuentaActual?.sub_total ?? 0),
    [cuentaActual]
  );

  const hasChampagne = cuentaActual?.detalles?.some((item: any) => isChampagneProduct(item));
  const showLoading = loading || (open && !hasFetched);

  const productosTabla = useMemo(
    () =>
      detalleResumen.groupedDetalles.map((item, index) => {
        const hostessIds: number[] = item.hostess_id
          ? String(item.hostess_id)
              .split(',')
              .map((id: string) => Number(id.trim()))
          : [];
        return {
          id_producto: item.id_producto ?? item.producto_id ?? item.agrupacionKey ?? index,
          nombre:
            item.producto ||
            item.nombre ||
            `Producto ID: ${item.id_producto ?? item.producto_id ?? '-'}`,
          precio: item.precio || 0,
          cantidad: item.cantidad || 0,
          sub_total: item.sub_total || 0,
          categoria_nombre: item.categoria || item.categoria_nombre || '',
          comision: item.comision || 0,
          selectedHostesses: hostessIds
        };
      }),
    [detalleResumen.groupedDetalles]
  );

  const totalComisionProductos = useMemo(
    () => detalleResumen.groupedDetalles.reduce((sum, item) => sum + (item.comision || 0), 0),
    [detalleResumen.groupedDetalles]
  );

  const currentPropina = typeof propina === 'number' ? propina : 0;
  const totalFinal = (cuentaActual?.total || 0) + currentPropina;
  const habitacionValue = habitacionId ?? '';
  const searchRoomValue = searchRoom ?? '';

  useEffect(() => {
    if (!open) {
      resetStates();
    }
  }, [open, resetStates]);

  const handleCobrarCuenta = async () => {
    await cobrosHandleCobrar(
      cuentaActual,
      typeof propina === 'number' ? propina : null,
      metodoPago || '',
      () => {
        onClose();
        onCuentaCobrada?.();
        onOrderStatusChange?.();
      }
    );
  };

  const handleClose = () => {
    resetStates();
    onClose();
  };

  if (!cuenta || !open) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className='sm:max-w-4xl max-h-[90vh] flex flex-col p-0 bg-white rounded-xl shadow-md'>
        <DialogHeader className='shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-start text-xl font-semibold tracking-tight'>
            Cobrar Cuenta
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          {showLoading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900' />
              <span className='ml-2 text-black'>Cargando detalles...</span>
            </div>
          ) : (
            <div className='space-y-8 rounded-xl'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-12 border-b pb-6 rounded-xl'>
                <div className='space-y-2 text-sm text-gray-700'>
                  <div>
                    <span className='font-medium'>
                      <b>Código:</b>
                    </span>{' '}
                    <span className='font-normal'>{cuentaActual?.codigo || '-'}</span>
                  </div>
                  <div>
                    <span className='font-medium'>
                      <b>Cliente:</b>
                    </span>{' '}
                    <span className='font-normal'>{cuentaActual?.cliente_nombre || '-'}</span>
                  </div>
                  <div>
                    <span className='font-medium'>
                      <b>Fecha:</b>
                    </span>{' '}
                    <span className='font-normal'>{formatFecha(cuentaActual?.fecha_crea)}</span>
                  </div>
                  <div>
                    <span className='font-medium'>
                      <b>Hora:</b>
                    </span>{' '}
                    <span className='font-normal'>{formatHora(cuentaActual?.fecha_crea)}</span>
                  </div>
                  <div>
                    <span className='font-medium'>
                      <b>Anfitriona(s):</b>
                    </span>{' '}
                    <span className='font-normal'>
                      {anfitrionasArray.length > 0
                        ? anfitrionasArray.join(', ')
                        : 'Sin anfitrionas'}
                    </span>
                  </div>
                  <div>
                    <span className='font-medium'>
                      <b>Habitación:</b>
                    </span>{' '}
                    <span className='font-normal'>
                      {cuentaActual?.habitacion_numero || 'Sin habitación'}
                    </span>
                  </div>
                </div>

                <div className='space-y-3 text-sm text-gray-700'>
                  <div>
                    <Label className='block text-xs font-medium text-gray-500 mb-1'>
                      Método de pago <span className='text-red-500'>*</span>
                    </Label>
                    <div className='relative'>
                      <CreditCard className='absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none h-4 w-4' />
                      <Select value={metodoPago} onValueChange={setMetodoPago}>
                        <SelectTrigger
                          className={`w-full pl-8 border focus:ring-0 focus:border-black bg-transparent py-1 text-center text-sm text-gray-500 rounded-full ${
                            showMetodoPagoError && !metodoPago
                              ? 'border-red-300'
                              : 'border-gray-300'
                          }`}
                        >
                          <SelectValue placeholder='Seleccione un método de pago' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='efectivo'>Efectivo</SelectItem>
                          <SelectItem value='tarjeta'>Tarjeta</SelectItem>
                          <SelectItem value='transferencia'>Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {showMetodoPagoError && !metodoPago && (
                      <div className='text-xs text-red-500 mt-1'>
                        ⚠️ El método de pago es obligatorio
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className='block text-xs font-medium text-gray-500 mb-1'>
                      Propina ({propinaPct}%)
                    </Label>
                    <div className='flex items-center gap-3 py-2'>
                      <Checkbox
                        id='propina-checkbox'
                        checked={propinaActiva}
                        onCheckedChange={checked => {
                          const activa = checked === true;
                          setPropinaActiva(activa);
                          setPropina(calcularPropina(cuentaActual?.total || 0, propinaPct, activa));
                        }}
                      />
                      <label
                        htmlFor='propina-checkbox'
                        className='text-sm text-gray-700 cursor-pointer select-none'
                      >
                        Agregar propina del {propinaPct}%
                        {propinaActiva && (
                          <span className='ml-2 font-semibold text-blue-600'>
                            ({formatCurrencyNoDecimals(currentPropina)})
                          </span>
                        )}
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label className='block text-xs font-medium text-gray-500 mb-1'>
                      Total Comisión
                    </Label>
                    <div className='relative '>
                      <DollarSign className='absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none h-4 w-4' />
                      <Input
                        className='w-full pl-8 border border-gray-300 focus:ring-0 focus:border-gray-300 bg-transparent py-1 font-semibold text-black'
                        value={formatCurrencyNoDecimals(totalComisionProductos)}
                        disabled
                      />
                    </div>
                  </div>

                  {}
                  {anfitrionasArray.length > 0 && totalComisionProductos > 0 && (
                    <div className='mt-4 pt-4 border-t'>
                      <Label className='block text-xs font-medium text-gray-500 mb-2'>
                        Repartición de Comisiones
                      </Label>
                      <div className='space-y-2'>
                        {cuentaActual?.usuarios?.map((usuario: any) => {
                          const usuarioId = String(
                            usuario.usuario_id || usuario.id_usuario || usuario.id || ''
                          );
                          const comisionesAnfitriona = detalleResumen.groupedDetalles.reduce(
                            (sum, item) => {
                              const hostessIds = item.hostess_id
                                ? String(item.hostess_id)
                                    .split(',')
                                    .map((id: string) => id.trim())
                                    .filter(Boolean)
                                : [];
                              if (hostessIds.length > 0 && hostessIds.includes(usuarioId)) {
                                const comisionPorAnfitriona =
                                  (item.comision || 0) / hostessIds.length;
                                return sum + comisionPorAnfitriona;
                              }
                              return sum;
                            },
                            0
                          );
                          return (
                            <div
                              key={usuarioId}
                              className='flex justify-between items-center text-sm'
                            >
                              <span className='font-medium'>{usuario.usuario_nombre}</span>
                              <span className='font-semibold text-green-600'>
                                {formatCurrencyNoDecimals(comisionesAnfitriona)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold text-gray-700'>Productos</h3>
                  <span className='text-xs text-gray-500'>
                    {detalleResumen.uniqueProductCount} producto
                    {detalleResumen.uniqueProductCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <ProductCartTable
                  productos={productosTabla}
                  readOnly
                  commissionMode='raw'
                  forceShowHostesses={true}
                  anfitrionas={cuentaActual?.usuarios || []}
                />

                <div className='mt-4 flex justify-end'>
                  <div className='text-sm font-semibold text-gray-800'>
                    SUBTOTAL: {formatCurrencyNoDecimals(cuentaActual?.sub_total || 0)}
                    {extra > 0 && (
                      <div className='text-sm text-orange-600 font-normal'>
                        + Recargo anfitrionas: {formatCurrencyNoDecimals(extra)}
                      </div>
                    )}
                    {currentPropina > 0 && (
                      <div className='text-sm text-blue-600 font-normal'>
                        + Propina: {formatCurrencyNoDecimals(currentPropina)}
                      </div>
                    )}
                    <div className='text-md font-bold text-black'>
                      TOTAL FINAL: {formatCurrencyNoDecimals(totalFinal)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className='shrink-0 border-t px-6 py-4'>
          <div className='flex justify-center gap-4'>
            <Button
              size='sm'
              variant='outline'
              className='flex items-center gap-2 rounded-full px-8 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black w-full sm:w-auto text-sm sm:text-base border-gray-200 dark:border-gray-800'
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='bg-black text-white dark:bg-black dark:text-white dark:hover:bg-white! dark:hover:text-black! rounded-full px-8 hover:bg-white! hover:text-black! transition-all hover:scale-105 border-2'
              onClick={handleCobrarCuenta}
              disabled={isCobrando}
            >
              {isCobrando ? (
                <div className='flex items-center gap-2'>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  <span>Cobrando...</span>
                </div>
              ) : (
                'Cobrar Cuenta'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
