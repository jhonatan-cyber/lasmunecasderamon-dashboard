'use client';

import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import type { PaymentMethod } from '@/components/shared/selects/PaymentMethodSelect';
import { PrepagoNotice } from '@/components/shared/PrepagoNotice';
import { useServicioForm } from '@/hooks/private-rooms/useServicioForm';
import { PrivateRoomSummaryCard } from './PrivateRoomSummaryCard';
import { PagosMixtosSection } from './PagosMixtosSection';
import { ServicioPageHeader } from './new/ServicioPageHeader';
import { ServicioSelectsRow } from './new/ServicioSelectsRow';
import { ServicioPaymentRow } from './new/ServicioPaymentRow';
import { ServicioIncludedProduct } from './new/ServicioIncludedProduct';
import { ServicioConfirmModal } from './new/ServicioConfirmModal';
import { ServicioPrepagoChoiceModal, type PrepagoOpcion } from './new/ServicioPrepagoChoiceModal';

/**
 * Página «Datos Servicio» (salida a sala privada). Antes monolítica (603
 * líneas); ahora compone:
 *  - `useServicioForm` → estado, totales, efectos y flujo confirmar → POST
 *  - subcomponentes presentacionales en `components/private-rooms/new/`
 * API pública intacta: sigue siendo el default de `NewPrivateRoomPageClient`.
 */
export default function NuevoServicioPage() {
  const form = useServicioForm();
  const ivaRate = form.ivaRate;

  return (
    <>
      <ServicioPageHeader />

      <div className='p-4 sm:p-6 lg:p-8 bg-white mx-4 sm:mx-6 lg:mx-8 space-y-4 sm:space-y-6 shadow-md rounded-xl'>
        <ServicioSelectsRow
          formData={form.formData}
          setFormData={form.setFormData}
          habitaciones={form.habitaciones}
          anfitrionas={form.anfitrionas}
          clientes={form.clientes}
          maxHostesses={form.maxHostesses}
          maxClients={form.maxClients}
        />

        {Number(form.selectedRoom?.comision_anfitriona || 0) > 0 && (
          <ServicioIncludedProduct
            value={form.formData.producto_incluido_presentacion_id || ''}
            onChange={id =>
              form.setFormData(prev => ({ ...prev, producto_incluido_presentacion_id: id }))
            }
          />
        )}

        <ServicioPaymentRow
          formData={form.formData}
          setFormData={form.setFormData}
          setPagosMixtos={form.setPagosMixtos}
          isServicePriceLocked={form.isServicePriceLocked}
          disabledPaymentMethods={[...form.disabledPaymentMethods] as PaymentMethod[]}
          clientes={form.clientes}
          selectedClientData={form.selectedClientData}
        />

        <PrivateRoomSummaryCard
          room={form.selectedRoom}
          clientName={form.selectedClientName}
          hostessNames={form.selectedHostessNames}
          tiempoHabitacion={form.tiempoHabitacion}
          precioServicio={form.formData.precio_servicio}
          metodoPago={form.formData.metodo_pago}
          iva={form.formData.iva}
          total={form.total}
          desgloseTarjeta={form.desgloseTarjeta}
        />

        {form.formData.metodo_pago === 'mixto' && (
          <PagosMixtosSection
            pagosMixtos={form.pagosMixtos}
            onUpdate={form.setPagosMixtos}
            total={form.total}
            selectedClientData={form.selectedClientData}
            haySaldo={form.clientesConSaldo.length > 0}
            ivaRate={ivaRate}
          />
        )}

        {/* Total + Generar Servicio */}
        <div className='flex flex-col items-center justify-center mt-6 sm:mt-8 mb-4'>
          <PrepagoNotice
            saldo={form.selectedClientData?.saldo}
            total={form.total}
            className='mb-4 w-full max-w-md'
          />
          <span className='uppercase text-xs sm:text-sm text-gray-400 tracking-widest font-semibold mb-1'>
            TOTAL
          </span>
          <span className='text-lg sm:text-xl lg:text-2xl font-extrabold text-gray-900 dark:text-white mb-4'>
            <span className='ml-1'>{formatCurrencyCLP(form.total)}</span>
          </span>
          <Button
            type='button'
            size='sm'
            onClick={() => form.handleSubmit()}
            disabled={form.loading}
            className='gap-2 rounded-full bg-stone-900 text-white font-bold transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2 w-full sm:w-auto h-[48px] hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20 hover:-translate-y-0.5 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white dark:hover:text-stone-900 dark:hover:shadow-stone-100/20'
          >
            <ShoppingCart className='w-4 h-4' />
            Generar Servicio
          </Button>
        </div>
      </div>

      {form.showPrepagoChoiceModal && (
        <ServicioPrepagoChoiceModal
          clientesConSaldo={form.clientesConSaldo}
          montoDescontar={form.montoPrepagoBase}
          onCancel={() => form.setShowPrepagoChoiceModal(false)}
          onConfirm={(opcion: PrepagoOpcion, clienteId: string | null) => {
            form.setPrepagoOpcion(opcion);
            form.setPrepagoTitularId(clienteId);
            form.setShowPrepagoChoiceModal(false);
            // Vuelve a pasar por la validación para llegar al modal de confirmación.
            form.handleSubmit({ opcion, clienteId });
          }}
        />
      )}

      {form.showConfirmModal && (
        <ServicioConfirmModal
          loading={form.loading}
          onCancel={() => form.setShowConfirmModal(false)}
          onConfirm={form.confirmAndSubmit}
        />
      )}
    </>
  );
}
