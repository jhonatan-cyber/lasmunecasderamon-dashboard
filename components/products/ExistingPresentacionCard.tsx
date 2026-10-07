'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { Camera, Pencil, Trash2, Plus, Link as LinkIcon } from 'lucide-react';
import { CodeDeactivationPicker } from './CodeDeactivationPicker';
import type { Presentacion } from '@/types/product';
import type { UnidadCodigoItem } from '@/hooks/personal/useProductForm';

interface EditPresDraft {
  nombre: string;
  codigo_barras: string;
  precio_compra: string;
  precio_venta: string;
  comision: string;
  ml_botella: string;
  stock: string;
}

interface ExistingPresentacionCardProps {
  presentacion: Presentacion;
  isEditing: boolean;
  editPresDraft: EditPresDraft;
  changeEditPresDraft: (field: keyof EditPresDraft, value: string) => void;
  cancelEditPres: () => void;
  saveEditPres: () => void;
  guardandoPres: boolean;
  isLoading: boolean;
  unidadesCodigos: UnidadCodigoItem[];
  codigosSeleccionados: string[];
  toggleCodigoSeleccionado: (id: string) => void;
  startEditPres: (p: Presentacion) => void;
  deleteExistente: (id: string) => void;
  updateExistenteFoto: (id: string, file: File) => void;
  updateExistenteFotoUrl: (id: string, url: string) => void;
  stockExtra: Record<string, string>;
  changeStockExtra: (id: string, value: string) => void;
  agregarStock: (id: string) => void;
  agregandoStock: boolean;
  defaultFoto?: string | null;
}

export function ExistingPresentacionCard({
  presentacion: p,
  isEditing,
  editPresDraft,
  changeEditPresDraft,
  cancelEditPres,
  saveEditPres,
  guardandoPres,
  isLoading,
  unidadesCodigos,
  codigosSeleccionados,
  toggleCodigoSeleccionado,
  startEditPres,
  deleteExistente,
  updateExistenteFoto,
  updateExistenteFotoUrl,
  stockExtra,
  changeStockExtra,
  agregarStock,
  agregandoStock,
  defaultFoto
}: ExistingPresentacionCardProps) {
  const [urlInput, setUrlInput] = useState('');

  return (
    <div className='p-2.5 pl-4 rounded-2xl bg-gray-100 dark:bg-slate-800 space-y-2'>
      {isEditing ? (
        <div className='space-y-2'>
          <div className='flex flex-col gap-3 rounded-xl border p-3'>
            <div className='flex items-center gap-3'>
              {/* eslint-disable-next-line @next/next/no-img-element -- Vista previa de la foto existente. */}
              <img
                src={
                  p.foto && p.foto !== 'default.png'
                    ? p.foto.startsWith('http') || p.foto.startsWith('blob:')
                      ? p.foto
                      : `/api/images/products/${p.foto}`
                    : defaultFoto && defaultFoto !== 'default.png'
                      ? defaultFoto.startsWith('http')
                        ? defaultFoto
                        : `/api/images/products/${defaultFoto}`
                      : '/api/images/products/default.png'
                }
                alt={`Imagen de ${p.nombre}`}
                className='size-20 shrink-0 rounded-xl object-contain'
              />
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <label htmlFor={`edit-pres-foto-${p.id}`} className='text-xs font-semibold'>
                  Imagen de la presentación
                </label>
                <Input
                  id={`edit-pres-foto-${p.id}`}
                  type='file'
                  accept='image/jpeg,image/png,image/gif,image/webp'
                  disabled={isLoading || guardandoPres}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) updateExistenteFoto(p.id, file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
            <div className='flex items-end gap-2'>
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <label htmlFor={`edit-pres-foto-url-${p.id}`} className='text-xs font-semibold'>
                  URL de imagen
                </label>
                <Input
                  id={`edit-pres-foto-url-${p.id}`}
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder='https://...'
                  disabled={isLoading || guardandoPres}
                />
              </div>
              <button
                type='button'
                disabled={isLoading || guardandoPres || !urlInput.trim()}
                onClick={() => {
                  updateExistenteFotoUrl(p.id, urlInput);
                  setUrlInput('');
                }}
                className='shrink-0 rounded-full border px-3 py-2 text-xs font-semibold disabled:opacity-50'
              >
                Aplicar URL
              </button>
            </div>
            <p className='text-xs text-muted-foreground'>
              JPG, PNG, GIF o WEBP, hasta 5 MB. La imagen se guarda al seleccionar el archivo o
              aplicar la URL.
            </p>
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div className='col-span-2 space-y-1'>
              <label
                htmlFor='edit-pres-nombre'
                className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'
              >
                Presentación
              </label>
              <Input
                id='edit-pres-nombre'
                value={editPresDraft.nombre}
                onChange={e => changeEditPresDraft('nombre', e.target.value)}
                placeholder='Presentación (ej. 750 ml)'
                disabled={isLoading || guardandoPres}
                className='h-10 bg-white dark:bg-slate-900'
              />
            </div>
            <div className='space-y-1'>
              <label
                htmlFor='edit-pres-codigo'
                className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'
              >
                Código de barras
              </label>
              <Input
                id='edit-pres-codigo'
                value={editPresDraft.codigo_barras}
                onChange={e => changeEditPresDraft('codigo_barras', e.target.value)}
                placeholder='Código de barras'
                disabled={isLoading || guardandoPres}
                className='h-10 bg-white dark:bg-slate-900 font-mono text-sm'
              />
            </div>
            <div className='space-y-1'>
              <label
                htmlFor='edit-pres-precio-compra'
                className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'
              >
                Precio compra
              </label>
              <Input
                id='edit-pres-precio-compra'
                value={editPresDraft.precio_compra}
                onChange={e => changeEditPresDraft('precio_compra', e.target.value)}
                placeholder='Precio compra'
                disabled={isLoading || guardandoPres}
                inputMode='numeric'
                className='h-10 bg-white dark:bg-slate-900'
              />
            </div>
            <div className='space-y-1'>
              <label
                htmlFor='edit-pres-precio-venta'
                className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'
              >
                Precio venta
              </label>
              <Input
                id='edit-pres-precio-venta'
                value={editPresDraft.precio_venta}
                onChange={e => changeEditPresDraft('precio_venta', e.target.value)}
                placeholder='Precio venta'
                disabled={isLoading || guardandoPres}
                inputMode='numeric'
                className='h-10 bg-white dark:bg-slate-900'
              />
            </div>
            <div className='space-y-1'>
              <label
                htmlFor='edit-pres-comision'
                className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'
              >
                Comisión
              </label>
              <Input
                id='edit-pres-comision'
                value={editPresDraft.comision}
                onChange={e => changeEditPresDraft('comision', e.target.value)}
                placeholder='Comisión (0 = sin comisión)'
                disabled={isLoading || guardandoPres}
                inputMode='numeric'
                className='h-10 bg-white dark:bg-slate-900'
              />
            </div>
            <div className='space-y-1'>
              <label
                htmlFor='edit-pres-ml-botella'
                className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'
              >
                Ml de la botella
              </label>
              <Input
                id='edit-pres-ml-botella'
                value={editPresDraft.ml_botella}
                onChange={e => changeEditPresDraft('ml_botella', e.target.value)}
                placeholder='Ej: 750 (vacío = el que dice el nombre)'
                disabled={isLoading || guardandoPres}
                inputMode='numeric'
                className='h-10 bg-white dark:bg-slate-900'
              />
            </div>
            <div className='space-y-1'>
              <label
                htmlFor='edit-pres-stock'
                className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'
              >
                Stock (actual: {p.stock ?? 0})
              </label>
              <Input
                id='edit-pres-stock'
                value={editPresDraft.stock}
                onChange={e => changeEditPresDraft('stock', e.target.value)}
                placeholder='Stock'
                disabled={isLoading || guardandoPres}
                inputMode='numeric'
                className='h-10 bg-white dark:bg-slate-900'
              />
            </div>
          </div>
          <p className='text-[11px] text-gray-400 ml-1'>
            Al subir se generan códigos nuevos. Al bajar, selecciona abajo los códigos a desactivar
            (no se eliminan).
          </p>
          <CodeDeactivationPicker
            presentacionId={p.id}
            currentStock={p.stock ?? 0}
            desiredStock={Number((editPresDraft.stock || '').replace(/\./g, ''))}
            unidadesCodigos={unidadesCodigos}
            codigosSeleccionados={codigosSeleccionados}
            onToggle={toggleCodigoSeleccionado}
          />
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
                  : defaultFoto && defaultFoto !== 'default.png'
                    ? defaultFoto.startsWith('http')
                      ? defaultFoto
                      : `/api/images/products/${defaultFoto}`
                    : '/api/images/products/default.png'
              }
              alt={p.nombre}
              className='w-11 h-11 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0'
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
                {p.ml_botella ? (
                  <>
                    <span className='mx-1'>•</span>
                    <span>{p.ml_botella} ml</span>
                  </>
                ) : null}
                {Number(p.ml_abierta ?? 0) > 0 ? (
                  <>
                    <span className='mx-1'>•</span>
                    <span className='text-amber-600 dark:text-amber-400 font-medium'>
                      Abierta: {Number(p.ml_abierta)} ml
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            <span className='px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0'>
              {p.stock ?? 0} un.
            </span>
            <label
              htmlFor={`pres-foto-${p.id}`}
              title='Cambiar foto'
              className='p-2 rounded-full text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors cursor-pointer shrink-0'
            >
              <input
                id={`pres-foto-${p.id}`}
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
              disabled={isLoading}
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
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder='URL de imagen'
                disabled={isLoading}
                className='h-9 pl-9 text-sm'
              />
            </div>
            <button
              type='button'
              onClick={() => {
                updateExistenteFotoUrl(p.id, urlInput || '');
                setUrlInput('');
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
  );
}
