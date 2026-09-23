'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UnitLabelSelector } from './UnitLabelSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product, Presentacion } from '@/types/product';
import {
  Barcode,
  Image,
  DollarSign,
  FileText,
  Package,
  Link as LinkIcon,
  Loader2,
  Plus,
  X,
  Trash2,
  Pencil,
  ChevronDown,
  Boxes,
  Camera
} from 'lucide-react';
import { useProductForm } from '@/hooks/personal';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
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
  const [mostrarCodigos, setMostrarCodigos] = useState(false);
  const [urlExistente, setUrlExistente] = useState<Record<string, string>>({});
  const [tiers, setTiers] = useState<{ anfitrionas: number; precio: string; comision: string }[]>(
    []
  );
  const [cargandoTiers, setCargandoTiers] = useState(false);
  const [guardandoTiers, setGuardandoTiers] = useState(false);

  const scoped = isEdit && presentation !== null;
  const esChampagne = /champan|champagne/.test(
    (categoryName || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  );
  const mostrarTiers = Boolean(isEdit && !scoped && esChampagne && initialValues?.id);

  const formatMiles = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  useEffect(() => {
    if (!mostrarTiers || !open || !initialValues?.id) return;
    let cancelled = false;
    setCargandoTiers(true);
    fetch(`/api/products/${initialValues.id}/tiers`)
      .then(res => res.json().catch(() => ({})))
      .then(data => {
        if (cancelled) return;
        const rows = data.success && Array.isArray(data.data) ? data.data : [];
        const base =
          rows.length > 0
            ? rows
            : [
                { anfitrionas: 1, precio: 120000, comision: 40000 },
                { anfitrionas: 2, precio: 120000, comision: 40000 },
                { anfitrionas: 3, precio: 160000, comision: 60000 },
                { anfitrionas: 4, precio: 180000, comision: 80000 },
                { anfitrionas: 5, precio: 200000, comision: 100000 }
              ];
        setTiers(
          base.map((t: any) => ({
            anfitrionas: Number(t.anfitrionas),
            precio: formatMiles(String(t.precio ?? '')),
            comision: formatMiles(String(t.comision ?? ''))
          }))
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCargandoTiers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mostrarTiers, open, initialValues?.id]);

  const guardarTiers = async () => {
    if (!initialValues?.id) return;
    setGuardandoTiers(true);
    try {
      const res = await fetch(`/api/products/${initialValues.id}/tiers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiers: tiers.map(t => ({
            anfitrionas: t.anfitrionas,
            precio: Number(String(t.precio).replace(/\./g, '')) || 0,
            comision: Number(String(t.comision).replace(/\./g, '')) || 0
          }))
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || 'No se pudo guardar la tabla');
        return;
      }
      toast.success('Tabla de precios actualizada');
    } catch {
      toast.error('Error de red al guardar la tabla');
    } finally {
      setGuardandoTiers(false);
    }
  };
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
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <label
              htmlFor='prod-code'
              className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
            >
              Código
            </label>
            <div className='relative group'>
              <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
                <Barcode className='w-5 h-5' />
              </span>
              <Input
                id='prod-code'
                name='code'
                value={form.code}
                readOnly
                className='h-12 pl-12 rounded-2xl bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 cursor-not-allowed font-mono text-sm'
              />
            </div>
            {errors.code && (
              <p className='text-red-500 text-xs mt-1 ml-1 font-medium'>{errors.code}</p>
            )}
          </div>

          <div className='space-y-2'>
            <label
              htmlFor='prod-name'
              className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
            >
              Nombre del Producto
            </label>
            <div className='relative group'>
              <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
                <Package className='w-5 h-5' />
              </span>
              <Input
                id='prod-name'
                name='name'
                value={form.name}
                onChange={handleChange}
                placeholder='Ej: Cerveza Corona 330ml'
                disabled={isLoading}
                readOnly={isEdit}
                title={isEdit ? 'El nombre no se puede editar' : undefined}
                className={`h-12 pl-12 ${isEdit ? 'bg-gray-100 dark:bg-slate-800 cursor-not-allowed' : ''}`}
              />
            </div>
            {errors.name && (
              <p className='text-red-500 text-xs mt-1 ml-1 font-medium'>{errors.name}</p>
            )}
          </div>
        </div>
      )}

      {}
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
              <div
                key={p.id}
                className='p-2.5 pl-4 rounded-2xl bg-gray-100 dark:bg-slate-800 space-y-2'
              >
                {editingPresId === p.id ? (
                  <div className='space-y-2'>
                    <div className='grid grid-cols-2 gap-2'>
                      <div className='col-span-2 space-y-1'>
                        <label className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'>
                          Nombre
                        </label>
                        <Input
                          value={editPresDraft.nombre}
                          onChange={e => changeEditPresDraft('nombre', e.target.value)}
                          placeholder='Nombre (ej. 750 ml)'
                          disabled={isLoading || guardandoPres}
                          className='h-10 bg-white dark:bg-slate-900'
                        />
                      </div>
                      <div className='space-y-1'>
                        <label className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'>
                          Código de barras
                        </label>
                        <Input
                          value={editPresDraft.codigo_barras}
                          onChange={e => changeEditPresDraft('codigo_barras', e.target.value)}
                          placeholder='Código de barras'
                          disabled={isLoading || guardandoPres}
                          className='h-10 bg-white dark:bg-slate-900 font-mono text-sm'
                        />
                      </div>
                      <div className='space-y-1'>
                        <label className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'>
                          Precio compra
                        </label>
                        <Input
                          value={editPresDraft.precio_compra}
                          onChange={e => changeEditPresDraft('precio_compra', e.target.value)}
                          placeholder='Precio compra'
                          disabled={isLoading || guardandoPres}
                          inputMode='numeric'
                          className='h-10 bg-white dark:bg-slate-900'
                        />
                      </div>
                      <div className='space-y-1'>
                        <label className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'>
                          Precio venta
                        </label>
                        <Input
                          value={editPresDraft.precio_venta}
                          onChange={e => changeEditPresDraft('precio_venta', e.target.value)}
                          placeholder='Precio venta'
                          disabled={isLoading || guardandoPres}
                          inputMode='numeric'
                          className='h-10 bg-white dark:bg-slate-900'
                        />
                      </div>
                      <div className='space-y-1'>
                        <label className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'>
                          Comisión
                        </label>
                        <Input
                          value={editPresDraft.comision}
                          onChange={e => changeEditPresDraft('comision', e.target.value)}
                          placeholder='Comisión (0 = sin comisión)'
                          disabled={isLoading || guardandoPres}
                          inputMode='numeric'
                          className='h-10 bg-white dark:bg-slate-900'
                        />
                      </div>
                    </div>
                    <div className='space-y-1'>
                      <label className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'>
                        Stock (actual: {p.stock ?? 0})
                      </label>
                      <Input
                        value={editPresDraft.stock}
                        onChange={e => changeEditPresDraft('stock', e.target.value)}
                        placeholder='Stock'
                        disabled={isLoading || guardandoPres}
                        inputMode='numeric'
                        className='h-10 bg-white dark:bg-slate-900'
                      />
                      <p className='text-[11px] text-gray-400 ml-1'>
                        Al subir se generan códigos nuevos. Al bajar, selecciona abajo los códigos a
                        desactivar (no se eliminan).
                      </p>
                    </div>
                    {(() => {
                      const actual = p.stock ?? 0;
                      const deseado = Number((editPresDraft.stock || '').replace(/\./g, ''));
                      const aDesactivar =
                        Number.isInteger(deseado) && deseado < actual ? actual - deseado : 0;
                      if (aDesactivar <= 0) return null;
                      const activas = unidadesCodigos.filter(
                        u => u.presentacion_id === p.id && u.estado === 'almacen'
                      );
                      return (
                        <div className='space-y-1.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-2.5'>
                          <p className='text-[11px] font-semibold text-amber-700 dark:text-amber-400 ml-1'>
                            Selecciona {aDesactivar} código(s) a desactivar (
                            {codigosSeleccionados.length}/{aDesactivar})
                          </p>
                          <div className='flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1'>
                            {activas.map(u => {
                              const checked = codigosSeleccionados.includes(u.id);
                              return (
                                <label
                                  key={u.id}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-mono text-xs cursor-pointer border transition-colors ${
                                    checked
                                      ? 'bg-amber-200 dark:bg-amber-800/50 border-amber-400 text-amber-900 dark:text-amber-200'
                                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'
                                  }`}
                                >
                                  <input
                                    type='checkbox'
                                    checked={checked}
                                    onChange={() => toggleCodigoSeleccionado(u.id)}
                                    className='accent-amber-600 w-3.5 h-3.5'
                                  />
                                  <span>{u.codigo_barras || u.codigo}</span>
                                  <span className='ml-2 font-sans text-xs'>
                                    {u.compra_folio
                                      ? `Compra ${u.compra_folio}`
                                      : 'Sin compra asociada'}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                    <div className='flex justify-end gap-2'>
                      <button
                        type='button'
                        onClick={cancelEditPres}
                        disabled={guardandoPres}
                        className='px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 dark:border-slate-600 disabled:opacity-50'
                      >
                        Cancelar
                      </button>
                      <button
                        type='button'
                        onClick={saveEditPres}
                        disabled={guardandoPres}
                        className='px-3 py-1.5 text-xs font-semibold rounded-full bg-black text-white dark:bg-white dark:text-black disabled:opacity-50'
                      >
                        {guardandoPres ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className='flex items-center gap-2'>
                      {/* eslint-disable-next-line @next/next/no-img-element -- preview local/blob o ruta interna */}
                      <img
                        src={
                          p.foto && p.foto !== 'default.png'
                            ? p.foto.startsWith('http') || p.foto.startsWith('blob:')
                              ? p.foto
                              : `/api/images/products/${p.foto}`
                            : initialValues?.foto && initialValues.foto !== 'default.png'
                              ? initialValues.foto.startsWith('http')
                                ? initialValues.foto
                                : `/api/images/products/${initialValues.foto}`
                              : '/api/images/products/default.png'
                        }
                        alt={p.nombre}
                        className='w-11 h-11 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0 bg-white'
                      />
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-semibold truncate'>{p.nombre}</p>
                        <p className='text-xs text-gray-500'>
                          {p.codigo_barras ? (
                            <span className='font-mono'>Cód. barras: {p.codigo_barras}</span>
                          ) : (
                            <span>Sin código de barras</span>
                          )}
                          <span className='mx-1'>•</span>
                          <span>Compra: {formatCurrencyCLP(p.precio_compra ?? 0)}</span>
                        </p>
                      </div>
                      <span className='px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0'>
                        {p.stock ?? 0} un.
                      </span>
                      <label
                        title='Cambiar foto'
                        className='p-2 rounded-full text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors cursor-pointer shrink-0'
                      >
                        <input
                          type='file'
                          accept='image/*'
                          disabled={isLoading}
                          className='hidden'
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) updateExistenteFoto(p.id, file);
                            e.target.value = '';
                          }}
                        />
                        <Camera className='w-4 h-4' />
                      </label>
                      <button
                        type='button'
                        onClick={() => startEditPres(p)}
                        disabled={isLoading || editingPresId === p.id}
                        title='Editar presentación'
                        className='p-2 rounded-full text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50 shrink-0'
                      >
                        <Pencil className='w-4 h-4' />
                      </button>
                      <button
                        type='button'
                        onClick={() => deleteExistente(p.id)}
                        disabled={isLoading}
                        title='Eliminar presentación'
                        className='p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 shrink-0'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    </div>
                    <div className='flex items-center gap-2 pl-6'>
                      <Input
                        value={stockExtra[p.id] || ''}
                        onChange={e => changeStockExtra(p.id, e.target.value)}
                        placeholder='Cantidad a agregar'
                        disabled={isLoading || agregandoStock}
                        inputMode='numeric'
                        className='h-9 text-sm'
                      />
                      <button
                        type='button'
                        onClick={() => agregarStock(p.id)}
                        disabled={isLoading || agregandoStock}
                        title='Generar códigos para esta presentación'
                        className='flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-full bg-blue-600 text-white hover:scale-105 transition-all disabled:opacity-50 shrink-0'
                      >
                        <Plus className='w-3.5 h-3.5' />
                        Stock
                      </button>
                    </div>
                    <div className='flex items-center gap-2 pl-6'>
                      <div className='relative flex-1'>
                        <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10'>
                          <LinkIcon className='w-3.5 h-3.5' />
                        </span>
                        <Input
                          value={urlExistente[p.id] || ''}
                          onChange={e =>
                            setUrlExistente(prev => ({ ...prev, [p.id]: e.target.value }))
                          }
                          placeholder='URL de imagen'
                          disabled={isLoading}
                          className='h-9 pl-9 text-sm'
                        />
                      </div>
                      <button
                        type='button'
                        onClick={() => {
                          updateExistenteFotoUrl(p.id, urlExistente[p.id] || '');
                          setUrlExistente(prev => ({ ...prev, [p.id]: '' }));
                        }}
                        disabled={isLoading}
                        title='Aplicar URL como foto'
                        className='px-3 py-2 text-xs font-semibold rounded-full border border-gray-300 dark:border-slate-600 hover:scale-105 transition-all disabled:opacity-50 shrink-0'
                      >
                        Aplicar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {presentaciones.map((p, i) => (
          <div
            key={i}
            className='p-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-2'
          >
            <div className='flex items-center gap-2'>
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragRow(i);
                }}
                onDragLeave={() => setDragRow(prev => (prev === i ? null : prev))}
                onDrop={e => {
                  e.preventDefault();
                  setDragRow(prev => (prev === i ? null : prev));
                  const file = e.dataTransfer.files?.[0];
                  if (file) setPresentacionFoto(i, file);
                }}
                className={`relative w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                  dragRow === i
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800'
                }`}
              >
                {p.fotoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- preview local temporal
                  <img
                    src={p.fotoPreview}
                    alt={`Presentación ${i + 1}`}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center text-gray-300'>
                    {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative lucide icon */}
                    <Image className='w-5 h-5' aria-hidden='true' />
                  </div>
                )}
                <label
                  className='absolute inset-0 cursor-pointer'
                  title='Arrastrar o elegir imagen'
                >
                  <input
                    type='file'
                    accept='image/*'
                    disabled={isLoading}
                    className='hidden'
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) setPresentacionFoto(i, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-bold uppercase tracking-wider text-gray-400'>
                  Presentación {i + 1}
                </p>
                <p className='text-[11px] text-gray-400'>Arrastra o toca la imagen</p>
              </div>
              <button
                type='button'
                onClick={() => removePresentacion(i)}
                disabled={isLoading}
                title='Quitar presentación'
                className='p-2.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 shrink-0'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              <div className='relative group'>
                <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
                  <Boxes className='w-4 h-4' />
                </span>
                <Input
                  value={p.nombre}
                  onChange={e => updatePresentacion(i, 'nombre', e.target.value)}
                  placeholder='Ej: 750 ml'
                  disabled={isLoading}
                  className='h-11 pl-11'
                />
              </div>
              <div className='relative group'>
                <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
                  <Barcode className='w-4 h-4' />
                </span>
                <Input
                  value={p.codigo_barras}
                  onChange={e => updatePresentacion(i, 'codigo_barras', e.target.value)}
                  placeholder='Código de barras (opcional)'
                  disabled={isLoading}
                  className='h-11 pl-11 font-mono text-sm'
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-2 items-center'>
              <div className='relative group'>
                <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
                  <DollarSign className='w-4 h-4' />
                </span>
                <Input
                  value={p.precio_compra}
                  onChange={e => updatePresentacion(i, 'precio_compra', e.target.value)}
                  placeholder='Precio compra'
                  disabled={isLoading}
                  inputMode='numeric'
                  className='h-11 pl-11'
                />
              </div>
              <div className='relative group'>
                <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors'>
                  <Package className='w-4 h-4' />
                </span>
                <Input
                  value={p.stock}
                  onChange={e => updatePresentacion(i, 'stock', e.target.value)}
                  placeholder='Stock'
                  disabled={isLoading}
                  inputMode='numeric'
                  className='h-11 pl-11'
                />
              </div>
            </div>
            <div className='relative group'>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10'>
                <LinkIcon className='w-4 h-4' />
              </span>
              <Input
                value={p.fotoUrl}
                onChange={e => setPresentacionFotoUrl(i, e.target.value)}
                placeholder='URL de imagen (opcional)'
                disabled={isLoading || !!p.foto}
                className='h-10 pl-10 text-sm'
              />
            </div>
          </div>
        ))}

        {!scoped && presentaciones.length === 0 && (!isEdit || existentes.length === 0) && (
          <p className='text-[11px] text-gray-400 ml-1'>
            {isEdit
              ? 'Sin presentaciones registradas.'
              : 'Agrega al menos una presentación con su stock: cada unidad genera un código único (LM-000001, ...) para pegar al producto.'}
          </p>
        )}
        {presentacionesError && (
          <p className='text-red-500 text-xs mt-1 ml-1 font-medium'>{presentacionesError}</p>
        )}

        {isEdit && (
          <div className='rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden'>
            <button
              type='button'
              onClick={() => setMostrarCodigos(v => !v)}
              className='w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors'
            >
              <span className='text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400'>
                Códigos generados ({scoped ? codigosVisibles.length : unidadesTotal}
                {unidadesInactivas > 0 ? ` · ${unidadesInactivas} inactivos` : ''})
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${mostrarCodigos ? 'rotate-180' : ''}`}
              />
            </button>
            {mostrarCodigos && (
              <div className='p-3'>
                {codigosVisibles.length === 0 ? (
                  <p className='text-xs text-gray-400 text-center py-2'>
                    {cargandoInventario ? 'Cargando...' : 'Sin códigos generados'}
                  </p>
                ) : (
                  <UnitLabelSelector units={codigosVisibles} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {mostrarTiers && (
        <div className='space-y-3'>
          <div className='flex items-center justify-between ml-1'>
            <label className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400'>
              Precios champagne por anfitrionas
            </label>
            <button
              type='button'
              onClick={guardarTiers}
              disabled={isLoading || guardandoTiers || cargandoTiers}
              className='px-3 py-1.5 text-xs font-semibold rounded-full bg-black text-white dark:bg-white dark:text-black hover:scale-105 transition-all disabled:opacity-50'
            >
              {guardandoTiers ? 'Guardando...' : 'Guardar tabla'}
            </button>
          </div>
          {cargandoTiers ? (
            <p className='text-xs text-gray-400 ml-1'>Cargando tabla...</p>
          ) : (
            <div className='space-y-2'>
              <div className='grid grid-cols-[3rem_1fr_1fr] gap-2 items-center px-1'>
                <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>
                  N°
                </span>
                <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>
                  Precio
                </span>
                <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>
                  Comisión
                </span>
              </div>
              {tiers.map((t, i) => (
                <div
                  key={t.anfitrionas}
                  className='grid grid-cols-[3rem_1fr_1fr] gap-2 items-center'
                >
                  <span className='inline-flex items-center justify-center h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-sm'>
                    {t.anfitrionas}
                  </span>
                  <Input
                    value={t.precio}
                    onChange={e =>
                      setTiers(prev =>
                        prev.map((x, j) =>
                          j === i ? { ...x, precio: formatMiles(e.target.value) } : x
                        )
                      )
                    }
                    placeholder='0'
                    disabled={isLoading || guardandoTiers}
                    inputMode='numeric'
                    className='h-11'
                  />
                  <Input
                    value={t.comision}
                    onChange={e =>
                      setTiers(prev =>
                        prev.map((x, j) =>
                          j === i ? { ...x, comision: formatMiles(e.target.value) } : x
                        )
                      )
                    }
                    placeholder='0'
                    disabled={isLoading || guardandoTiers}
                    inputMode='numeric'
                    className='h-11'
                  />
                </div>
              ))}
              <p className='text-[11px] text-gray-400 ml-1'>
                En ventas, al elegir N anfitrionas el precio y la comisión se toman de esta tabla.
              </p>
            </div>
          )}
        </div>
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
    </form>
  );
}
