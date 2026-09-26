'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product, Presentacion } from '@/types/product';
import { FileText, Loader2, Plus } from 'lucide-react';
import { useProductForm } from '@/hooks/personal';
import { useChampagneTiers } from '@/hooks/personal/useChampagneTiers';
import { ProductBasicFields } from './ProductBasicFields';
import { ExistingPresentacionCard } from './ExistingPresentacionCard';
import { NewPresentacionRow } from './NewPresentacionRow';
import { GeneratedCodesPanel } from './GeneratedCodesPanel';
import { ChampagneTiersTable } from './ChampagneTiersTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Product | null;
  presentation?: Presentacion | null;
  categoryId: string | number;
  categoryName?: string;
  isLoading: boolean;
  isMutating: boolean;
  onSubmit?: (form: FormData) => void | Promise<void>;
}

export function ProductFormModal({
  open,
  onOpenChange,
  initialValues,
  presentation = null,
  categoryId,
  categoryName,
  isLoading,
  isMutating,
  onSubmit
}: ProductFormModalProps) {
  const [hideButtons] = useState(true);

  const handleSubmit = async (form: FormData) => {
    if (onSubmit) {
      await onSubmit(form);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='p-6 pb-2 border-b'>
          <DialogTitle className='text-xl font-bold'>
            {initialValues
              ? presentation
                ? `Editar presentación: ${presentation.nombre}`
                : 'Editar Producto'
              : 'Nuevo Producto'}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Formulario para crear o editar productos
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto p-6'>
          <ProductForm
            open={open}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleSubmit}
            initialValues={initialValues}
            presentation={presentation}
            categoryId={categoryId}
            categoryName={categoryName}
            isLoading={isLoading || isMutating}
            hideButtons={hideButtons}
          />
        </div>

        <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
            disabled={isMutating}
          >
            {initialValues && presentation ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button
            type='submit'
            form='product-form'
            className='bg-black text-white dark:bg-black dark:text-white  dark:hover:bg-white! dark:hover:text-black! rounded-full px-8 hover:bg-white! hover:text-black! transition-all hover:scale-105 border-2'
            disabled={isMutating}
          >
            {isMutating ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>
                  {initialValues
                    ? presentation
                      ? 'Guardando...'
                      : 'Actualizando...'
                    : 'Guardando...'}
                </span>
              </div>
            ) : (
              <span>{initialValues ? (presentation ? 'Guardar' : 'Actualizar') : 'Guardar'}</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ProductFormProps {
  open: boolean;
  onSubmit: (form: FormData) => void;
  onCancel: () => void;
  initialValues?: Product | null;
  presentation?: Presentacion | null;
  categoryId: string | number;
  categoryName?: string;
  isLoading: boolean;
  hideButtons?: boolean;
}

export function ProductForm({
  open,
  onSubmit,
  initialValues,
  presentation = null,
  categoryId,
  categoryName,
  isLoading,
  hideButtons = false
}: ProductFormProps) {
  const {
    form,
    errors,
    handleChange,
    handleSubmit,
    presentaciones,
    presentacionesError,
    addPresentacion,
    removePresentacion,
    updatePresentacion,
    setPresentacionFoto,
    setPresentacionFotoUrl,
    updateExistenteFoto,
    updateExistenteFotoUrl,
    existentes,
    unidadesTotal,
    unidadesCodigos,
    cargandoInventario,
    deleteExistente,
    editingPresId,
    editPresDraft,
    guardandoPres,
    startEditPres,
    cancelEditPres,
    changeEditPresDraft,
    saveEditPres,
    codigosSeleccionados,
    toggleCodigoSeleccionado,
    unidadesInactivas,
    stockExtra,
    changeStockExtra,
    agregarStock,
    agregandoStock,
    isEdit
  } = useProductForm({
    open,
    initialValues,
    categoryId,
    onSubmit,
    autoEditPresentation: presentation
  });

  const [dragRow, setDragRow] = useState<number | null>(null);

  const scoped = isEdit && presentation !== null;
  const esChampagne = /champan|champagne/.test(
    (categoryName || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  );
  const mostrarTiers = Boolean(isEdit && !scoped && esChampagne && initialValues?.id);

  const { tiers, cargandoTiers, guardandoTiers, guardarTiers, updateTierField } = useChampagneTiers(
    {
      open,
      mostrarTiers,
      productId: initialValues?.id
    }
  );

  const existentesVisibles = scoped
    ? existentes.filter(p => p.id === (presentation as Presentacion).id)
    : existentes;
  const codigosVisibles = scoped
    ? unidadesCodigos.filter(u => u.presentacion_id === (presentation as Presentacion).id)
    : unidadesCodigos;

  return (
    <form id='product-form' onSubmit={handleSubmit} className='space-y-6 py-2'>
      {scoped && initialValues && (
        <p className='text-xs text-gray-500 dark:text-gray-400 ml-1 -mb-2'>
          Producto: <span className='font-semibold'>{initialValues.name}</span>
        </p>
      )}

      {!scoped && (
        <ProductBasicFields
          form={form}
          errors={errors}
          handleChange={handleChange}
          isLoading={isLoading}
          isEdit={isEdit}
        />
      )}

      <div className='space-y-3'>
        <div className='flex items-center justify-between ml-1'>
          <label className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400'>
            {scoped
              ? 'Presentación'
              : `Presentaciones${isEdit ? ` (Stock total: ${unidadesTotal})` : ''}`}
          </label>
          {!scoped && (
            <button
              type='button'
              onClick={addPresentacion}
              disabled={isLoading}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-black text-white dark:bg-white dark:text-black hover:scale-105 transition-all disabled:opacity-50'
            >
              <Plus className='w-3.5 h-3.5' />
              Agregar
            </button>
          )}
          {scoped && (
            <button
              type='button'
              onClick={addPresentacion}
              disabled={isLoading}
              title='Agregar otra presentación al producto'
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-black text-white dark:bg-white dark:text-black hover:scale-105 transition-all disabled:opacity-50'
            >
              <Plus className='w-3.5 h-3.5' />
              Otra presentación
            </button>
          )}
        </div>

        {isEdit && cargandoInventario && (
          <p className='text-xs text-gray-400 ml-1'>Cargando presentaciones...</p>
        )}

        {isEdit && existentesVisibles.length > 0 && (
          <div className='space-y-2'>
            {existentesVisibles.map(p => (
              <ExistingPresentacionCard
                key={p.id}
                presentacion={p}
                isEditing={editingPresId === p.id}
                editPresDraft={editPresDraft}
                changeEditPresDraft={changeEditPresDraft}
                cancelEditPres={cancelEditPres}
                saveEditPres={saveEditPres}
                guardandoPres={guardandoPres}
                isLoading={isLoading}
                unidadesCodigos={unidadesCodigos}
                codigosSeleccionados={codigosSeleccionados}
                toggleCodigoSeleccionado={toggleCodigoSeleccionado}
                startEditPres={startEditPres}
                deleteExistente={deleteExistente}
                updateExistenteFoto={updateExistenteFoto}
                updateExistenteFotoUrl={updateExistenteFotoUrl}
                stockExtra={stockExtra}
                changeStockExtra={changeStockExtra}
                agregarStock={agregarStock}
                agregandoStock={agregandoStock}
                defaultFoto={initialValues?.foto}
              />
            ))}
          </div>
        )}

        {presentaciones.map((p, i) => (
          <NewPresentacionRow
            key={i}
            presentacion={p}
            index={i}
            isLoading={isLoading}
            dragRow={dragRow}
            onDragRowChange={setDragRow}
            onUpdate={(field, value) => updatePresentacion(i, field as any, value)}
            onRemove={() => removePresentacion(i)}
            onFotoFile={file => setPresentacionFoto(i, file)}
            onFotoUrl={url => setPresentacionFotoUrl(i, url)}
          />
        ))}

        {!scoped && presentaciones.length === 0 && (!isEdit || existentes.length === 0) && (
          <p className='text-[11px] text-gray-400 ml-1'>
            {isEdit
              ? 'Sin presentaciones registradas.'
              : 'Agrega al menos una presentación con su stock: cada unidad genera un código único (LM-000001, ...) para pegar al producto.'}
          </p>
        )}
        {presentacionesError && (
          <p role='alert' className='text-red-500 text-xs mt-1 ml-1 font-medium'>
            {presentacionesError}
          </p>
        )}

        {isEdit && (
          <GeneratedCodesPanel
            isScoped={scoped}
            codesCount={codigosVisibles.length}
            unidadesTotal={unidadesTotal}
            unidadesInactivas={unidadesInactivas}
            cargandoInventario={cargandoInventario}
            codigosVisibles={codigosVisibles}
          />
        )}
      </div>

      {mostrarTiers && (
        <ChampagneTiersTable
          tiers={tiers}
          cargandoTiers={cargandoTiers}
          guardandoTiers={guardandoTiers}
          isLoading={isLoading}
          onSave={guardarTiers}
          onFieldChange={updateTierField}
        />
      )}

      {!scoped && (
        <div className='space-y-2'>
          <label
            htmlFor='prod-desc'
            className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
          >
            Descripción
          </label>
          <div className='relative group'>
            <span className='absolute left-4 top-4 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
              <FileText className='w-5 h-5' />
            </span>
            <textarea
              id='prod-desc'
              name='description'
              value={form.description}
              onChange={handleChange as any}
              placeholder='Detalles informativos del producto...'
              disabled={isLoading}
              className='w-full min-h-[100px] pl-12 pr-4 py-3 rounded-2xl'
            />
          </div>
        </div>
      )}

      {!scoped && (
        <div className='space-y-2'>
          <label
            htmlFor='prod-ml-shot'
            className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
          >
            Ml por shot
          </label>
          <Input
            id='prod-ml-shot'
            name='ml_shot'
            value={form.ml_shot}
            onChange={handleChange}
            placeholder='Ej: 50'
            disabled={isLoading}
            inputMode='numeric'
            className='h-12 rounded-2xl'
          />
          <p className='text-[11px] text-gray-400 dark:text-gray-500 ml-1'>
            Ml que se sirve en cada shot de este producto. En vacío usa el valor global de Ajustes →
            Bar.
          </p>
        </div>
      )}
    </form>
  );
}
