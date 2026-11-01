'use client';

import { useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PurchaseCodesPanel } from './PurchaseCodesPanel';
import { PurchaseFormProps } from './PurchaseFormComponents/types';
import { usePurchaseFormState } from './PurchaseFormComponents/usePurchaseFormState';
import { StepProgress } from './PurchaseFormComponents/StepProgress';
import { CatalogStep } from './PurchaseFormComponents/CatalogStep';
import { DetailsStep } from './PurchaseFormComponents/DetailsStep';
import { ConfirmationStep } from './PurchaseFormComponents/ConfirmationStep';
import { StepActions } from './PurchaseFormComponents/StepActions';
import { FloatingCart } from './PurchaseFormComponents/FloatingCart';

export type { PurchaseCatalogItem } from './PurchaseFormComponents/types';

export function PurchaseForm({ catalog, initialItems }: PurchaseFormProps) {
  const router = useRouter();
  const formId = useId();
  const state = usePurchaseFormState(catalog, initialItems);

  if (state.result) {
    return (
      <section className='mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-10'>
        <header className='space-y-2'>
          <p className='text-sm font-medium text-emerald-700'>Compra completada</p>
          <h1 className='flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl'>
            <ShoppingBag className='h-7 w-7' aria-hidden='true' />
            Compra registrada
          </h1>
          <p className='text-sm text-gray-600'>
            Los códigos se generaron por unidad y están agrupados para imprimir.
          </p>
        </header>
        <PurchaseCodesPanel
          folio={state.result.folio}
          codigos={state.result.codigos_generados ?? []}
          fechaCrea={state.result.fecha_crea}
          onClose={() => router.push('/purchases')}
        />
      </section>
    );
  }

  return (
    <section className='mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-10'>
      <header className='flex flex-wrap items-center justify-between gap-x-5 gap-y-2'>
        <div className='min-w-0'>
          <h1 className='text-2xl font-bold text-gray-900 sm:text-3xl'>Nueva compra</h1>
          <p className='mt-1 text-sm text-gray-600'>
            Ingresa mercadería a la bodega. Solo stock, no mueve caja.
          </p>
        </div>
        <Button asChild className='shrink-0 rounded-full'>
          <Link href='/purchases'>
            <ArrowLeft className='mr-2 h-4 w-4' aria-hidden='true' />
            Volver a compras
          </Link>
        </Button>
      </header>

      <div className='space-y-6'>
        <StepProgress step={state.step} />

        <form
          onSubmit={state.handleSubmit}
          className={`space-y-5 ${state.step === 1 && state.lines.length > 0 ? 'pb-24' : ''}`}
        >
          {state.step === 1 && (
            <CatalogStep
              catalog={catalog}
              filteredCatalog={state.filteredCatalog}
              lines={state.lines}
              search={state.search}
              setSearch={state.setSearch}
              addItem={state.addItem}
              removeItem={state.removeItem}
            />
          )}

          {state.step === 2 && (
            <DetailsStep
              lines={state.lines}
              setLines={state.setLines}
              total={state.total}
              proveedor={state.proveedor}
              setProveedor={state.setProveedor}
              telefono={state.telefono}
              setTelefono={state.setTelefono}
              observaciones={state.observaciones}
              setObservaciones={state.setObservaciones}
              metodoPago={state.metodoPago}
              setMetodoPago={state.setMetodoPago}
              formId={formId}
              adjustQuantity={state.adjustQuantity}
              removeItem={state.removeItem}
              changeLineFechas={state.changeLineFechas}
            />
          )}

          {state.step === 3 && (
            <ConfirmationStep
              lines={state.lines}
              total={state.total}
              proveedor={state.proveedor}
              telefono={state.telefono}
              metodoPago={state.metodoPago}
              observaciones={state.observaciones}
            />
          )}

          <StepActions
            step={state.step}
            saving={state.saving}
            linesCount={state.lines.length}
            total={state.total}
            onBack={() => state.setStep(state.step === 3 ? 2 : 1)}
            onNext={() => state.setStep(3)}
          />
        </form>

        {state.step === 1 && state.lines.length > 0 && (
          <FloatingCart
            count={state.lines.length}
            total={state.total}
            onContinue={() => state.setStep(2)}
          />
        )}
      </div>
    </section>
  );
}
