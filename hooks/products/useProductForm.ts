'use client';

import { useState, useEffect, useRef } from 'react';
import { Product, Presentacion } from '@/types/product';

import { generateRandomCode } from '@/lib/utils/codeUtils';
import { vencimientoCalculado } from '@/lib/business/vencimiento';
import logger from '@/lib/utils/logger';
import { getNumericValue, initialFormState } from './productFormFormat';
import type { ProductFormValues } from './productFormTypes';
import { validatePresentaciones, validateProductForm } from './productFormValidation';
import { useProductPresentations } from './useProductPresentations';
import { useProductInventory } from './useProductInventory';
import { usePresentationEditor } from './usePresentationEditor';

export type { PresentacionFormItem, ProductFormValues, UnidadCodigoItem } from './productFormTypes';

interface UseProductFormProps {
  open: boolean;
  initialValues?: Product | null;
  categoryId: string | number;
  onSubmit: (form: FormData) => void;
  autoEditPresentation?: Presentacion | null;
}

export function useProductForm({
  open,
  initialValues,
  categoryId,
  onSubmit,
  autoEditPresentation = null
}: UseProductFormProps) {
  const [form, setForm] = useState<ProductFormValues>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const activeProductIdRef = useRef<string | null>(null);
  const addingStockRef = useRef(false);
  const savingPresentationRef = useRef(false);
  const isEdit = Boolean(initialValues?.id);
  const productId = initialValues?.id != null ? String(initialValues.id) : null;
  const presentacionesState = useProductPresentations();
  const inventory = useProductInventory({
    productId,
    activeProductIdRef,
    addingStockRef,
    savingPresentationRef
  });
  const editor = usePresentationEditor({
    productId,
    activeProductIdRef,
    existentes: inventory.existentes,
    addStock: inventory.agregarStockCantidad,
    refreshInventario: inventory.refreshInventario,
    addingStockRef,
    savingPresentationRef
  });

  const { presentaciones, presentacionesError } = presentacionesState;
  const { fetchInventario, resetInventario, abortarInventario } = inventory;
  const { resetPresentaciones } = presentacionesState;
  const { startEditPres, cancelEditPres } = editor;

  useEffect(() => {
    activeProductIdRef.current = open && initialValues?.id ? String(initialValues.id) : null;
    resetInventario();

    if (open && initialValues) {
      setForm({
        code: initialValues.code || '',
        name: initialValues.name || '',
        description: initialValues.description || '',
        ml_shot:
          initialValues.ml_shot !== undefined && initialValues.ml_shot !== null
            ? String(initialValues.ml_shot)
            : '',
        ml_shot_anfitriona:
          initialValues.ml_shot_anfitriona !== undefined &&
          initialValues.ml_shot_anfitriona !== null
            ? String(initialValues.ml_shot_anfitriona)
            : '',
        // Las fechas de la base llegan como `YYYY-MM-DD`; recortamos por si
        // vienen con hora para que el input date las acepte.
        fecha_elaboracion: initialValues.fecha_elaboracion
          ? String(initialValues.fecha_elaboracion).slice(0, 10)
          : '',
        duracion_meses:
          initialValues.duracion_meses !== undefined && initialValues.duracion_meses !== null
            ? String(initialValues.duracion_meses)
            : '',
        fecha_vencimiento: initialValues.fecha_vencimiento
          ? String(initialValues.fecha_vencimiento).slice(0, 10)
          : ''
      });
    } else if (open) {
      setForm({ ...initialFormState, code: generateRandomCode() });
    }

    setErrors({});
    resetPresentaciones();

    if (autoEditPresentation?.id) {
      startEditPres(autoEditPresentation);
    } else {
      cancelEditPres();
    }

    if (open && initialValues?.id) {
      fetchInventario(String(initialValues.id));
    }

    return () => {
      activeProductIdRef.current = null;
      abortarInventario();
    };
  }, [
    open,
    initialValues,
    autoEditPresentation,
    fetchInventario,
    resetInventario,
    resetPresentaciones,
    startEditPres,
    cancelEditPres,
    abortarInventario
  ]);

  const validate = () => {
    const newErrors = validateProductForm(form);
    setErrors(newErrors);

    const presError = validatePresentaciones(presentaciones, {
      isEdit,
      existentes: inventory.existentes
    });
    presentacionesState.setPresentacionesError(presError);
    return Object.keys(newErrors).length === 0 && !presError;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const target = e.target;
    const name = target?.name;
    const value = target?.value;

    if (name === 'name') {
      setForm(prev => ({
        ...prev,
        name: value
          .split(' ')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
      }));
    } else if (name === 'description') {
      setForm(prev => ({
        ...prev,
        description: value ? value.charAt(0).toUpperCase() + value.slice(1) : value
      }));
    } else if (name === 'ml_shot' || name === 'ml_shot_anfitriona') {
      setForm(prev => ({ ...prev, [name]: String(value).replace(/\D/g, '') }));
    } else if (name === 'duracion_meses') {
      // La duración va en meses enteros y recalcula el vencimiento.
      const duracion = String(value).replace(/\D/g, '');
      setForm(prev => {
        const siguiente = { ...prev, duracion_meses: duracion };
        return {
          ...siguiente,
          fecha_vencimiento:
            vencimientoCalculado(siguiente.fecha_elaboracion, duracion) ??
            siguiente.fecha_vencimiento
        };
      });
    } else if (name === 'fecha_elaboracion') {
      setForm(prev => {
        const siguiente = { ...prev, fecha_elaboracion: String(value) };
        return {
          ...siguiente,
          fecha_vencimiento:
            vencimientoCalculado(String(value), siguiente.duracion_meses) ??
            siguiente.fecha_vencimiento
        };
      });
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    const data = new FormData();
    data.append('code', form.code);
    data.append('name', form.name);

    const finalCategoryId = initialValues?.category_id ?? categoryId;

    if (
      finalCategoryId !== undefined &&
      finalCategoryId !== null &&
      String(finalCategoryId) !== 'NaN'
    ) {
      data.append('category_id', String(finalCategoryId));
    } else {
      logger.warn('[useProductForm] Intento de submit sin category_id válido:', {
        initialCategoryId: initialValues?.category_id,
        propCategoryId: categoryId
      });
    }

    data.append('description', form.description);
    data.append('status', '1');
    data.append('ml_shot', form.ml_shot);
    data.append('ml_shot_anfitriona', form.ml_shot_anfitriona);
    data.append('fecha_elaboracion', form.fecha_elaboracion);
    data.append('duracion_meses', form.duracion_meses);
    data.append('fecha_vencimiento', form.fecha_vencimiento);
    if (presentaciones.length > 0) {
      data.append(
        'presentaciones',
        JSON.stringify(
          presentaciones.map(p => ({
            nombre: p.nombre.trim(),
            codigo_barras: p.codigo_barras.trim() || undefined,
            precio_compra: getNumericValue(p.precio_compra) || '0',
            stock_minimo: getNumericValue(p.stock_minimo || '') || null,
            stock_maximo: getNumericValue(p.stock_maximo || '') || null,
            cantidad: getNumericValue(p.stock) || '0'
          }))
        )
      );
      presentaciones.forEach((p, i) => {
        if (p.foto) data.append(`presentacion_foto_${i}`, p.foto);
        else data.append(`presentacion_foto_${i}`, '');
        data.append(`presentacion_fotourl_${i}`, p.fotoUrl.trim());
      });
    }
    if (initialValues?.id) data.append('id', String(initialValues.id));
    onSubmit(data);
  };

  return {
    form,
    errors,
    handleChange,
    handleSubmit,
    presentaciones,
    presentacionesError,
    addPresentacion: presentacionesState.addPresentacion,
    removePresentacion: presentacionesState.removePresentacion,
    updatePresentacion: presentacionesState.updatePresentacion,
    setPresentacionFoto: presentacionesState.setPresentacionFoto,
    setPresentacionFotoUrl: presentacionesState.setPresentacionFotoUrl,
    updateExistenteFoto: inventory.updateExistenteFoto,
    updateExistenteFotoUrl: inventory.updateExistenteFotoUrl,
    existentes: inventory.existentes,
    unidadesTotal: inventory.unidadesTotal,
    unidadesCodigos: inventory.unidadesCodigos,
    cargandoInventario: inventory.cargandoInventario,
    deleteExistente: inventory.deleteExistente,
    editingPresId: editor.editingPresId,
    editPresDraft: editor.editPresDraft,
    guardandoPres: editor.guardandoPres,
    startEditPres,
    cancelEditPres,
    changeEditPresDraft: editor.changeEditPresDraft,
    saveEditPres: editor.saveEditPres,
    codigosSeleccionados: editor.codigosSeleccionados,
    toggleCodigoSeleccionado: editor.toggleCodigoSeleccionado,
    unidadesInactivas: inventory.unidadesInactivas,
    stockExtra: inventory.stockExtra,
    changeStockExtra: inventory.changeStockExtra,
    agregarStock: inventory.agregarStock,
    agregandoStock: inventory.agregandoStock,
    isEdit,
    refreshInventario: inventory.refreshInventario
  };
}
