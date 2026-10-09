'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnitLabelSelector } from '@/components/products/UnitLabelSelector';
import type { LabelUnit } from '@/lib/utils/unitLabelGroups';
import type { PurchaseGeneratedCode } from '@/types/purchase';
import { PURCHASE_BUTTON_CLASS } from './buttonStyles';

/** Adapta los códigos devueltos por la compra al formato de etiquetas imprimibles. */
export function purchaseCodesToLabelUnits(
  codes: PurchaseGeneratedCode[],
  fechaCrea?: string | null
): LabelUnit[] {
  return codes.map(code => ({
    id: code.id,
    codigo: code.codigo,
    codigo_barras: code.codigo_barras,
    compra_folio: code.compra_folio,
    fecha_crea: fechaCrea ?? null,
    estado: 'almacen',
    producto_nombre: code.producto_nombre,
    presentacion_nombre: code.presentacion_nombre
  }));
}

interface PurchaseCodesPanelProps {
  folio: string;
  codigos: PurchaseGeneratedCode[];
  fechaCrea?: string | null;
  onClose: () => void;
}

export function PurchaseCodesPanel({
  folio,
  codigos,
  fechaCrea,
  onClose
}: PurchaseCodesPanelProps) {
  const units = purchaseCodesToLabelUnits(codigos, fechaCrea);

  return (
    <div className='space-y-4 py-2'>
      <div className='flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4'>
        <CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0 text-emerald-600' aria-hidden='true' />
        <div className='min-w-0'>
          <p className='font-semibold text-emerald-900'>Compra {folio} registrada</p>
          <p className='text-sm text-emerald-800'>
            {codigos.length === 1
              ? '1 código generado, agrupado por producto.'
              : `${codigos.length} códigos generados, agrupados por producto.`}{' '}
            Imprímelos y pégalos en los envases.
          </p>
        </div>
      </div>

      {units.length === 0 ? (
        <p className='py-2 text-center text-sm text-gray-400'>
          Sin códigos generados en esta compra.
        </p>
      ) : (
        <UnitLabelSelector
          units={units}
          defaultGroupBy='product'
          buttonClassName={PURCHASE_BUTTON_CLASS}
        />
      )}

      <div className='flex justify-end'>
        <Button type='button' onClick={onClose} className={`${PURCHASE_BUTTON_CLASS} px-6`}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
