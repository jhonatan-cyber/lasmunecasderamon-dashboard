'use client';
import { StockLimitsFields } from './StockLimitsFields';
import { Button } from '@/components/ui/button';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { productImageUrl } from '@/lib/utils/productImage';
import { Camera, Pencil, Trash2, Plus, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { CodeDeactivationPicker } from './CodeDeactivationPicker';
import { PresentacionNombreInput } from './PresentacionNombreInput';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils/utils';
import type { Presentacion } from '@/types/product';
import type { UnidadCodigoItem } from '@/hooks/products/useProductForm';
import { Label } from '@/components/ui/label';

interface EditPresDraft {
  nombre: string;
  codigo_barras: string;
  precio_compra: string;
  precio_venta: string;
  comision: string;
  stock: string;
  stock_minimo: string;
  stock_maximo: string;
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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isEditing]);

  const fotoSrc = productImageUrl(p.foto, defaultFoto);

  return (
    <div className='relative p-2.5 pl-4 rounded-2xl bg-gray-100 dark:bg-slate-800 space-y-2'>
      {isEditing ? (
        <div className='space-y-2'>
          <Button
            variant='unstyled'
            type='button'
            title='Contraer'
            onClick={cancelEditPres}
            className='absolute top-2 right-2 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors z-10'
          >
            <ChevronDown className='w-4 h-4 rotate-180' />
          </Button>
          <div className='flex flex-col gap-3 rounded-xl border p-3'>
            <div className='flex items-center gap-3'>
              {/* eslint-disable-next-line @next/next/no-img-element -- Vista previa de la foto existente. */}
              <img
                src={fotoSrc}
                alt={`Imagen de ${p.nombre}`}
                className='size-20 shrink-0 rounded-xl object-contain'
              />
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <Label htmlFor={`edit-pres-foto-${p.id}`} className='text-xs font-semibold'>
                  Imagen de la presentación
                </Label>
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
                <Label htmlFor={`edit-pres-foto-url-${p.id}`} className='text-xs font-semibold'>
                  URL de imagen
                </Label>
                <Input
                  id={`edit-pres-foto-url-${p.id}`}
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder='https://...'
                  disabled={isLoading || guardandoPres}
                />
              </div>
              <Button
                variant='unstyled'
                type='button'
                disabled={isLoading || guardandoPres || !urlInput.trim()}
                onClick={() => {
                  updateExistenteFotoUrl(p.id, urlInput);
                  setUrlInput('');
                }}
                className='shrink-0 rounded-full border px-3 py-2 text-xs font-semibold disabled:opacity-50'
              >
                Aplicar URL
              </Button>
            </div>
            <p className='text-xs text-muted-foreground'>
              JPG, PNG, GIF o WEBP, hasta 5 MB. La imagen se guarda al seleccionar el archivo o
              aplicar la URL.
            </p>
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <Label
                htmlFor='edit-pres-nombre'
                className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'
              >
                Presentación
              </Label>
              <PresentacionNombreInput
                id='edit-pres-nombre'
                value={editPresDraft.nombre}
                onChange={value => changeEditPresDraft('nombre', value)}
                disabled={isLoading || guardandoPres}
              />
            </div>
            <div className='space-y-1'>
              <Label
                htmlFor='edit-pres-codigo'
                className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'
              >
                Código de barras
              </Label>
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
              <Label
                htmlFor='edit-pres-precio-compra'
                className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'
              >
                Precio compra
              </Label>
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
              <Label
                htmlFor='edit-pres-stock'
                className='block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1'
              >
                Stock (actual: {p.stock ?? 0})
              </Label>
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
            <StockLimitsFields
              editing
              id={`edit-${p.id}`}
              minimo={editPresDraft.stock_minimo}
              maximo={editPresDraft.stock_maximo}
              total={Number(p.stock || 0) + Number(p.stock_bar || 0)}
              disabled={isLoading || guardandoPres}
              onChange={changeEditPresDraft}
            />
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
            <Button
              variant='unstyled'
              type='button'
              onClick={cancelEditPres}
              disabled={guardandoPres}
              className='px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 dark:border-slate-600 disabled:opacity-50'
            >
              Cancelar
            </Button>
            <Button
              variant='unstyled'
              type='button'
              onClick={saveEditPres}
              disabled={guardandoPres}
              className='px-3 py-1.5 text-xs font-semibold rounded-full bg-black text-white dark:bg-white dark:text-black disabled:opacity-50'
            >
              {guardandoPres ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      ) : (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Header row — always visible, acts as the trigger */}
          <div className='flex items-center gap-2 w-full'>
            <CollapsibleTrigger className='flex flex-1 items-center gap-2 min-w-0 cursor-pointer'>
              {/* eslint-disable-next-line @next/next/no-img-element -- preview local/blob o ruta interna */}
              <img
                src={fotoSrc}
                alt={p.nombre}
                className='w-9 h-9 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0'
              />
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-semibold truncate'>{p.nombre}</p>
                <p className='text-xs text-gray-500'>
                  {formatCurrencyCLP(p.precio_venta ?? 0)} · {p.stock ?? 0} un.
                </p>
              </div>
            </CollapsibleTrigger>
            {/* Action buttons — fuera del trigger para evitar button anidado */}
            <Label
              htmlFor={`pres-foto-${p.id}`}
              title='Cambiar foto'
              className='p-2 rounded-full text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors cursor-pointer shrink-0'
              onClick={e => e.stopPropagation()}
            >
              <Input
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
            </Label>
            <Button
              variant='unstyled'
              type='button'
              onClick={e => {
                e.stopPropagation();
                startEditPres(p);
              }}
              disabled={isLoading}
              title='Editar presentación'
              className='p-2 rounded-full text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50 shrink-0'
            >
              <Pencil className='w-4 h-4' />
            </Button>
            <Button
              variant='unstyled'
              type='button'
              onClick={e => {
                e.stopPropagation();
                deleteExistente(p.id);
              }}
              disabled={isLoading}
              title='Eliminar presentación'
              className='p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 shrink-0'
            >
              <Trash2 className='w-4 h-4' />
            </Button>
            {/* Botón contraer/expandir — siempre visible en el header */}
            <CollapsibleTrigger asChild>
              <Button
                variant='unstyled'
                type='button'
                title={isOpen ? 'Contraer' : 'Expandir'}
                className='p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shrink-0'
              >
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className='relative space-y-2 pt-2'>
              <CollapsibleTrigger asChild>
                <Button
                  variant='unstyled'
                  type='button'
                  title='Contraer'
                  className='absolute top-0 right-0 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shrink-0 z-10'
                >
                  <ChevronDown className={cn('w-4 h-4 rotate-180')} />
                </Button>
              </CollapsibleTrigger>
              <div className='flex items-center gap-2 pl-6'>
                <Input
                  value={stockExtra[p.id] || ''}
                  onChange={e => changeStockExtra(p.id, e.target.value)}
                  placeholder='Cantidad a agregar'
                  disabled={isLoading || agregandoStock}
                  inputMode='numeric'
                  className='h-9 text-sm'
                />
                <Button
                  variant='unstyled'
                  type='button'
                  onClick={() => agregarStock(p.id)}
                  disabled={isLoading || agregandoStock}
                  title='Generar códigos para esta presentación'
                  className='flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-full bg-blue-600 text-white hover:scale-105 transition-all disabled:opacity-50 shrink-0'
                >
                  <Plus className='w-3.5 h-3.5' />
                  Stock
                </Button>
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
                <Button
                  variant='unstyled'
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
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
